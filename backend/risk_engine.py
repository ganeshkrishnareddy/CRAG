"""Risk Scoring Engine — background task that recalculates vendor risk every 10s."""

import random
from database import SessionLocal
from models import Vendor, Alert, AuditLog, IST
from datetime import datetime


def _classify(score: float) -> str:
    if score <= 40:
        return "Low"
    elif score <= 70:
        return "Medium"
    return "High"


def update_all_risk_scores():
    """Called by APScheduler every 10 seconds."""
    db: Session = SessionLocal()
    try:
        vendors = db.query(Vendor).filter(Vendor.status == "Active").all()
        for v in vendors:
            # Weighted random walk: drift ±15, biased slightly toward center
            drift = random.uniform(-15, 15)
            # Mean-reversion pull toward 50
            pull = (50 - v.risk_score) * 0.05
            new_score = round(max(0, min(100, v.risk_score + drift + pull)), 1)
            old_level = v.risk_level
            new_level = _classify(new_score)

            v.risk_score = new_score
            v.risk_level = new_level
            v.updated_at = datetime.now(IST)

            # Audit log entry
            db.add(AuditLog(
                vendor_id=v.id,
                vendor_name=v.name,
                action="RISK_UPDATE",
                details=f"Score: {new_score} ({new_level})"
            ))

            # Alert if score crosses into High territory
            if new_score > 70 and old_level != "High":
                db.add(Alert(
                    vendor_id=v.id,
                    vendor_name=v.name,
                    risk_score=new_score,
                    message=f"⚠ {v.name} risk score surged to {new_score} — classified HIGH RISK"
                ))
            elif new_score > 70:
                # Already high — still log alert for continuous monitoring
                db.add(Alert(
                    vendor_id=v.id,
                    vendor_name=v.name,
                    risk_score=new_score,
                    message=f"🔴 {v.name} remains HIGH RISK at {new_score}"
                ))

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
