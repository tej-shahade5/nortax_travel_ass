from sqlalchemy import Column, String, Integer, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(String(36), primary_key=True)
    travel_request_id = Column(String(36), ForeignKey("travel_requests.id", ondelete="CASCADE"), nullable=False)
    approver_id = Column(String(20), ForeignKey("employees.emp_code"), nullable=False)
    level = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")  # pending, approved, returned, rejected
    remarks = Column(Text)
    decided_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    travel_request = relationship("TravelRequest", back_populates="approvals")
    approver = relationship("Employee", foreign_keys=[approver_id])
