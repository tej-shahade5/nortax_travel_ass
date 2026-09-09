from sqlalchemy import Column, String, Numeric, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class ClaimLine(Base):
    __tablename__ = "claim_lines"

    id = Column(String(36), primary_key=True)
    claim_id = Column(String(36), ForeignKey("claims.id", ondelete="CASCADE"), nullable=False)
    receipt_id = Column(String(36), ForeignKey("receipts.id"))
    category = Column(String(50), nullable=False)
    claimed_amount = Column(Numeric(12, 2), nullable=False)
    allowed_amount = Column(Numeric(12, 2), nullable=False)
    disallowed_amount = Column(Numeric(12, 2), default=0)
    disallow_reason = Column(String(200))
    policy_rule_ref = Column(String(50))
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    claim = relationship("Claim", back_populates="lines")
    receipt = relationship("Receipt")
