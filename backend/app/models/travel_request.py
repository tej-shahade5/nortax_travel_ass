from sqlalchemy import Column, String, Text, Date, Numeric, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class TravelRequest(Base):
    __tablename__ = "travel_requests"

    id = Column(String(36), primary_key=True)
    travel_request_id = Column(String(30), unique=True, nullable=False)
    employee_id = Column(String(20), ForeignKey("employees.emp_code"), nullable=False)
    purpose = Column(Text, nullable=False)
    destination = Column(String(100), nullable=False)
    city_tier = Column(String(20), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    estimated_amount = Column(Numeric(12, 2), nullable=False)
    advance_requested = Column(Numeric(12, 2), default=0)
    status = Column(String(30), default="draft")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="travel_requests", foreign_keys=[employee_id])
    approvals = relationship("Approval", back_populates="travel_request")
    advance = relationship("Advance", back_populates="travel_request", uselist=False)
    receipts = relationship("Receipt", back_populates="travel_request")
    claim = relationship("Claim", back_populates="travel_request", uselist=False)
