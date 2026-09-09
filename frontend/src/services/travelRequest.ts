import api from './api';
import { TravelRequest, TravelRequestCreate, TravelRequestDetail } from '../types';

export const travelRequestApi = {
  create: async (data: TravelRequestCreate): Promise<TravelRequest> => {
    const response = await api.post<TravelRequest>('/travel-requests', data);
    return response.data;
  },

  list: async (status?: string, employeeId?: string): Promise<TravelRequest[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (employeeId) params.append('employee_id', employeeId);
    const response = await api.get<TravelRequest[]>(`/travel-requests?${params.toString()}`);
    return response.data;
  },

  get: async (id: string): Promise<TravelRequestDetail> => {
    const response = await api.get<TravelRequestDetail>(`/travel-requests/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<TravelRequestCreate>): Promise<TravelRequest> => {
    const response = await api.put<TravelRequest>(`/travel-requests/${id}`, data);
    return response.data;
  },

  submit: async (id: string): Promise<void> => {
    await api.post(`/travel-requests/${id}/submit`);
  },
};
