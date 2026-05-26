"""SQLite connection and schema init for users + reports index."""
import sqlite3
from pathlib import Path

from app.storage.paths import DATA_DIR

DB_PATH = DATA_DIR / "opsai.db"


def get_conn() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id           TEXT PRIMARY KEY,
                email        TEXT UNIQUE NOT NULL,
                name         TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at   TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reports (
                id           TEXT PRIMARY KEY,
                user_id      TEXT NOT NULL,
                dataset_id   TEXT NOT NULL,
                briefing_id  TEXT NOT NULL,
                headline     TEXT NOT NULL,
                created_at   TEXT NOT NULL,
                business_id  TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)
