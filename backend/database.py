import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Absolute path to vendors.db in the project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "vendors.db")

# Read DATABASE_URL from environment (e.g. Neon on Vercel)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    if os.getenv("VERCEL"):
        # Vercel serverless functions have a writable /tmp directory
        DB_PATH = "/tmp/vendors.db"
    DATABASE_URL = f"sqlite:///{DB_PATH}"

# Fix for SQLAlchemy 1.4+ with postgres:// URLs
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
