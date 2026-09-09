from sqlalchemy import Column, ForeignKey, String, TIMESTAMP, func
from sqlalchemy.orm import relationship
from ..database import Base


class Employee(Base):
    __tablename__ = "employees"

    emp_code = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    designation = Column(String(100))
    department = Column(String(100))
    cost_centre = Column(String(20))
    city = Column(String(50))
    reporting_manager_code = Column(String(20), ForeignKey("employees.emp_code"))
    role = Column(String(20), nullable=False)  # Employee, Reporting Manager, Head of Department, Head of Division, MD, Finance
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    manager = relationship("Employee", remote_side=[emp_code], back_populates="subordinates")
    subordinates = relationship("Employee", back_populates="manager")
    travel_requests = relationship("TravelRequest", back_populates="employee", foreign_keys="TravelRequest.employee_id")
