"""CRAG Prototype — FastAPI entry-point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler

from database import engine, Base
from models import Vendor, Alert, AuditLog  # noqa: F401
from routes import router
from risk_engine import update_all_risk_scores
import random
from sqlalchemy.orm import Session
from database import SessionLocal

# ── Scheduler ─────────────────────────────────────────────
scheduler = BackgroundScheduler()
engine_paused = False  # module-level flag


# ── Initialize Database (Module level for Serverless) ─────
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    if db.query(Vendor).count() == 0:
        vendors = [
            {"name": "Acme Cloud Services", "category": "Cloud Provider", "criticality": "High", "status": "Active"},
            {"name": "SecurePay Inc", "category": "Payment Processor", "criticality": "Critical", "status": "Active"},
            {"name": "DataMinds Analytics", "category": "Data Analytics", "criticality": "Medium", "status": "Active"},
            {"name": "ProgVision", "category": "Consulting", "criticality": "Low", "status": "Active"},
            {"name": "CyberShield Pro", "category": "Security Vendor", "criticality": "Critical", "status": "Active"},
        ]
        for v in vendors:
            initial_score = round(random.uniform(5, 55), 1)
            level = "Low" if initial_score <= 40 else ("Medium" if initial_score <= 70 else "High")
            vendor = Vendor(
                name=v["name"],
                category=v["category"],
                criticality=v["criticality"],
                status=v["status"],
                risk_score=initial_score,
                risk_level=level,
            )
            db.add(vendor)
        try:
            db.commit()
        except Exception as e:
            print(f"Read-only filesystem or DB error: {e}")
            db.rollback()
except Exception as e:
    print(f"Error during DB initialization: {e}")
finally:
    db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Scheduler might fail or be useless on serverless, but we try
    try:
        scheduler.add_job(update_all_risk_scores, "interval", seconds=10, id="risk_tick")
        scheduler.start()
    except Exception as e:
        print(f"Scheduler failed to start (likely serverless environment): {e}")

    yield
    # Shutdown
    try:
        scheduler.shutdown(wait=False)
    except:
        pass


app = FastAPI(
    title="CRAG — Vendor Risk Monitor",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS (allow the frontend during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(router)

# Serve frontend static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")


@app.get("/")
async def serve_frontend():
    return FileResponse("../frontend/index.html")
