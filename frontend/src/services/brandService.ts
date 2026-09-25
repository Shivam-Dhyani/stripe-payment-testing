import api from './api';
import { Brand } from '../types';

export const brandService = {
  getAll: async (includeInactive = false): Promise<Brand[]> => {
    const res = await api.get('/brands', { params: { include_inactive: includeInactive } });
    return res.data;
  },
  create: async (data: { name: string; description?: string; logo_url?: string }): Promise<Brand> => {
    const res = await api.post('/brands', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Brand>): Promise<Brand> => {
    const res = await api.put(`/brands/${id}`, data);
    return res.data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/brands/${id}`);
  },
};
