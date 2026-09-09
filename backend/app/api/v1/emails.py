from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from uuid import uuid4
import email
from email import policy
from email.parser import BytesParser
import re
from ...database import get_db
from ...models.employee import Employee
from ...models.receipt import Receipt
from ...models.travel_request import TravelRequest
from ...utils.security import get_current_user

router = APIRouter(prefix="/emails", tags=["Email Ingestion"])


async def check_duplicate(db: AsyncSession, travel_request_id: str, merchant: str, receipt_date, amount) -> Receipt | None:
    """Check if a receipt with same merchant + date + amount already exists (policy 5.3)."""
    if not merchant or not amount:
        return None
    query = select(Receipt).where(
        Receipt.travel_request_id == travel_request_id,
        Receipt.is_duplicate == False,
        Receipt.merchant.ilike(f"%{merchant}%"),
        Receipt.amount == amount,
    )
    if receipt_date:
        query = query.where(Receipt.receipt_date == receipt_date)
    result = await db.execute(query)
    return result.scalar_one_or_none()


@router.post("/ingest")
async def ingest_email(
    file: UploadFile = File(...),
    travel_request_id: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Upload and parse an .eml file to extract receipt data."""
    if not file.filename.endswith('.eml'):
        raise HTTPException(status_code=400, detail="Only .eml files are supported")

    content = await file.read()
    msg = BytesParser(policy=policy.default).parsebytes(content)

    subject = msg.get("subject", "")
    sender = msg.get("from", "")
    message_id = msg.get("message-id", "")

    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                body = part.get_content()
                break
    else:
        body = msg.get_content()

    receipt_data = extract_receipt_from_email(sender, subject, body)

    # Check for duplicate bill (policy 5.3)
    existing = await check_duplicate(
        db, travel_request_id,
        receipt_data.get("merchant", ""),
        receipt_data.get("date"),
        receipt_data.get("amount"),
    )

    receipt = Receipt(
        id=str(uuid4()),
        travel_request_id=travel_request_id,
        source_email_id=message_id,
        merchant=receipt_data.get("merchant"),
        receipt_date=receipt_data.get("date"),
        amount=receipt_data.get("amount"),
        category=receipt_data.get("category"),
        raw_text=body,
        extracted_data=receipt_data,
        is_duplicate=existing is not None,
        duplicate_of=existing.id if existing else None,
        policy_flags={"duplicate_check": True, "original_receipt_id": existing.id} if existing else {},
    )

    db.add(receipt)
    await db.flush()

    return {
        "message": "Email ingested successfully",
        "receipt_id": receipt.id,
        "extracted_data": receipt_data,
        "is_duplicate": existing is not None,
        "duplicate_of": existing.id if existing else None,
    }


@router.post("/batch-ingest")
async def batch_ingest_emails(
    travel_request_id: str,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """Batch upload multiple .eml files for a travel request."""
    # Verify travel request exists and belongs to user
    tr_result = await db.execute(
        select(TravelRequest).where(TravelRequest.id == travel_request_id)
    )
    travel_request = tr_result.scalar_one_or_none()

    if not travel_request:
        raise HTTPException(status_code=404, detail="Travel request not found")

    if travel_request.employee_id != current_user.emp_code and current_user.role not in ["Admin", "Finance", "MD"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    results = []
    errors = []

    for file in files:
        if not file.filename.endswith('.eml'):
            errors.append({"filename": file.filename, "error": "Not an .eml file"})
            continue

        try:
            content = await file.read()
            msg = BytesParser(policy=policy.default).parsebytes(content)

            subject = msg.get("subject", "")
            sender = msg.get("from", "")
            message_id = msg.get("message-id", "")

            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_content()
                        break
            else:
                body = msg.get_content()

            receipt_data = extract_receipt_from_email(sender, subject, body)

            # Check for duplicate bill (policy 5.3)
            existing = await check_duplicate(
                db, travel_request_id,
                receipt_data.get("merchant", ""),
                receipt_data.get("date"),
                receipt_data.get("amount"),
            )

            receipt = Receipt(
                id=str(uuid4()),
                travel_request_id=travel_request_id,
                source_email_id=message_id,
                merchant=receipt_data.get("merchant"),
                receipt_date=receipt_data.get("date"),
                amount=receipt_data.get("amount"),
                category=receipt_data.get("category"),
                raw_text=body,
                extracted_data=receipt_data,
                is_duplicate=existing is not None,
                duplicate_of=existing.id if existing else None,
                policy_flags={"duplicate_check": True, "original_receipt_id": existing.id} if existing else {},
            )

            db.add(receipt)
            results.append({
                "filename": file.filename,
                "receipt_id": receipt.id,
                "extracted_data": receipt_data,
                "is_duplicate": existing is not None,
                "duplicate_of": existing.id if existing else None,
            })
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})

    await db.flush()

    return {
        "message": f"Processed {len(results)} file(s)",
        "success_count": len(results),
        "error_count": len(errors),
        "results": results,
        "errors": errors,
    }


def extract_receipt_from_email(sender: str, subject: str, body: str) -> dict:
    """Extract receipt data from email based on sender and content."""
    sender_lower = sender.lower()
    subject_lower = subject.lower()

    if "uber" in sender_lower:
        return parse_uber_receipt(body)
    elif "makemytrip" in sender_lower and "flight" in subject_lower:
        return parse_flight_receipt(body)
    elif "makemytrip" in sender_lower and "hotel" in subject_lower:
        return parse_hotel_receipt(body)
    elif "hotel" in sender_lower or "invoice" in subject_lower:
        return parse_hotel_invoice(body)
    elif "dinner" in subject_lower or "bill" in subject_lower:
        return parse_dinner_bill(body)
    else:
        return {
            "merchant": "Unknown",
            "amount": None,
            "date": None,
            "category": "other",
            "raw_subject": subject,
        }


def parse_uber_receipt(body: str) -> dict:
    """Parse Uber receipt from email body."""
    amount_match = re.search(r'Total\s+INR\s+([\d,]+\.?\d*)', body)
    amount = float(amount_match.group(1).replace(',', '')) if amount_match else None

    date_match = re.search(r'(\d{1,2}\s+\w+\s+\d{4})', body)
    date_str = date_match.group(1) if date_match else None
    receipt_date = None
    if date_str:
        try:
            receipt_date = datetime.strptime(date_str, '%d %b %Y').date()
        except ValueError:
            pass

    pickup_match = re.search(r'Pickup\s+(.*?)\n', body)
    drop_match = re.search(r'Drop\s+(.*?)\n', body)
    pickup = pickup_match.group(1).strip() if pickup_match else None
    drop = drop_match.group(1).strip() if drop_match else None

    return {
        "merchant": "Uber",
        "amount": amount,
        "date": receipt_date,
        "category": "local_conveyance",
        "pickup": pickup,
        "drop": drop,
    }


def parse_flight_receipt(body: str) -> dict:
    """Parse flight e-ticket from email body."""
    amount_match = re.search(r'Total\s+INR\s+([\d,]+\.?\d*)', body)
    amount = float(amount_match.group(1).replace(',', '')) if amount_match else None

    pnr_match = re.search(r'PNR:\s*(\w+)', body)
    pnr = pnr_match.group(1) if pnr_match else None

    return {
        "merchant": "MakeMyTrip (Flight)",
        "amount": amount,
        "date": None,
        "category": "air_travel",
        "pnr": pnr,
    }


def parse_hotel_receipt(body: str) -> dict:
    """Parse hotel voucher from email body."""
    total_match = re.search(r'Grand total\s+INR\s+([\d,]+\.?\d*)', body)
    amount = float(total_match.group(1).replace(',', '')) if total_match else None

    hotel_match = re.search(r'(.+?)\n.*?Check-in', body, re.DOTALL)
    hotel = hotel_match.group(1).strip() if hotel_match else "Unknown Hotel"

    return {
        "merchant": hotel,
        "amount": amount,
        "date": None,
        "category": "lodging",
    }


def parse_hotel_invoice(body: str) -> dict:
    """Parse hotel tax invoice from email body."""
    total_match = re.search(r'Invoice total\s+([\d,]+\.?\d*)', body)
    amount = float(total_match.group(1).replace(',', '')) if total_match else None

    items = {}
    item_patterns = {
        "room_charges": r'Room charges\s+([\d,]+\.?\d*)',
        "laundry": r'Laundry\s+([\d,]+\.?\d*)',
        "mini_bar": r'Mini bar\s+([\d,]+\.?\d*)',
        "in_room_dining": r'In-room dining\s+([\d,]+\.?\d*)',
    }

    for key, pattern in item_patterns.items():
        match = re.search(pattern, body)
        if match:
            items[key] = float(match.group(1).replace(',', ''))

    return {
        "merchant": "Hotel Invoice",
        "amount": amount,
        "date": None,
        "category": "lodging",
        "line_items": items,
    }


def parse_dinner_bill(body: str) -> dict:
    """Parse dinner bill from email body."""
    return {
        "merchant": "Dinner Bill",
        "amount": None,
        "date": None,
        "category": "business_entertainment",
    }
