// Employee types
export interface Employee {
  emp_code: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  cost_centre: string;
  city: string;
  reporting_manager_code: string | null;
  role: string;
  created_at: string;
}

export interface EmployeeLogin {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  employee: Employee;
}

// Travel Request types
export interface TravelRequest {
  id: string;
  travel_request_id: string;
  employee_id: string;
  purpose: string;
  destination: string;
  city_tier: string;
  start_date: string;
  end_date: string;
  estimated_amount: number;
  advance_requested: number;
  status: string;
  created_at: string;
  updated_at: string;
  employee_name?: string;
  employee_city?: string;
}

export interface TravelRequestCreate {
  purpose: string;
  destination: string;
  city_tier: string;
  start_date: string;
  end_date: string;
  estimated_amount: number;
  advance_requested: number;
}

export interface TravelRequestDetail extends TravelRequest {
  approvals: Approval[];
  advance: Advance | null;
  receipt_count: number;
  claim: Claim | null;
}

// Approval types
export interface Approval {
  id: string;
  travel_request_id: string;
  approver_id: string;
  level: number;
  status: string;
  remarks: string | null;
  decided_at: string | null;
  created_at: string;
  approver_name?: string;
}

export interface ApprovalAction {
  remarks?: string;
}

// Advance types
export interface Advance {
  id: string;
  travel_request_id: string;
  reference: string;
  amount: number;
  disbursed_at: string | null;
  status: string;
  created_at: string;
}

export interface AdvanceDisburse {
  travel_request_id: string;
  amount: number;
  reference: string;
}

// Receipt types
export interface Receipt {
  id: string;
  travel_request_id: string;
  source_email_id: string | null;
  merchant: string | null;
  receipt_date: string | null;
  amount: number | null;
  category: string | null;
  raw_text: string | null;
  extracted_data: any;
  attachment_path: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  policy_flags: any;
  attendee_names: string | null;
  attendee_org: string | null;
  created_at: string;
}

export interface ReceiptUpdate {
  category?: string;
  amount?: number;
  merchant?: string;
  is_duplicate?: boolean;
  attendee_names?: string;
  attendee_org?: string;
}

// Claim types
export interface ClaimLine {
  id: string;
  claim_id: string;
  receipt_id: string | null;
  category: string;
  claimed_amount: number;
  allowed_amount: number;
  disallowed_amount: number;
  disallow_reason: string | null;
  policy_rule_ref: string | null;
  created_at: string;
  receipt?: Receipt;
}

export interface Claim {
  id: string;
  travel_request_id: string;
  employee_id: string;
  total_claimed: number;
  advance_adjusted: number;
  net_payable: number;
  status: string;
  submitted_at: string | null;
  finance_verified_at: string | null;
  payment_run_date: string | null;
  created_at: string;
  updated_at: string;
  lines: ClaimLine[];
  employee_name?: string;
  travel_request_id_ref?: string;
}

// Payment types
export interface Payment {
  id: string;
  claim_id: string;
  amount: number;
  payment_run_date: string;
  status: string;
  processed_at: string | null;
  created_at: string;
}

// Dashboard types
export interface EmployeeDashboard {
  employee: Employee;
  travel_requests: TravelRequest[];
  claims: Claim[];
  advances: Advance[];
  stats: {
    total_requests: number;
    pending_approvals: number;
    total_claimed: number;
    total_advance: number;
  };
}

export interface ManagerDashboard {
  pending_approvals: Approval[];
  team_requests: TravelRequest[];
  stats: {
    pending_count: number;
    team_request_count: number;
  };
}

export interface FinanceDashboard {
  pending_verification: Claim[];
  ready_for_payment: Claim[];
  stats: {
    pending_count: number;
    pending_amount: number;
    payment_count: number;
    payment_amount: number;
  };
}
