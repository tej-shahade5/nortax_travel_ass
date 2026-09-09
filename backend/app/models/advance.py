from sqlalchemy import Column, String, Numeric, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class Advance(Base):
    __tablename__ = "advances"

    id = Column(String(36), primary_key=True)
    travel_request_id = Column(String(36), ForeignKey("travel_requests.id", ondelete="CASCADE"), nullable=False)
    reference = Column(String(50), unique=True, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    disbursed_at = Column(TIMESTAMP)
    status = Column(String(20), default="pending")  # pending, disbursed, adjusted, recovered
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    travel_request = relationship("TravelRequest", back_populates="advance")
