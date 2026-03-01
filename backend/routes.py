"""API routes for vendors, alerts, audit log, and stats."""

import random
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Vendor, Alert, AuditLog
from schemas import VendorCreate, VendorOut, AlertOut, AuditLogOut, RiskStats

router = APIRouter(prefix="/api")


# ── Vendors ───────────────────────────────────────────────
@router.post("/vendors", response_model=VendorOut, status_code=201)
def create_vendor(payload: VendorCreate, db: Session = Depends(get_db)):
    initial_score = round(random.uniform(5, 55), 1)
    level = "Low" if initial_score <= 40 else ("Medium" if initial_score <= 70 else "High")

    vendor = Vendor(
        name=payload.name,
        category=payload.category,
        criticality=payload.criticality,
        status=payload.status,
        risk_score=initial_score,
        risk_level=level,
    )
    db.add(vendor)
    db.flush()

    db.add(AuditLog(
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        action="VENDOR_CREATED",
        details=f"Category: {vendor.category}, Criticality: {vendor.criticality}"
    ))

    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/vendors", response_model=List[VendorOut])
def list_vendors(db: Session = Depends(get_db)):
    return db.query(Vendor).order_by(Vendor.updated_at.desc()).all()


@router.get("/vendors/{vendor_id}")
def get_vendor_detail(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    alerts = (db.query(Alert)
              .filter(Alert.vendor_id == vendor_id)
              .order_by(Alert.created_at.desc())
              .limit(20).all())
    logs = (db.query(AuditLog)
            .filter(AuditLog.vendor_id == vendor_id)
            .order_by(AuditLog.timestamp.desc())
            .limit(30).all())

    return {
        "vendor": {
            "id": vendor.id,
            "name": vendor.name,
            "category": vendor.category,
            "criticality": vendor.criticality,
            "status": vendor.status,
            "risk_score": vendor.risk_score,
            "risk_level": vendor.risk_level,
            "created_at": vendor.created_at.isoformat() if vendor.created_at else None,
            "updated_at": vendor.updated_at.isoformat() if vendor.updated_at else None,
        },
        "alerts": [{
            "id": a.id, "risk_score": a.risk_score,
            "message": a.message,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        } for a in alerts],
        "audit_log": [{
            "id": l.id, "action": l.action,
            "details": l.details,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        } for l in logs],
    }


@router.delete("/vendors/{vendor_id}", status_code=204)
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    db.add(AuditLog(
        vendor_id=vendor.id,
        vendor_name=vendor.name,
        action="VENDOR_DELETED",
        details=f"Removed vendor {vendor.name}"
    ))
    db.delete(vendor)
    db.commit()


# ── Alerts ────────────────────────────────────────────────
@router.get("/alerts", response_model=List[AlertOut])
def list_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).order_by(Alert.created_at.desc()).limit(200).all()


# ── Audit Log ─────────────────────────────────────────────
@router.get("/audit-log", response_model=List[AuditLogOut])
def list_audit_log(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(300).all()


# ── Stats ─────────────────────────────────────────────────
@router.get("/stats", response_model=RiskStats)
def risk_stats(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).all()
    low = sum(1 for v in vendors if v.risk_level == "Low")
    medium = sum(1 for v in vendors if v.risk_level == "Medium")
    high = sum(1 for v in vendors if v.risk_level == "High")
    return RiskStats(low=low, medium=medium, high=high, total=len(vendors))


# ── Reset Alerts ──────────────────────────────────────────
@router.delete("/alerts", status_code=204)
def reset_alerts(db: Session = Depends(get_db)):
    db.query(Alert).delete()
    db.add(AuditLog(
        vendor_id=0, vendor_name="SYSTEM",
        action="ALERTS_RESET",
        details="All alerts cleared by user"
    ))
    db.commit()


# ── Reset Audit Log ───────────────────────────────────────
@router.delete("/audit-log", status_code=204)
def reset_audit_log(db: Session = Depends(get_db)):
    db.query(AuditLog).delete()
    db.commit()


# ── Engine Pause/Resume ───────────────────────────────────
@router.get("/engine/status")
def engine_status():
    from main import scheduler, engine_paused
    running = scheduler.running if hasattr(scheduler, 'running') else True
    job = scheduler.get_job("risk_tick")
    paused = engine_paused or job is None
    return {"paused": paused, "running": running}


@router.post("/engine/toggle")
def toggle_engine():
    from main import scheduler, engine_paused
    import main as main_mod
    job = scheduler.get_job("risk_tick")
    if job is not None and not main_mod.engine_paused:
        # Pause: remove the job
        scheduler.remove_job("risk_tick")
        main_mod.engine_paused = True
        return {"paused": True, "message": "Risk engine paused"}
    else:
        # Resume: re-add the job
        from risk_engine import update_all_risk_scores
        scheduler.add_job(update_all_risk_scores, "interval", seconds=10, id="risk_tick")
        main_mod.engine_paused = False
        return {"paused": False, "message": "Risk engine activated"}
