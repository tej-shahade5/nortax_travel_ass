"""Script to seed employees from employee_master.csv"""
import csv
import asyncio
import sys
from pathlib import Path

# Ensure the backend directory is on sys.path so "app" is importable
# regardless of where the script is invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import AsyncSessionLocal, engine, Base
from app.models.employee import Employee
from app.utils.security import hash_password


async def seed_employees():
    """Load employees from employee_master.csv into the database."""
    csv_path = Path(__file__).parent.parent.parent / "pack" / "employee_master.csv"

    if not csv_path.exists():
        print(f"Error: {csv_path} not found")
        return

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                emp_code = row["emp_code"]
                email = row["email"]

                # Check if employee already exists
                from sqlalchemy import select
                result = await session.execute(
                    select(Employee).where(Employee.emp_code == emp_code)
                )
                if result.scalar_one_or_none():
                    print(f"Employee {emp_code} already exists, skipping")
                    continue

                # Create employee with default password (emp_code)
                employee = Employee(
                    emp_code=emp_code,
                    name=row["name"],
                    email=email,
                    designation=row["designation"],
                    department=row["department"],
                    cost_centre=row["cost_centre"],
                    city=row["city"],
                    reporting_manager_code=row["reporting_manager_code"] or None,
                    role=row["role"],
                    password_hash=hash_password(emp_code),  # Default password = emp_code
                )
                session.add(employee)
                count += 1
                print(f"Added employee: {emp_code} - {row['name']}")

            await session.commit()
            print(f"\nSeeded {count} employees successfully!")


if __name__ == "__main__":
    asyncio.run(seed_employees())
