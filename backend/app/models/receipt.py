from sqlalchemy import Column, String, Date, Numeric, Boolean, Text, TIMESTAMP, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from ..database import Base


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(String(36), primary_key=True)
    travel_request_id = Column(String(36), ForeignKey("travel_requests.id", ondelete="CASCADE"), nullable=False)
    source_email_id = Column(String(100))
    merchant = Column(String(200))
    receipt_date = Column(Date)
    amount = Column(Numeric(12, 2))
    category = Column(String(50))  # lodging, meals, local_conveyance, business_entertainment, air_travel, other
    raw_text = Column(Text)
    extracted_data = Column(JSONB)
    attachment_path = Column(String(500))
    is_duplicate = Column(Boolean, default=False)
    duplicate_of = Column(String(36), ForeignKey("receipts.id"))
    policy_flags = Column(JSONB)
    # Business entertainment fields (policy section 3.5)
    attendee_names = Column(Text)  # Comma-separated names of attendees
    attendee_org = Column(String(200))  # Organization of attendees
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    travel_request = relationship("TravelRequest", back_populates="receipts")
    original_receipt = relationship("Receipt", remote_side=[id], foreign_keys=[duplicate_of])
