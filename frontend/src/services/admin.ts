import api from './api';

export interface AdminStats {
  total_employees: number;
  total_travel_requests: number;
  requests_by_status: Record<string, number>;
  total_claims: number;
  total_estimated: number;
  total_claimed: number;
  total_paid: number;
  pending_approvals: number;
  pending_claims: number;
}

export interface AdminTravelRequest {
  id: string;
  travel_request_id: string;
  employee_id: string;
  employee_name: string;
  employee_department: string;
  purpose: string;
  destination: string;
  city_tier: string;
  start_date: string;
  end_date: string;
  estimated_amount: number;
  advance_requested: number;
  status: string;
  receipt_count: number;
  created_at: string;
}

export interface AdminClaim {
  id: string;
  employee_id: string;
  employee_name: string;
  travel_request_id: string;
  total_claimed: number;
  advance_adjusted: number;
  net_payable: number;
  status: string;
  submitted_at: string | null;
  finance_verified_at: string | null;
  payment_run_date: string | null;
  created_at: string;
}

export interface AdminApproval {
  id: string;
  travel_request_id: string;
  request_employee_name: string;
  approver_id: string;
  approver_name: string;
  level: number;
  status: string;
  remarks: string | null;
  decided_at: string | null;
  created_at: string;
}

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get<AdminStats>('/admin/stats');
    return response.data;
  },

  getEmployees: async () => {
    const response = await api.get('/admin/employees');
    return response.data;
  },

  getTravelRequests: async (status?: string, employeeId?: string): Promise<AdminTravelRequest[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (employeeId) params.append('employee_id', employeeId);
    const response = await api.get<AdminTravelRequest[]>(`/admin/travel-requests?${params.toString()}`);
    return response.data;
  },

  getClaims: async (status?: string): Promise<AdminClaim[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await api.get<AdminClaim[]>(`/admin/claims?${params.toString()}`);
    return response.data;
  },

  getApprovals: async (status?: string): Promise<AdminApproval[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    const response = await api.get<AdminApproval[]>(`/admin/approvals?${params.toString()}`);
    return response.data;
  },

  batchIngestEmails: async (travelRequestId: string, files: File[]) => {
    const formData = new FormData();
    formData.append('travel_request_id', travelRequestId);
    for (const file of files) {
      formData.append('files', file);
    }
    const response = await api.post('/emails/batch-ingest', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  approveApproval: async (id: string): Promise<void> => {
    await api.post(`/approvals/${id}/approve`);
  },

  returnApproval: async (id: string, remarks: string): Promise<void> => {
    await api.post(`/approvals/${id}/return`, { remarks });
  },

  rejectApproval: async (id: string, remarks: string): Promise<void> => {
    await api.post(`/approvals/${id}/reject`, { remarks });
  },

  processClaim: async (claimId: string): Promise<void> => {
    await api.post(`/finance/process-payment/${claimId}`);
  },
};
