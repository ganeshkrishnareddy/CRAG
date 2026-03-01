"""SQLAlchemy ORM models: Vendor, Alert, AuditLog."""

from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from database import Base

IST = timezone(timedelta(hours=5, minutes=30))


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    category = Column(String(80), nullable=False)
    criticality = Column(String(20), nullable=False)          # Low / Medium / High / Critical
    status = Column(String(20), nullable=False, default="Active")  # Active / Inactive / Under Review
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(10), default="Low")             # Low / Medium / High
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    updated_at = Column(DateTime, default=lambda: datetime.now(IST),
                        onupdate=lambda: datetime.now(IST))


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    vendor_name = Column(String(120), nullable=False)
    risk_score = Column(Float, nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, nullable=False)
    vendor_name = Column(String(120), nullable=False)
    action = Column(String(60), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(IST))

