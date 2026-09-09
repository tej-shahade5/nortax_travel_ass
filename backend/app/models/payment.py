from sqlalchemy import Column, String, Numeric, Date, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True)
    claim_id = Column(String(36), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_run_date = Column(Date, nullable=False)
    status = Column(String(20), default="scheduled")  # scheduled, processed, failed
    processed_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    claim = relationship("Claim", back_populates="payment")
