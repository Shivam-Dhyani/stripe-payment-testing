import api from './api';
import { CancellationRequest } from '../types';

export const cancellationService = {
  create: async (data: { order_id: string; reason: string }): Promise<CancellationRequest> => {
    const response = await api.post('/cancellation-requests', data);
    return response.data;
  },

  getAll: async (): Promise<CancellationRequest[]> => {
    const response = await api.get('/cancellation-requests');
    return response.data;
  },

  getById: async (id: string): Promise<CancellationRequest> => {
    const response = await api.get(`/cancellation-requests/${id}`);
    return response.data;
  },

  resolve: async (id: string, data: { status: string; admin_notes?: string }): Promise<CancellationRequest> => {
    const response = await api.put(`/cancellation-requests/${id}/resolve`, data);
    return response.data;
  },

  getPendingCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/cancellation-requests/pending/count');
    return response.data;
  },
};
