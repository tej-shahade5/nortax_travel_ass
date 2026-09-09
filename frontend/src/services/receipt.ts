import api from './api';
import { Receipt, ReceiptUpdate } from '../types';

export const receiptApi = {
  list: async (travelRequestId: string): Promise<Receipt[]> => {
    const response = await api.get<Receipt[]>(`/receipts/${travelRequestId}`);
    return response.data;
  },

  get: async (id: string): Promise<Receipt> => {
    const response = await api.get<Receipt>(`/receipts/detail/${id}`);
    return response.data;
  },

  update: async (id: string, data: ReceiptUpdate): Promise<Receipt> => {
    const response = await api.put<Receipt>(`/receipts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/receipts/${id}`);
  },

  ingestEmail: async (file: File, travelRequestId?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    if (travelRequestId) {
      formData.append('travel_request_id', travelRequestId);
    }
    const response = await api.post('/emails/ingest', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
