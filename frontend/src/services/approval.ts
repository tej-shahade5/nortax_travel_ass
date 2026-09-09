import api from './api';
import { Approval, ApprovalAction } from '../types';

export const approvalApi = {
  getQueue: async (): Promise<Approval[]> => {
    const response = await api.get<Approval[]>('/approvals/queue');
    return response.data;
  },

  approve: async (id: string): Promise<void> => {
    await api.post(`/approvals/${id}/approve`);
  },

  return: async (id: string, data: ApprovalAction): Promise<void> => {
    await api.post(`/approvals/${id}/return`, data);
  },

  reject: async (id: string, data: ApprovalAction): Promise<void> => {
    await api.post(`/approvals/${id}/reject`, data);
  },
};
