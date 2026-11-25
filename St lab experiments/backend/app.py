import base64
import math
import os
import uuid
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, request, g, send_from_directory, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import Config, PROJECT_ROOT
from database import db_session
from auth import (
    admin_required,
    create_token,
    generate_reset_code,
    hash_password,
    serialize_user,
    token_required,
    utc_now_iso,
    validate_password,
    validate_registration,
    verify_password,
)
from ai_model import (
    CATEGORY_DETAILS,
    classify_image_server,
    get_server_model_status,
    get_taxonomy_payload,
)
from assistant import answer_recycling_question
from reports import generate_excel_report, generate_pdf_report
from seed import ensure_seed_data, load_clearly_labelled_demo_dataset

FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.config.from_object(Config)
CORS(app)

ensure_seed_data()


def _compute_bin_status(current_items: int, capacity_items: int):
    pct = round(min(100.0, (current_items / max(1, capacity_items)) * 100.0), 1)
    if pct >= 85.0:
        status = "Full"
    elif pct >= 40.0:
        status = "Half Full"
    else:
        status = "Empty"
    return pct, status


def _save_image_from_request():
    """Save uploaded multipart file or base64 dataURL from webcam, returning (filename, bytes)."""
    if "image" in request.files and request.files["image"].filename:
        f = request.files["image"]
        raw_bytes = f.read()
        ext = os.path.splitext(secure_filename(f.filename))[1].lower() or ".jpg"
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            ext = ".jpg"
        fname = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(Config.UPLOAD_DIR, fname), "wb") as out:
            out.write(raw_bytes)
        return fname, raw_bytes

    data_url = request.form.get("image_data") or (request.get_json(silent=True) or {}).get("image_data")
    if data_url and "," in data_url:
        header, b64 = data_url.split(",", 1)
        ext = ".png" if "png" in header else ".jpg"
        raw_bytes = base64.b64decode(b64)
        fname = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(Config.UPLOAD_DIR, fname), "wb") as out:
            out.write(raw_bytes)
        return fname, raw_bytes

    return "", b""


def _build_time_series(records: list, timeframe: str):
    now = datetime.now(timezone.utc)
    buckets = []
    if timeframe == "monthly":
        # Last 6 months
        for i in range(5, -1, -1):
            month_dt = (now.replace(day=1) - timedelta(days=28 * i))
            key = month_dt.strftime("%Y-%m")
            label = month_dt.strftime("%b %Y")
            buckets.append({"key": key, "label": label, "wet": 0, "dry": 0, "metal": 0, "total": 0})
        bucket_map = {b["key"]: b for b in buckets}
        for r in records:
            k = r["created_at"][:7]
            if k in bucket_map:
                _inc_bucket(bucket_map[k], r["predicted_category"])
    elif timeframe == "weekly":
        # Last 4 weeks
        for i in range(3, -1, -1):
            start = (now - timedelta(days=7 * i + 6)).date()
            end = (now - timedelta(days=7 * i)).date()
            buckets.append({
                "key": f"w{i}",
                "start": start,
                "end": end,
                "label": f"{start.strftime('%b %d')} - {end.strftime('%b %d')}",
                "wet": 0,
                "dry": 0,
                "metal": 0,
                "total": 0,
            })
        for r in records:
            d = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00")).date()
            for b in buckets:
                if b["start"] <= d <= b["end"]:
                    _inc_bucket(b, r["predicted_category"])
                    break
        for b in buckets:
            b.pop("start", None)
            b.pop("end", None)
    else:
        # Daily: last 7 days
        for i in range(6, -1, -1):
            d = (now - timedelta(days=i)).date()
            buckets.append({
                "key": d.isoformat(),
                "label": d.strftime("%a %d"),
                "wet": 0,
                "dry": 0,
                "metal": 0,
                "total": 0,
            })
        bucket_map = {b["key"]: b for b in buckets}
        for r in records:
            k = r["created_at"][:10]
            if k in bucket_map:
                _inc_bucket(bucket_map[k], r["predicted_category"])
    return buckets


def _inc_bucket(bucket: dict, category: str):
    bucket["total"] += 1
    if category == "Wet Waste":
        bucket["wet"] += 1
    elif category == "Dry Waste":
        bucket["dry"] += 1
    elif category == "Metal Waste":
        bucket["metal"] += 1


def _compute_stats(records: list, points: int = 0):
    wet = sum(1 for r in records if r["predicted_category"] == "Wet Waste")
    dry = sum(1 for r in records if r["predicted_category"] == "Dry Waste")
    metal = sum(1 for r in records if r["predicted_category"] == "Metal Waste")
    total = len(records)
    weight_kg = round(sum(float(r["estimated_weight_kg"]) for r in records), 2)
    co2_kg = round(sum(float(r["co2_saved_kg"]) for r in records), 2)
    # Environmental impact score (0-100 scale based on items, variety, and CO2 avoided)
    variety_bonus = sum(1 for c in (wet, dry, metal) if c > 0) * 8
    impact_score = min(100, round(total * 4.5 + co2_kg * 6 + variety_bonus))
    return {
        "total_items": total,
        "wet_count": wet,
        "dry_count": dry,
        "metal_count": metal,
        "total_recyclable": dry + metal + wet,
        "total_weight_kg": weight_kg,
        "total_co2_kg": co2_kg,
        "environmental_impact_score": impact_score,
        "points": points,
    }


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "EcoSort AI Smart Waste Segregation API",
        "ai": get_server_model_status(),
    })


# -------------------- AUTHENTICATION --------------------

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    err = validate_registration(data)
    if err:
        return jsonify({"error": err}), 400

    name = data["name"].strip()
    email = data["email"].strip().lower()
    phone = data["phone"].strip()
    address = (data.get("address") or "").strip()
    password = data["password"]
    now = utc_now_iso()

    with db_session() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({"error": "An account with this email already exists."}), 409

        conn.execute(
            """
            INSERT INTO users (name, email, phone, password_hash, role, address, points, is_active, created_at)
            VALUES (?, ?, ?, ?, 'user', ?, 0, 1, ?)
            """,
            (name, email, phone, hash_password(password), address, now),
        )
        user_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute(
            """
            INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
            VALUES (?, 'user', 'welcome', 'Account Created', 'Welcome to EcoSort AI! Upload or capture a waste item to begin smart segregation.', 0, ?)
            """,
            (user_id, now),
        )
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    token = create_token(user)
    return jsonify({"token": token, "user": serialize_user(user)}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    portal_role = (data.get("portal_role") or "user").strip().lower()

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    with db_session() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not user or not verify_password(user["password_hash"], password):
            return jsonify({"error": "Invalid email or password."}), 401
        if not user["is_active"]:
            return jsonify({"error": "This account is deactivated. Please contact the administrator."}), 403
        if portal_role == "admin" and user["role"] != "admin":
            return jsonify({"error": "Access denied: This account does not have Administrator privileges."}), 403
        if portal_role == "user" and user["role"] == "admin":
            return jsonify({"error": "Please switch to the Admin Login tab to sign in as an Administrator."}), 403

    token = create_token(user)
    return jsonify({"token": token, "user": serialize_user(user)})


@app.route("/api/auth/logout", methods=["POST"])
@token_required
def logout():
    with db_session() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO revoked_tokens (token, revoked_at) VALUES (?, ?)",
            (g.current_token, utc_now_iso()),
        )
    return jsonify({"message": "Logged out successfully."})


@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Please provide your registered email address."}), 400

    with db_session() as conn:
        user = conn.execute("SELECT id, name, email FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            return jsonify({"error": "No account found with that email address."}), 404

        code = generate_reset_code()
        expires = (datetime.now(timezone.utc) + timedelta(minutes=20)).isoformat()
        conn.execute(
            "INSERT INTO password_resets (user_id, reset_code, expires_at, used) VALUES (?, ?, ?, 0)",
            (user["id"], code, expires),
        )

    # In local deployment without an SMTP server, return a demo verification code notice cleanly.
    return jsonify({
        "message": "A 6-digit password reset code has been generated and expires in 20 minutes.",
        "reset_code_preview": code,
    })


@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("reset_code") or "").strip()
    new_password = data.get("new_password") or ""

    pw_err = validate_password(new_password)
    if pw_err:
        return jsonify({"error": pw_err}), 400

    with db_session() as conn:
        user = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if not user:
            return jsonify({"error": "Invalid email or reset code."}), 400

        reset_row = conn.execute(
            """
            SELECT * FROM password_resets
            WHERE user_id = ? AND reset_code = ? AND used = 0
            ORDER BY id DESC LIMIT 1
            """,
            (user["id"], code),
        ).fetchone()
        if not reset_row:
            return jsonify({"error": "Invalid or already used reset code."}), 400

        if datetime.fromisoformat(reset_row["expires_at"]) < datetime.now(timezone.utc):
            return jsonify({"error": "Reset code has expired. Please request a new one."}), 400

        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_password), user["id"]),
        )
        conn.execute("UPDATE password_resets SET used = 1 WHERE id = ?", (reset_row["id"],))

    return jsonify({"message": "Password reset successfully. You can now log in."})


@app.route("/api/auth/me", methods=["GET"])
@token_required
def get_me():
    return jsonify({"user": serialize_user(g.current_user)})


@app.route("/api/auth/profile", methods=["PUT"])
@token_required
def update_profile():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()

    if len(name) < 2:
        return jsonify({"error": "Name must be at least 2 characters."}), 400
    if len(phone) < 7:
        return jsonify({"error": "Please enter a valid phone number."}), 400

    with db_session() as conn:
        conn.execute(
            "UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?",
            (name, phone, address, g.current_user["id"]),
        )
        user = conn.execute("SELECT * FROM users WHERE id = ?", (g.current_user["id"],)).fetchone()
    return jsonify({"user": serialize_user(user), "message": "Profile updated successfully."})


@app.route("/api/auth/change-password", methods=["PUT"])
@token_required
def change_password():
    data = request.get_json(silent=True) or {}
    current_pw = data.get("current_password") or ""
    new_pw = data.get("new_password") or ""

    if not verify_password(g.current_user["password_hash"], current_pw):
        return jsonify({"error": "Current password is incorrect."}), 400
    pw_err = validate_password(new_pw)
    if pw_err:
        return jsonify({"error": pw_err}), 400

    with db_session() as conn:
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(new_pw), g.current_user["id"]),
        )
    return jsonify({"message": "Password updated successfully."})


# -------------------- AI DETECTION & SMART SEGREGATION --------------------

@app.route("/api/ai/status", methods=["GET"])
def ai_status():
    return jsonify({
        "status": get_server_model_status(),
        "taxonomy": get_taxonomy_payload(),
    })


@app.route("/api/ai/classify", methods=["POST"])
@token_required
def classify_and_sort():
    fname, img_bytes = _save_image_from_request()
    form = request.form if request.form else (request.get_json(silent=True) or {})

    client_category = (form.get("predicted_category") or "").strip()
    client_label = (form.get("detected_label") or "").strip()
    client_conf_raw = form.get("confidence")
    is_demo = str(form.get("is_demo", "false")).lower() in ("1", "true", "yes")
    model_source = (form.get("model_source") or "MobileNetV2 (Browser TF.js)").strip()

    # Priority 1: Server-side TensorFlow MobileNetV2 if installed and image bytes provided
    result_payload = None
    if img_bytes and not is_demo:
        server_res = classify_image_server(img_bytes)
        if server_res.get("available"):
            result_payload = server_res

    # Priority 2: Validated client-side TensorFlow.js MobileNetV2 inference OR explicit Demo Mode
    if result_payload is None:
        if client_category not in CATEGORY_DETAILS or not client_label or client_conf_raw is None:
            return jsonify({
                "error": "AI model could not classify the image. Ensure TensorFlow/MobileNetV2 is loaded or select a clearly labelled Demo Mode sample.",
                "model_available": False,
            }), 422
        try:
            confidence = round(float(client_conf_raw), 2)
        except ValueError:
            confidence = 0.0

        info = CATEGORY_DETAILS[client_category]
        result_payload = {
            "predicted_category": client_category,
            "detected_label": client_label,
            "confidence": confidence,
            "model_source": "Demo Mode (Model Unavailable)" if is_demo else model_source,
            **info,
        }

    cat = result_payload["predicted_category"]
    now = utc_now_iso()
    image_url = f"/uploads/{fname}" if fname else ""

    with db_session() as conn:
        bin_row = conn.execute("SELECT * FROM bins WHERE category = ?", (cat,)).fetchone()
        new_count = min(bin_row["current_items"] + 1, bin_row["capacity_items"])
        fill_pct, bin_status = _compute_bin_status(new_count, bin_row["capacity_items"])
        sorting_status = "Sorted (Demo)" if is_demo else "Sorted"

        conn.execute(
            """
            INSERT INTO waste_records (
                user_id, image_path, image_name, predicted_category, detected_label,
                confidence, is_demo, model_source, disposal_instructions, bin_id,
                sorting_status, points_earned, estimated_weight_kg, co2_saved_kg, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                g.current_user["id"],
                image_url,
                fname or "camera-capture.jpg",
                cat,
                result_payload["detected_label"],
                result_payload["confidence"],
                1 if is_demo else 0,
                result_payload["model_source"],
                result_payload["disposal_instructions"],
                bin_row["id"],
                sorting_status,
                result_payload["points"],
                result_payload["estimated_weight_kg"],
                result_payload["co2_saved_kg"],
                now,
            ),
        )
        record_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        conn.execute(
            "UPDATE bins SET current_items = ?, fill_percentage = ?, status = ?, updated_at = ? WHERE id = ?",
            (new_count, fill_pct, bin_status, now, bin_row["id"]),
        )

        sort_msg = f"Assigned '{result_payload['detected_label']}' to {bin_row['label']} ({fill_pct}% - {bin_status})."
        conn.execute(
            """
            INSERT INTO bin_logs (bin_id, user_id, record_id, action, fill_percentage, status, message, created_at)
            VALUES (?, ?, ?, 'SORT', ?, ?, ?, ?)
            """,
            (bin_row["id"], g.current_user["id"], record_id, fill_pct, bin_status, sort_msg, now),
        )

        conn.execute(
            "UPDATE users SET points = points + ? WHERE id = ?",
            (result_payload["points"], g.current_user["id"]),
        )

        # User reward notification
        conn.execute(
            """
            INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
            VALUES (?, 'user', 'reward', ?, ?, 0, ?)
            """,
            (
                g.current_user["id"],
                f"+{result_payload['points']} Eco Points Earned",
                f"Sorted {cat} ({result_payload['detected_label']}) into {bin_row['label']}.",
                now,
            ),
        )

        # Smart Bin Fullness Alert when bin reaches Full (>= 85%)
        bin_alert = None
        if bin_status == "Full":
            bin_alert = f"Alert: {bin_row['label']} is now {fill_pct}% FULL. Collection is recommended immediately."
            conn.execute(
                """
                INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
                VALUES (NULL, 'all', 'bin_alert', ?, ?, 0, ?)
                """,
                (f"{bin_row['label']} Full", bin_alert, now),
            )

        updated_bins = [dict(r) for r in conn.execute("SELECT * FROM bins ORDER BY id").fetchall()]
        updated_user = conn.execute("SELECT * FROM users WHERE id = ?", (g.current_user["id"],)).fetchone()
        created_record = dict(conn.execute("SELECT * FROM waste_records WHERE id = ?", (record_id,)).fetchone())

    return jsonify({
        "classification": result_payload,
        "record": created_record,
        "bins": updated_bins,
        "user": serialize_user(updated_user),
        "sorting_confirmation": f"Successfully sorted into {bin_row['label']}! Bin fill is now {fill_pct}% ({bin_status}).",
        "bin_alert": bin_alert,
    }), 201


@app.route("/api/bins", methods=["GET"])
@token_required
def get_bins():
    with db_session() as conn:
        bins = [dict(r) for r in conn.execute("SELECT * FROM bins ORDER BY id").fetchall()]
        logs = [
            dict(r)
            for r in conn.execute(
                """
                SELECT bl.*, b.category, b.label AS bin_label, u.name AS user_name
                FROM bin_logs bl
                JOIN bins b ON bl.bin_id = b.id
                LEFT JOIN users u ON bl.user_id = u.id
                ORDER BY bl.id DESC LIMIT 20
                """
            ).fetchall()
        ]
    alerts = [
        f"{b['label']} is {b['fill_percentage']}% Full — schedule or dispatch waste collection."
        for b in bins
        if b["status"] == "Full"
    ]
    return jsonify({"bins": bins, "logs": logs, "alerts": alerts})


@app.route("/api/bins/<int:bin_id>/empty", methods=["POST"])
@admin_required
def empty_bin(bin_id: int):
    now = utc_now_iso()
    with db_session() as conn:
        b = conn.execute("SELECT * FROM bins WHERE id = ?", (bin_id,)).fetchone()
        if not b:
            return jsonify({"error": "Bin not found."}), 404
        conn.execute(
            """
            UPDATE bins SET current_items = 0, fill_percentage = 0.0, status = 'Empty',
            last_emptied_at = ?, updated_at = ? WHERE id = ?
            """,
            (now, now, bin_id),
        )
        conn.execute(
            """
            INSERT INTO bin_logs (bin_id, user_id, record_id, action, fill_percentage, status, message, created_at)
            VALUES (?, ?, NULL, 'EMPTY', 0.0, 'Empty', ?, ?)
            """,
            (bin_id, g.current_user["id"], f"{b['label']} emptied & sanitized by Admin.", now),
        )
        conn.execute(
            """
            INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
            VALUES (NULL, 'all', 'bin_emptied', ?, ?, 0, ?)
            """,
            (f"{b['label']} Emptied", f"{b['label']} has been cleared and is ready for new waste sorting.", now),
        )
        bins = [dict(r) for r in conn.execute("SELECT * FROM bins ORDER BY id").fetchall()]
    return jsonify({"message": f"{b['label']} emptied successfully.", "bins": bins})


@app.route("/api/demo/load-samples", methods=["POST"])
@token_required
def load_demo_samples():
    added_points = load_clearly_labelled_demo_dataset(g.current_user["id"])
    with db_session() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (g.current_user["id"],)).fetchone()
    return jsonify({
        "message": f"Loaded 5 clearly labelled Demo Mode sample items (+{added_points} points).",
        "user": serialize_user(user),
    })


# -------------------- DASHBOARDS, HISTORY, REWARDS --------------------

@app.route("/api/dashboard/user", methods=["GET"])
@token_required
def user_dashboard():
    timeframe = request.args.get("timeframe", "daily").lower()
    if timeframe not in ("daily", "weekly", "monthly"):
        timeframe = "daily"

    uid = g.current_user["id"]
    with db_session() as conn:
        records = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM waste_records WHERE user_id = ? ORDER BY created_at DESC",
                (uid,),
            ).fetchall()
        ]
        user = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        bins = [dict(r) for r in conn.execute("SELECT * FROM bins ORDER BY id").fetchall()]
        notifs = [
            dict(r)
            for r in conn.execute(
                """
                SELECT * FROM notifications
                WHERE user_id = ? OR target_role = 'all'
                ORDER BY id DESC LIMIT 12
                """,
                (uid,),
            ).fetchall()
        ]

    stats = _compute_stats(records, points=int(user["points"] or 0))
    series = _build_time_series(records, timeframe)
    return jsonify({
        "user": serialize_user(user),
        "stats": stats,
        "timeframe": timeframe,
        "time_series": series,
        "recent_history": records[:8],
        "bins": bins,
        "notifications": notifs,
    })


@app.route("/api/waste/history", methods=["GET"])
@token_required
def waste_history():
    category = (request.args.get("category") or "").strip()
    start_date = (request.args.get("start_date") or "").strip()
    end_date = (request.args.get("end_date") or "").strip()
    scope = request.args.get("scope", "self")

    query = """
        SELECT wr.*, u.name AS user_name, u.email AS user_email
        FROM waste_records wr
        JOIN users u ON wr.user_id = u.id
        WHERE 1=1
    """
    params = []

    if not (scope == "all" and g.current_user["role"] == "admin"):
        query += " AND wr.user_id = ?"
        params.append(g.current_user["id"])

    if category and category != "All":
        query += " AND wr.predicted_category = ?"
        params.append(category)
    if start_date:
        query += " AND substr(wr.created_at, 1, 10) >= ?"
        params.append(start_date)
    if end_date:
        query += " AND substr(wr.created_at, 1, 10) <= ?"
        params.append(end_date)

    query += " ORDER BY wr.id DESC"

    with db_session() as conn:
        rows = [dict(r) for r in conn.execute(query, tuple(params)).fetchall()]

    return jsonify({"records": rows, "count": len(rows)})


@app.route("/api/rewards/leaderboard", methods=["GET"])
@token_required
def rewards_leaderboard():
    with db_session() as conn:
        users = conn.execute(
            """
            SELECT u.id, u.name, u.points, u.role,
                   COUNT(wr.id) AS total_items,
                   COALESCE(SUM(wr.co2_saved_kg), 0) AS co2_saved_kg
            FROM users u
            LEFT JOIN waste_records wr ON wr.user_id = u.id
            WHERE u.role = 'user' AND u.is_active = 1
            GROUP BY u.id
            ORDER BY u.points DESC, total_items DESC
            LIMIT 20
            """
        ).fetchall()

    board = []
    for idx, u in enumerate(users, start=1):
        su = serialize_user({**dict(u), "email": "", "phone": "", "address": "", "is_active": 1, "created_at": ""})
        board.append({
            "rank": idx,
            "id": u["id"],
            "name": u["name"],
            "points": int(u["points"] or 0),
            "tier": su["tier"],
            "total_items": u["total_items"],
            "co2_saved_kg": round(float(u["co2_saved_kg"] or 0), 2),
        })
    return jsonify({"leaderboard": board})


# -------------------- NOTIFICATIONS, PICKUPS, LOCATOR, ASSISTANT --------------------

@app.route("/api/notifications", methods=["GET"])
@token_required
def get_notifications():
    uid = g.current_user["id"]
    role = g.current_user["role"]
    with db_session() as conn:
        rows = [
            dict(r)
            for r in conn.execute(
                """
                SELECT * FROM notifications
                WHERE user_id = ? OR target_role = 'all' OR target_role = ?
                ORDER BY id DESC LIMIT 30
                """,
                (uid, role),
            ).fetchall()
        ]
    unread = sum(1 for r in rows if not r["is_read"])
    return jsonify({"notifications": rows, "unread_count": unread})


@app.route("/api/notifications/read", methods=["POST"])
@token_required
def mark_notifications_read():
    uid = g.current_user["id"]
    role = g.current_user["role"]
    with db_session() as conn:
        conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = ? OR target_role = 'all' OR target_role = ?",
            (uid, role),
        )
    return jsonify({"message": "Notifications marked as read."})


@app.route("/api/pickups", methods=["GET"])
@token_required
def list_pickups():
    with db_session() as conn:
        if g.current_user["role"] == "admin":
            rows = [
                dict(r)
                for r in conn.execute(
                    """
                    SELECT p.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
                    FROM pickups p JOIN users u ON p.user_id = u.id
                    ORDER BY p.id DESC
                    """
                ).fetchall()
            ]
        else:
            rows = [
                dict(r)
                for r in conn.execute(
                    "SELECT * FROM pickups WHERE user_id = ? ORDER BY id DESC",
                    (g.current_user["id"],),
                ).fetchall()
            ]
    return jsonify({"pickups": rows})


@app.route("/api/pickups", methods=["POST"])
@token_required
def create_pickup():
    data = request.get_json(silent=True) or {}
    category = (data.get("category") or "").strip()
    address = (data.get("address") or "").strip()
    preferred_date = (data.get("preferred_date") or "").strip()
    time_slot = (data.get("time_slot") or "09:00 AM - 12:00 PM").strip()
    notes = (data.get("notes") or "").strip()
    try:
        quantity_kg = float(data.get("quantity_kg", 0))
    except (ValueError, TypeError):
        quantity_kg = 0.0

    if category not in ("Wet Waste", "Dry Waste", "Metal Waste", "Mixed Recyclables"):
        return jsonify({"error": "Please select a valid waste category."}), 400
    if quantity_kg <= 0:
        return jsonify({"error": "Quantity must be greater than 0 kg."}), 400
    if len(address) < 5:
        return jsonify({"error": "Please enter a valid pickup address."}), 400
    if not preferred_date:
        return jsonify({"error": "Please choose a preferred collection date."}), 400

    now = utc_now_iso()
    with db_session() as conn:
        conn.execute(
            """
            INSERT INTO pickups (user_id, category, quantity_kg, address, preferred_date, time_slot, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?)
            """,
            (g.current_user["id"], category, quantity_kg, address, preferred_date, time_slot, notes, now, now),
        )
        pid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute(
            """
            INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
            VALUES (?, 'user', 'pickup', 'Pickup Scheduled', ?, 0, ?)
            """,
            (
                g.current_user["id"],
                f"Collection of {quantity_kg} kg ({category}) scheduled for {preferred_date} ({time_slot}).",
                now,
            ),
        )
        conn.execute(
            """
            INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
            VALUES (NULL, 'admin', 'pickup', 'New Pickup Request', ?, 0, ?)
            """,
            (f"{g.current_user['name']} requested {quantity_kg} kg {category} pickup on {preferred_date}.", now),
        )
        created = dict(conn.execute("SELECT * FROM pickups WHERE id = ?", (pid,)).fetchone())

    return jsonify({"pickup": created, "message": "Waste collection scheduled successfully."}), 201


@app.route("/api/pickups/<int:pickup_id>", methods=["PATCH"])
@token_required
def update_pickup(pickup_id: int):
    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()
    if new_status not in ("Scheduled", "In Progress", "Completed", "Cancelled"):
        return jsonify({"error": "Invalid pickup status."}), 400

    with db_session() as conn:
        p = conn.execute("SELECT * FROM pickups WHERE id = ?", (pickup_id,)).fetchone()
        if not p:
            return jsonify({"error": "Pickup request not found."}), 404
        if g.current_user["role"] != "admin" and p["user_id"] != g.current_user["id"]:
            return jsonify({"error": "Not authorized to modify this pickup."}), 403
        if g.current_user["role"] != "admin" and new_status != "Cancelled":
            return jsonify({"error": "Only administrators can mark pickups In Progress or Completed."}), 403

        now = utc_now_iso()
        conn.execute(
            "UPDATE pickups SET status = ?, updated_at = ? WHERE id = ?",
            (new_status, now, pickup_id),
        )
        conn.execute(
            """
            INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
            VALUES (?, 'user', 'pickup', 'Pickup Status Updated', ?, 0, ?)
            """,
            (p["user_id"], f"Your pickup #{pickup_id} ({p['category']}) is now '{new_status}'.", now),
        )
        updated = dict(conn.execute("SELECT * FROM pickups WHERE id = ?", (pickup_id,)).fetchone())
    return jsonify({"pickup": updated, "message": f"Pickup marked as {new_status}."})


RECYCLING_CENTERS = [
    {
        "id": 1,
        "name": "GreenPulse Municipal Material Recovery Facility",
        "address": "120 Eco Park Boulevard, Central District",
        "lat": 12.9716,
        "lng": 77.5946,
        "accepts": ["Dry Waste", "Metal Waste"],
        "hours": "Mon-Sat: 8:00 AM - 7:00 PM",
        "phone": "+1-555-2301",
    },
    {
        "id": 2,
        "name": "BioCycle Organic Compost & Biogas Hub",
        "address": "48 Botanical Garden Road, East Zone",
        "lat": 12.9822,
        "lng": 77.6185,
        "accepts": ["Wet Waste"],
        "hours": "Daily: 6:30 AM - 6:00 PM",
        "phone": "+1-555-2302",
    },
    {
        "id": 3,
        "name": "MetroScrap Aluminium & Metal Recovery Point",
        "address": "85 Industrial Estate Lane, South Sector",
        "lat": 12.9538,
        "lng": 77.5772,
        "accepts": ["Metal Waste", "Dry Waste"],
        "hours": "Mon-Sat: 9:00 AM - 6:30 PM",
        "phone": "+1-555-2303",
    },
    {
        "id": 4,
        "name": "Campus Zero-Waste Drop-Off Kiosk",
        "address": "University Innovation Avenue, North Block",
        "lat": 12.9964,
        "lng": 77.5812,
        "accepts": ["Wet Waste", "Dry Waste", "Metal Waste"],
        "hours": "Daily: 7:00 AM - 9:00 PM",
        "phone": "+1-555-2304",
    },
    {
        "id": 5,
        "name": "EcoLoop E-Waste & Hazardous Drop Center",
        "address": "310 Tech Corridor West",
        "lat": 12.9610,
        "lng": 77.6380,
        "accepts": ["Dry Waste", "Metal Waste", "E-Waste"],
        "hours": "Tue-Sun: 10:00 AM - 6:00 PM",
        "phone": "+1-555-2305",
    },
]


def _haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p = math.pi / 180.0
    a = (
        0.5
        - math.cos((lat2 - lat1) * p) / 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    )
    return round(2 * r * math.asin(math.sqrt(a)), 2)


@app.route("/api/locator/centers", methods=["GET"])
@token_required
def locator_centers():
    lat = request.args.get("lat", type=float)
    lng = request.args.get("lng", type=float)
    category = (request.args.get("category") or "").strip()

    centers = []
    for c in RECYCLING_CENTERS:
        if category and category != "All" and category not in c["accepts"]:
            continue
        item = dict(c)
        if lat is not None and lng is not None:
            # Offset simulated centers near user's live coords if far away so map stays useful anywhere
            dist = _haversine_km(lat, lng, c["lat"], c["lng"])
            if dist > 80:
                offset_lat = (c["lat"] - 12.9716)
                offset_lng = (c["lng"] - 77.5946)
                item["lat"] = round(lat + offset_lat, 5)
                item["lng"] = round(lng + offset_lng, 5)
                dist = _haversine_km(lat, lng, item["lat"], item["lng"])
            item["distance_km"] = dist
        centers.append(item)

    if lat is not None and lng is not None:
        centers.sort(key=lambda x: x.get("distance_km", 999))
    return jsonify({"centers": centers})


@app.route("/api/assistant/chat", methods=["POST"])
@token_required
def assistant_chat():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")
    with db_session() as conn:
        records = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM waste_records WHERE user_id = ?", (g.current_user["id"],)
            ).fetchall()
        ]
    stats = _compute_stats(records, points=int(g.current_user.get("points") or 0))
    response = answer_recycling_question(message, user_stats=stats)
    return jsonify(response)


# -------------------- ADMIN DASHBOARD & REPORTS --------------------

@app.route("/api/admin/overview", methods=["GET"])
@admin_required
def admin_overview():
    timeframe = request.args.get("timeframe", "daily").lower()
    if timeframe not in ("daily", "weekly", "monthly"):
        timeframe = "daily"

    with db_session() as conn:
        total_users = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'user'").fetchone()[0]
        total_admins = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'").fetchone()[0]
        records = [
            dict(r)
            for r in conn.execute(
                """
                SELECT wr.*, u.name AS user_name, u.email AS user_email
                FROM waste_records wr
                JOIN users u ON wr.user_id = u.id
                ORDER BY wr.id DESC
                """
            ).fetchall()
        ]
        bins = [dict(r) for r in conn.execute("SELECT * FROM bins ORDER BY id").fetchall()]
        pickups = [
            dict(r)
            for r in conn.execute(
                """
                SELECT p.*, u.name AS user_name, u.email AS user_email
                FROM pickups p JOIN users u ON p.user_id = u.id
                ORDER BY p.id DESC LIMIT 20
                """
            ).fetchall()
        ]
        recent_activity = [
            dict(r)
            for r in conn.execute(
                """
                SELECT bl.*, b.label AS bin_label, b.category, u.name AS user_name
                FROM bin_logs bl
                JOIN bins b ON bl.bin_id = b.id
                LEFT JOIN users u ON bl.user_id = u.id
                ORDER BY bl.id DESC LIMIT 15
                """
            ).fetchall()
        ]

    stats = _compute_stats(records)
    stats["total_users"] = total_users
    stats["total_admins"] = total_admins
    series = _build_time_series(records, timeframe)
    return jsonify({
        "stats": stats,
        "timeframe": timeframe,
        "time_series": series,
        "bins": bins,
        "recent_records": records[:25],
        "pickups": pickups,
        "recent_activity": recent_activity,
    })


@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_list_users():
    with db_session() as conn:
        rows = conn.execute(
            """
            SELECT u.*, COUNT(wr.id) AS items_count, COALESCE(SUM(wr.co2_saved_kg), 0) AS co2_saved_kg
            FROM users u
            LEFT JOIN waste_records wr ON wr.user_id = u.id
            GROUP BY u.id
            ORDER BY u.id DESC
            """
        ).fetchall()
    users = []
    for r in rows:
        item = serialize_user(r)
        item["items_count"] = r["items_count"]
        item["co2_saved_kg"] = round(float(r["co2_saved_kg"] or 0), 2)
        users.append(item)
    return jsonify({"users": users})


@app.route("/api/admin/users/<int:user_id>", methods=["PATCH"])
@admin_required
def admin_update_user(user_id: int):
    data = request.get_json(silent=True) or {}
    if user_id == g.current_user["id"] and data.get("is_active") is False:
        return jsonify({"error": "You cannot deactivate your own admin account."}), 400

    with db_session() as conn:
        u = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not u:
            return jsonify({"error": "User not found."}), 404

        is_active = 1 if data.get("is_active", bool(u["is_active"])) else 0
        role = data.get("role", u["role"])
        if role not in ("user", "admin"):
            return jsonify({"error": "Invalid role."}), 400

        conn.execute(
            "UPDATE users SET is_active = ?, role = ? WHERE id = ?",
            (is_active, role, user_id),
        )
        updated = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return jsonify({"user": serialize_user(updated), "message": "User account updated."})


@app.route("/api/admin/reports/excel", methods=["GET"])
@admin_required
def export_excel():
    with db_session() as conn:
        total_users = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'user'").fetchone()[0]
        bins = [dict(r) for r in conn.execute("SELECT * FROM bins ORDER BY id").fetchall()]
        records = [
            dict(r)
            for r in conn.execute(
                """
                SELECT wr.*, u.name AS user_name, u.email AS user_email
                FROM waste_records wr JOIN users u ON wr.user_id = u.id
                ORDER BY wr.id DESC
                """
            ).fetchall()
        ]
    summary = _compute_stats(records)
    summary["total_users"] = total_users
    buf = generate_excel_report(summary, bins, records)
    return send_file(
        buf,
        as_attachment=True,
        download_name="ecosort_waste_report.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.route("/api/admin/reports/pdf", methods=["GET"])
@admin_required
def export_pdf():
    with db_session() as conn:
        total_users = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'user'").fetchone()[0]
        bins = [dict(r) for r in conn.execute("SELECT * FROM bins ORDER BY id").fetchall()]
        records = [
            dict(r)
            for r in conn.execute(
                """
                SELECT wr.*, u.name AS user_name, u.email AS user_email
                FROM waste_records wr JOIN users u ON wr.user_id = u.id
                ORDER BY wr.id DESC
                """
            ).fetchall()
        ]
    summary = _compute_stats(records)
    summary["total_users"] = total_users
    buf = generate_pdf_report(summary, bins, records)
    return send_file(
        buf,
        as_attachment=True,
        download_name="ecosort_waste_report.pdf",
        mimetype="application/pdf",
    )


# -------------------- UPLOADS & SPA FRONTEND SERVING --------------------

@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(Config.UPLOAD_DIR, filename)


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    target = os.path.join(FRONTEND_DIR, path)
    if path and os.path.isfile(target):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)

