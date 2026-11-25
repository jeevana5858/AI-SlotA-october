import re
import secrets
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from database import db_session

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_REGEX = re.compile(r"^[0-9+\-\s()]{7,20}$")


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def validate_password(password: str):
    if not password or len(password) < 8:
        return "Password must be at least 8 characters long."
    if not any(c.isupper() for c in password):
        return "Password must include at least one uppercase letter."
    if not any(c.islower() for c in password):
        return "Password must include at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return "Password must include at least one number."
    return None


def validate_registration(data: dict):
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if len(name) < 2:
        return "Full name must be at least 2 characters."
    if not EMAIL_REGEX.match(email):
        return "Please enter a valid email address."
    if not PHONE_REGEX.match(phone):
        return "Please enter a valid phone number (7-20 digits)."
    pw_err = validate_password(password)
    if pw_err:
        return pw_err
    return None


def create_token(user_row):
    payload = {
        "sub": str(user_row["id"]),
        "email": user_row["email"],
        "role": user_row["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")


def decode_token(token: str):
    return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])


def get_reward_tier(points: int):
    if points >= 500:
        return {"name": "Planet Champion", "badge": "Crown", "next_target": None, "min": 500}
    if points >= 250:
        return {"name": "Green Guardian", "badge": "Shield", "next_target": 500, "min": 250}
    if points >= 100:
        return {"name": "Eco Scout", "badge": "Compass", "next_target": 250, "min": 100}
    return {"name": "Seedling", "badge": "Sprout", "next_target": 100, "min": 0}


def serialize_user(row):
    points = int(row["points"] or 0)
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "role": row["role"],
        "address": row["address"] or "",
        "points": points,
        "tier": get_reward_tier(points),
        "is_active": bool(row["is_active"]),
        "created_at": row["created_at"],
    }


def _extract_token():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return request.args.get("token", "").strip()


def token_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Authentication required. Please log in."}), 401
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid authentication token."}), 401

        with db_session() as conn:
            revoked = conn.execute(
                "SELECT token FROM revoked_tokens WHERE token = ?", (token,)
            ).fetchone()
            if revoked:
                return jsonify({"error": "Token has been logged out. Please sign in again."}), 401

            user = conn.execute(
                "SELECT * FROM users WHERE id = ?", (int(payload["sub"]),)
            ).fetchone()
            if not user:
                return jsonify({"error": "Account not found."}), 401
            if not user["is_active"]:
                return jsonify({"error": "Account is deactivated. Contact an administrator."}), 403

            g.current_user = dict(user)
            g.current_token = token

        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    @token_required
    def wrapper(*args, **kwargs):
        if g.current_user.get("role") != "admin":
            return jsonify({"error": "Administrator privileges required."}), 403
        return fn(*args, **kwargs)

    return wrapper


def generate_reset_code():
    return f"{secrets.randbelow(900000) + 100000}"


def hash_password(password: str):
    return generate_password_hash(password)


def verify_password(password_hash: str, password: str):
    return check_password_hash(password_hash, password)

