import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)


class Config:
    SECRET_KEY = os.environ.get("ECOSORT_SECRET_KEY", "ecosort-smart-waste-jwt-secret-2026")
    SQLITE_PATH = os.environ.get("ECOSORT_DB_PATH", os.path.join(DATA_DIR, "ecosort.db"))
    MONGO_URI = os.environ.get("MONGO_URI", "")
    FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_CREDENTIALS", "")
    UPLOAD_DIR = UPLOAD_DIR
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB
    BIN_CAPACITY_ITEMS = int(os.environ.get("BIN_CAPACITY_ITEMS", "15"))
    JWT_EXPIRY_HOURS = 24

