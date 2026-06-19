import api from './api';
import { AdminCartUser } from '../types';

export const adminCartService = {
  getAllCarts: async (): Promise<AdminCartUser[]> => {
    const response = await api.get('/cart/admin/all');
    return response.data;
  },
};
