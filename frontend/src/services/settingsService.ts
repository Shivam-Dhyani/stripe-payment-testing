import api from './api';
import { StoreSettings } from '../types';

export const settingsService = {
  get: async (): Promise<StoreSettings> => {
    const res = await api.get('/settings');
    return res.data;
  },
  update: async (data: Partial<StoreSettings>): Promise<StoreSettings> => {
    const res = await api.put('/settings', data);
    return res.data;
  },
};
