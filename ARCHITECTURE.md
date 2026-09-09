# Nortex Travel Expense Reimbursement System — Architecture Document

## 1. Problem Statement

Automate the end-to-end travel expense workflow for Nortex Industries:
- **Pre-trip**: Travel request → Manager approval → Finance advance (≤60% of estimated employee-borne cost)
- **During trip**: Receipts arrive via email (text + attachments: hotel invoices, dinner bills, Uber receipts)
- **Post-trip**: Auto-extract expenses → Populate settlement form → Policy validation → Multi-level approval → Finance verification → Payment on 10th/25th

**Pain points to solve**: 25-30 min manual form filling, errors, 2-week follow-ups with Finance.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | FastAPI + Python | 3.11+ |
| ORM | SQLAlchemy 2.0 (async) | 2.0.* |
| Database | Neon (Serverless PostgreSQL) | Free tier (0.5 GB) |
| Migrations | Alembic | 1.13.* |
| Auth | JWT (python-jose) + bcrypt (passlib) | - |
| Email Parsing | Python `email` + `eml-parser` | - |
| Frontend | React 18 + TypeScript + Vite | Latest |
| State/Data | TanStack Query (React Query) | v5 |
| Styling | Tailwind CSS | v3 |
| Forms | React Hook Form + Zod | - |
| Routing | React Router | v6 |
| Deployment | Render (backend) + Vercel (frontend) | Free tiers |

---

## 3. Database Schema (PostgreSQL)

### Core Tables

```sql
-- Employees (from employee_master.csv)
CREATE TABLE employees (
    emp_code        VARCHAR(20) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    designation     VARCHAR(100),
    department      VARCHAR(100),
    cost_centre     VARCHAR(20),
    city            VARCHAR(50),
    reporting_manager_code VARCHAR(20) REFERENCES employees(emp_code),
    role            VARCHAR(20) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Travel Requests
CREATE TABLE travel_requests (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_request_id       VARCHAR(30) UNIQUE NOT NULL,
    employee_id             VARCHAR(20) REFERENCES employees(emp_code),
    purpose                 TEXT NOT NULL,
    destination             VARCHAR(100) NOT NULL,
    city_tier               VARCHAR(20) NOT NULL,
    start_date              DATE NOT NULL,
    end_date                DATE NOT NULL,
    estimated_amount        DECIMAL(12,2) NOT NULL,
    advance_requested       DECIMAL(12,2) DEFAULT 0,
    status                  VARCHAR(30) DEFAULT 'draft',
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Approvals (multi-level workflow)
CREATE TABLE approvals (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_request_id       UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    approver_id             VARCHAR(20) REFERENCES employees(emp_code),
    level                   INTEGER NOT NULL,
    status                  VARCHAR(20) DEFAULT 'pending',
    remarks                 TEXT,
    decided_at              TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW()
);

-- Advances
CREATE TABLE advances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_request_id       UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    reference               VARCHAR(50) UNIQUE NOT NULL,
    amount                  DECIMAL(12,2) NOT NULL,
    disbursed_at            TIMESTAMP,
    status                  VARCHAR(20) DEFAULT 'pending',
    created_at              TIMESTAMP DEFAULT NOW()
);

-- Receipts (extracted from emails)
CREATE TABLE receipts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_request_id       UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    source_email_id         VARCHAR(100),
    merchant                VARCHAR(200),
    receipt_date            DATE,
    amount                  DECIMAL(12,2),
    category                VARCHAR(50),
    raw_text                TEXT,
    extracted_data          JSONB,
    attachment_path         VARCHAR(500),
    is_duplicate            BOOLEAN DEFAULT FALSE,
    duplicate_of            UUID REFERENCES receipts(id),
    policy_flags            JSONB,
    created_at              TIMESTAMP DEFAULT NOW()
);

-- Claims (Settlement)
CREATE TABLE claims (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    travel_request_id       UUID REFERENCES travel_requests(id) ON DELETE CASCADE,
    employee_id             VARCHAR(20) REFERENCES employees(emp_code),
    total_claimed           DECIMAL(12,2) DEFAULT 0,
    advance_adjusted        DECIMAL(12,2) DEFAULT 0,
    net_payable             DECIMAL(12,2) DEFAULT 0,
    status                  VARCHAR(30) DEFAULT 'draft',
    submitted_at            TIMESTAMP,
    finance_verified_at     TIMESTAMP,
    payment_run_date        DATE,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- Claim Line Items
CREATE TABLE claim_lines (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id                UUID REFERENCES claims(id) ON DELETE CASCADE,
    receipt_id              UUID REFERENCES receipts(id),
    category                VARCHAR(50) NOT NULL,
    claimed_amount          DECIMAL(12,2) NOT NULL,
    allowed_amount          DECIMAL(12,2) NOT NULL,
    disallowed_amount       DECIMAL(12,2) DEFAULT 0,
    disallow_reason         VARCHAR(200),
    policy_rule_ref         VARCHAR(50),
    created_at              TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id                UUID REFERENCES claims(id) ON DELETE CASCADE,
    amount                  DECIMAL(12,2) NOT NULL,
    payment_run_date        DATE NOT NULL,
    status                  VARCHAR(20) DEFAULT 'scheduled',
    processed_at            TIMESTAMP,
    created_at              TIMESTAMP DEFAULT NOW()
);
```

---

## 4. API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Email + password → JWT |
| GET | `/api/v1/auth/me` | Current user profile |

### Travel Requests
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/travel-requests` | Create travel request |
| GET | `/api/v1/travel-requests` | List (filter by status, employee) |
| GET | `/api/v1/travel-requests/{id}` | Get details |
| PUT | `/api/v1/travel-requests/{id}` | Update (draft only) |
| POST | `/api/v1/travel-requests/{id}/submit` | Submit for approval |

### Approvals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/approvals/queue` | My pending approvals |
| POST | `/api/v1/approvals/{id}/approve` | Approve |
| POST | `/api/v1/approvals/{id}/return` | Return with remarks |
| POST | `/api/v1/approvals/{id}/reject` | Reject |

### Advances
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/advances/disburse` | Finance disburses advance |
| GET | `/api/v1/advances/{travelRequestId}` | Get advance info |

### Email Ingestion
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/emails/ingest` | Upload .eml file(s) |
| POST | `/api/v1/emails/process` | Trigger processing for travel request |

### Receipts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/receipts/{travelRequestId}` | List extracted receipts |
| GET | `/api/v1/receipts/{id}` | Get receipt details |
| PUT | `/api/v1/receipts/{id}` | Manual edit (category, amount) |
| DELETE | `/api/v1/receipts/{id}` | Mark as noise/ignore |

### Claims
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/claims/generate/{travelRequestId}` | Auto-generate from receipts |
| GET | `/api/v1/claims/{id}` | Get claim with line items |
| PUT | `/api/v1/claims/{id}` | Edit line items |
| POST | `/api/v1/claims/{id}/submit` | Employee submits |
| POST | `/api/v1/claims/{id}/finance-verify` | Finance verification |

### Finance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/finance/queue` | Claims awaiting verification |
| GET | `/api/v1/finance/payment-runs` | Upcoming payment runs |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard/employee` | My requests, claims, advances |
| GET | `/api/v1/dashboard/manager` | Team approvals, advances |
| GET | `/api/v1/dashboard/finance` | Verification queue, payment runs |

---

## 5. Email Processing Pipeline

```
Raw .eml Upload
       │
       ▼
┌──────────────────┐
│  Email Parser    │
│  - Headers       │
│  - Body (text)   │
│  - Attachments   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Classifier      │
│  - travel_request│
│  - approval      │
│  - advance       │
│  - receipt       │
│  - noise         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Extractor       │
│  - Uber          │
│  - MakeMyTrip    │
│  - Hotel         │
│  - Dinner bill   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Deduplicator    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Policy Validator│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Link to TR      │
└──────────────────┘
```

---

## 6. Policy Validation Rules

### Lodging (per night, room tariff excluding taxes)
| City Class | Limit |
|------------|-------|
| Tier 1 (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Chennai, Pune, Kolkata) | ₹6,000 |
| Tier 2 | ₹4,000 |
| Tier 3 and others | ₹2,800 |

### Meals
| City Class | Limit (per full day) |
|------------|---------------------|
| Tier 1 | ₹1,500 |
| Tier 2 and below | ₹1,000 |

### Non-Reimbursable (always exclude)
- Laundry, mini-bar, in-room entertainment, spa, gym
- Personal phone/data charges
- Alcohol (except approved business entertainment)
- Fines, penalties, traffic challans
- Independent travel insurance
- Expenses by non-claimant

### Submission Rules
- Within 7 calendar days of return
- Every line needs supporting document
- Duplicate bill = policy breach
- Payment runs: 10th and 25th of each month

---

## 7. Security

- **JWT**: Access token (15 min) + Refresh token (7 days, httpOnly cookie)
- **Passwords**: bcrypt (cost=12)
- **CORS**: Restricted to frontend origin
- **Input Validation**: Pydantic on all endpoints
- **SQL Injection**: SQLAlchemy ORM (parameterized queries)

---

## 8. Deployment (Free Tier)

| Service | Config |
|---------|--------|
| **Neon** | Project → Connection string → `DATABASE_URL` |
| **Render** | Web Service → `pip install -r requirements.txt` → `uvicorn app.main:app` |
| **Vercel** | Framework: Vite → Build: `npm run build` → Output: `dist` |

---

## 9. Assumptions & Limitations (MVP)

| Area | Decision |
|------|----------|
| Email ingestion | Manual `.eml` upload (no IMAP/webhook) |
| OCR (image receipts) | Skipped — manual entry from PNG |
| Notifications | None — polling UI only |
| Payroll integration | Advance recovery flagged only |
| International travel | Not in sample data |
| Multi-currency | INR only |

---

*Generated for Nortex Take-Home Assignment — Timeboxed 48h, ~8h actual work*
