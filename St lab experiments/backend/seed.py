from datetime import datetime, timedelta, timezone
from auth import hash_password, utc_now_iso
from config import Config
from database import db_session, init_db
from ai_model import CATEGORY_DETAILS


def ensure_seed_data():
    init_db()
    now = utc_now_iso()
    with db_session() as conn:
        # Ensure the 3 smart bins exist
        bins_spec = [
            ("Wet Waste", "Green Compost Bin"),
            ("Dry Waste", "Blue Recyclable Bin"),
            ("Metal Waste", "Grey Metal Bin"),
        ]
        for category, label in bins_spec:
            existing_bin = conn.execute(
                "SELECT id FROM bins WHERE category = ?", (category,)
            ).fetchone()
            if not existing_bin:
                conn.execute(
                    """
                    INSERT INTO bins (category, label, current_items, capacity_items, fill_percentage, status, last_emptied_at, updated_at)
                    VALUES (?, ?, 0, ?, 0.0, 'Empty', ?, ?)
                    """,
                    (category, label, Config.BIN_CAPACITY_ITEMS, now, now),
                )

        # Ensure default Admin account exists
        admin = conn.execute("SELECT id FROM users WHERE email = ?", ("admin@ecosort.ai",)).fetchone()
        if not admin:
            conn.execute(
                """
                INSERT INTO users (name, email, phone, password_hash, role, address, points, is_active, created_at)
                VALUES (?, ?, ?, ?, 'admin', ?, 0, 1, ?)
                """,
                (
                    "EcoSort Administrator",
                    "admin@ecosort.ai",
                    "+1-555-0100",
                    hash_password("Admin@123"),
                    "Green Civic Operations Hub, Sector 4",
                    now,
                ),
            )

        # Ensure default Demo User account exists (clearly labelled on Login page)
        demo_user = conn.execute("SELECT id FROM users WHERE email = ?", ("alex@ecosort.ai",)).fetchone()
        if not demo_user:
            conn.execute(
                """
                INSERT INTO users (name, email, phone, password_hash, role, address, points, is_active, created_at)
                VALUES (?, ?, ?, ?, 'user', ?, 0, 1, ?)
                """,
                (
                    "Alex Rivera",
                    "alex@ecosort.ai",
                    "+1-555-0199",
                    hash_password("EcoUser@123"),
                    "24 Green Valley Ave, Eco District",
                    now,
                ),
            )
            demo_user_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            conn.execute(
                """
                INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
                VALUES (?, 'user', 'welcome', 'Welcome to EcoSort AI!', 'Upload or scan your first waste item to earn Eco Points and help fill your smart recycling stats.', 0, ?)
                """,
                (demo_user_id, now),
            )


def load_clearly_labelled_demo_dataset(target_user_id: int):
    """Explicitly triggered Demo Mode sample records (marked is_demo=1)."""
    now_dt = datetime.now(timezone.utc)
    samples = [
        ("Wet Waste", "banana peel (Demo Data)", 94.2, 5),
        ("Dry Waste", "water bottle (Demo Data)", 91.8, 3),
        ("Metal Waste", "soda can (Demo Data)", 96.4, 2),
        ("Dry Waste", "cardboard carton (Demo Data)", 89.5, 1),
        ("Wet Waste", "orange peel (Demo Data)", 92.1, 0),
    ]
    with db_session() as conn:
        bins = {
            row["category"]: dict(row)
            for row in conn.execute("SELECT * FROM bins").fetchall()
        }
        added_points = 0
        for cat, label, conf, days_ago in samples:
            b = bins[cat]
            details = CATEGORY_DETAILS[cat]
            ts = (now_dt - timedelta(days=days_ago)).isoformat()
            conn.execute(
                """
                INSERT INTO waste_records (
                    user_id, image_path, image_name, predicted_category, detected_label,
                    confidence, is_demo, model_source, disposal_instructions, bin_id,
                    sorting_status, points_earned, estimated_weight_kg, co2_saved_kg, created_at
                )
                VALUES (?, '', 'demo-sample.png', ?, ?, ?, 1, 'Demo Mode Sample', ?, ?, 'Sorted (Demo)', ?, ?, ?, ?)
                """,
                (
                    target_user_id,
                    cat,
                    label,
                    conf,
                    details["disposal_instructions"],
                    b["id"],
                    details["points"],
                    details["estimated_weight_kg"],
                    details["co2_saved_kg"],
                    ts,
                ),
            )
            added_points += details["points"]
            new_count = min(b["current_items"] + 1, b["capacity_items"])
            fill_pct = round((new_count / b["capacity_items"]) * 100, 1)
            status = "Full" if fill_pct >= 85 else ("Half Full" if fill_pct >= 40 else "Empty")
            b["current_items"] = new_count
            conn.execute(
                "UPDATE bins SET current_items = ?, fill_percentage = ?, status = ?, updated_at = ? WHERE id = ?",
                (new_count, fill_pct, status, now_dt.isoformat(), b["id"]),
            )
        conn.execute(
            "UPDATE users SET points = points + ? WHERE id = ?",
            (added_points, target_user_id),
        )
        conn.execute(
            """
            INSERT INTO notifications (user_id, target_role, notif_type, title, message, is_read, created_at)
            VALUES (?, 'user', 'demo', 'Demo Mode Sample Data Loaded', '5 clearly labelled Demo Mode sample items were added to preview charts and smart bins.', 0, ?)
            """,
            (target_user_id, now_dt.isoformat()),
        )
    return added_points

