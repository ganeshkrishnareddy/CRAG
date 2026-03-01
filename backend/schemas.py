"""Pydantic schemas for request / response validation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Vendor ────────────────────────────────────────────────
class VendorCreate(BaseModel):
    name: str
    category: str
    criticality: str          # Low / Medium / High / Critical
    status: str = "Active"


class VendorOut(BaseModel):
    id: int
    name: str
    category: str
    criticality: str
    status: str
    risk_score: float
    risk_level: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Alert ─────────────────────────────────────────────────
class AlertOut(BaseModel):
    id: int
    vendor_id: int
    vendor_name: str
    risk_score: float
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Audit ─────────────────────────────────────────────────
class AuditLogOut(BaseModel):
    id: int
    vendor_id: int
    vendor_name: str
    action: str
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# ── Stats ─────────────────────────────────────────────────
class RiskStats(BaseModel):
    low: int
    medium: int
    high: int
    total: int
