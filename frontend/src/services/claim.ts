import api from './api';
import { Claim } from '../types';

export const claimApi = {
  generate: async (travelRequestId: string): Promise<Claim> => {
    const response = await api.post<Claim>(`/claims/generate/${travelRequestId}`);
    return response.data;
  },

  get: async (id: string): Promise<Claim> => {
    const response = await api.get<Claim>(`/claims/${id}`);
    return response.data;
  },

  submit: async (id: string): Promise<void> => {
    await api.post(`/claims/${id}/submit`);
  },

  financeVerify: async (id: string): Promise<void> => {
    await api.post(`/claims/${id}/finance-verify`);
  },
};
