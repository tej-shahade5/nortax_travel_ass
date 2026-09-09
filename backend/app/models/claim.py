from sqlalchemy import Column, String, Numeric, Date, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class Claim(Base):
    __tablename__ = "claims"

    id = Column(String(36), primary_key=True)
    travel_request_id = Column(String(36), ForeignKey("travel_requests.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(20), ForeignKey("employees.emp_code"), nullable=False)
    total_claimed = Column(Numeric(12, 2), default=0)
    advance_adjusted = Column(Numeric(12, 2), default=0)
    net_payable = Column(Numeric(12, 2), default=0)
    status = Column(String(30), default="draft")
    submitted_at = Column(TIMESTAMP)
    finance_verified_at = Column(TIMESTAMP)
    payment_run_date = Column(Date)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    travel_request = relationship("TravelRequest", back_populates="claim")
    employee = relationship("Employee", foreign_keys=[employee_id])
    lines = relationship("ClaimLine", back_populates="claim")
    payment = relationship("Payment", back_populates="claim", uselist=False)
