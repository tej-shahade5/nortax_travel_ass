# Nortex Travel Expense Reimbursement System

A full-stack application to automate the end-to-end travel expense workflow for Nortex Industries.

## Features

- **Travel Request Management**: Create, submit, and track travel requests
- **Multi-Level Approval Workflow**: Configurable approval chain based on amount
- **Email Ingestion**: Upload .eml files to automatically extract receipt data
- **Policy Validation**: Automatic validation against company expense policy
- **Claim Generation**: Auto-generate settlement claims from receipts
- **Finance Verification**: Finance queue for claim verification and payment scheduling
- **Role-Based Dashboards**: Different views for Employees, Managers, and Finance

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL (Neon)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Database**: Neon (Serverless PostgreSQL)
- **Auth**: JWT (python-jose) + bcrypt

## Project Structure

```
expense_reimbursement_takehome/
├── ARCHITECTURE.md          # Architecture documentation
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py        # Settings
│   │   ├── database.py      # SQLAlchemy setup
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── api/             # API routes
│   │   └── utils/           # Helpers
│   ├── scripts/             # Seed scripts
│   ├── requirements.txt
│   └── .env.example
├── frontend/                # React application
│   ├── src/
│   │   ├── App.tsx          # Main app with routing
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable components
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript types
│   │   └── contexts/        # React contexts
│   ├── package.json
│   └── .env.example
└── pack/                    # Requirement files
    ├── PROBLEM_STATEMENT.md
    ├── expense_policy.md
    ├── employee_master.csv
    ├── sample_emails/
    └── receipts/
```

## Quick Start

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Neon DATABASE_URL and JWT_SECRET
   ```

5. Seed employees:
   ```bash
   python -m scripts.seed_employees
   ```

6. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173

### Demo Credentials

Use employee codes as passwords:
- **Employee**: chaitanya.reddy@nortexindustries.com / NX-4471
- **Manager**: suresh.iyer@nortexindustries.com / NX-2210
- **Finance**: ravi.menon@nortexindustries.com / NX-3305

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deployment

### Backend (Render)
1. Connect your GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables: DATABASE_URL, JWT_SECRET

### Frontend (Vercel)
1. Connect your GitHub repository
2. Framework: Vite
3. Build command: `npm run build`
4. Output directory: `dist`

## Policy Rules Implemented

- Lodging limits by city tier (Tier 1: ₹6,000, Tier 2: ₹4,000, Tier 3: ₹2,800)
- Meal limits by city tier (Tier 1: ₹1,500, Tier 2: ₹1,000)
- Non-reimbursable items (laundry, mini-bar, etc.)
- Approval matrix based on claim amount
- 7-day submission deadline
- Payment runs on 10th and 25th of month

## Known Limitations (MVP)

- OCR for image receipts not implemented (manual entry required)
- Email ingestion via manual .eml upload only
- No real-time notifications
- No audit logging
- Single currency (INR) only

## License

Internal use only - Nortex Industries














Step 1: Deploy Backend on Render
1. Go to render.com (https://render.com) → New → Web Service
2. Connect your GitHub repo: tej-shahade5/nortax_travel_ass
3. Settings:
- Name: nortex-travel-api
- Runtime: Python
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
4. Add Environment Variables:
Key	Value
DATABASE_URL	Your Neon connection string (from earlier)
JWT_SECRET	Any random string (e.g. my-super-secret-key-123)
CORS_ORIGINS	https://your-netlify-url.netlify.app (fill after Step 2)
5. Click Create Web Service → Copy the URL (e.g. https://nortex-travel-api.onrender.com)



Step 2: Deploy Frontend on Netlify
1. Go to netlify.com (https://netlify.com) → Add new site → Import an existing project
2. Connect your GitHub repo: tej-shahade5/nortax_travel_ass
3. Settings:
- Base directory: frontend
- Build command: npm run build
- Publish directory: dist
4. Add Environment variable:
Key	Value
VITE_API_URL	https://nortex-travel-api.onrender.com/api/v1 (your Render URL)
5. Click Deploy site
Step 3: Update CORS on Render
After Netlify gives you a URL, go back to Render → Environment → Edit → Update CORS_ORIGINS to your Netlify URL, then redeploy.
Login credentials (same as before):
- Admin: admin@nortexindustries.com / NX-0001
- Employee: chaitanya.reddy@nortexindustries.com / NX-4471