import api from './api';
import { Warehouse, User } from '../types';

export const warehouseService = {
  getAll: async (activeOnly = false): Promise<Warehouse[]> => {
    const response = await api.get('/warehouses', { params: { active_only: activeOnly } });
    return response.data;
  },

  create: async (data: Partial<Warehouse>): Promise<Warehouse> => {
    const response = await api.post('/warehouses', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Warehouse>): Promise<Warehouse> => {
    const response = await api.put(`/warehouses/${id}`, data);
    return response.data;
  },

  remove: async (id: string): Promise<{ status: string; message?: string }> => {
    const response = await api.delete(`/warehouses/${id}`);
    return response.data;
  },
};

export const staffService = {
  getByRole: async (role: string): Promise<User[]> => {
    const response = await api.get('/auth/users', { params: { role } });
    return response.data;
  },

  createStaff: async (data: { email: string; password: string; first_name?: string; last_name?: string; role: string }): Promise<User> => {
    const response = await api.post('/auth/staff', data);
    return response.data;
  },
};
