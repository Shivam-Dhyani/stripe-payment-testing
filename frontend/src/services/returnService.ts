import api from './api';
import { ReturnRequest } from '../types';

export const returnService = {
  create: async (data: {
    order_id: string;
    reason: string;
    items: { order_item_id: string; quantity: number }[];
  }): Promise<ReturnRequest> => {
    const response = await api.post('/return-requests', data);
    return response.data;
  },

  getAll: async (): Promise<ReturnRequest[]> => {
    const response = await api.get('/return-requests');
    return response.data;
  },

  getById: async (id: string): Promise<ReturnRequest> => {
    const response = await api.get(`/return-requests/${id}`);
    return response.data;
  },

  resolve: async (id: string, data: {
    status: string;
    admin_notes?: string;
    pickup_date?: string;
    pickup_address?: string;
  }): Promise<ReturnRequest> => {
    const response = await api.put(`/return-requests/${id}/resolve`, data);
    return response.data;
  },

  getPendingCount: async (): Promise<{ count: number }> => {
    const response = await api.get('/return-requests/pending/count');
    return response.data;
  },

  // Customer-driven actions
  schedulePickup: async (id: string, data: { pickup_date: string; pickup_address?: string }): Promise<ReturnRequest> => {
    const response = await api.post(`/return-requests/${id}/schedule-pickup`, data);
    return response.data;
  },

  confirmHandover: async (id: string): Promise<ReturnRequest> => {
    const response = await api.post(`/return-requests/${id}/confirm-handover`);
    return response.data;
  },

  withdraw: async (id: string): Promise<ReturnRequest> => {
    const response = await api.post(`/return-requests/${id}/withdraw`);
    return response.data;
  },
};
