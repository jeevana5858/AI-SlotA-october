import sqlite3
from contextlib import contextmanager
from config import Config


def get_connection():
    conn = sqlite3.connect(Config.SQLITE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


@contextmanager
def db_session():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with db_session() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
                address TEXT DEFAULT '',
                points INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS revoked_tokens (
                token TEXT PRIMARY KEY,
                revoked_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS password_resets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                reset_code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS bins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL UNIQUE CHECK(category IN ('Wet Waste', 'Dry Waste', 'Metal Waste')),
                label TEXT NOT NULL,
                current_items INTEGER NOT NULL DEFAULT 0,
                capacity_items INTEGER NOT NULL DEFAULT 15,
                fill_percentage REAL NOT NULL DEFAULT 0.0,
                status TEXT NOT NULL DEFAULT 'Empty' CHECK(status IN ('Empty', 'Half Full', 'Full')),
                last_emptied_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS waste_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                image_path TEXT DEFAULT '',
                image_name TEXT DEFAULT '',
                predicted_category TEXT NOT NULL CHECK(predicted_category IN ('Wet Waste', 'Dry Waste', 'Metal Waste')),
                detected_label TEXT NOT NULL,
                confidence REAL NOT NULL,
                is_demo INTEGER NOT NULL DEFAULT 0,
                model_source TEXT NOT NULL DEFAULT 'MobileNetV2',
                disposal_instructions TEXT NOT NULL,
                bin_id INTEGER NOT NULL,
                sorting_status TEXT NOT NULL DEFAULT 'Sorted',
                points_earned INTEGER NOT NULL DEFAULT 0,
                estimated_weight_kg REAL NOT NULL DEFAULT 0.25,
                co2_saved_kg REAL NOT NULL DEFAULT 0.4,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (bin_id) REFERENCES bins(id)
            );

            CREATE TABLE IF NOT EXISTS bin_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bin_id INTEGER NOT NULL,
                user_id INTEGER,
                record_id INTEGER,
                action TEXT NOT NULL,
                fill_percentage REAL NOT NULL,
                status TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (bin_id) REFERENCES bins(id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (record_id) REFERENCES waste_records(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS pickups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                quantity_kg REAL NOT NULL,
                address TEXT NOT NULL,
                preferred_date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                notes TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                target_role TEXT NOT NULL DEFAULT 'user',
                notif_type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

