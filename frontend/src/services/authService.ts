import api from './api';
import { LoginCredentials, RegisterData, TokenResponse, User, Address } from '../types';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const response = await api.post('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    return response.data;
  },

  register: async (data: RegisterData): Promise<User> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/auth/me', data);
    return response.data;
  },

  getAddresses: async (): Promise<Address[]> => {
    const response = await api.get('/addresses');
    return response.data;
  },

  addAddress: async (data: Omit<Address, 'id' | 'user_id'>): Promise<Address> => {
    const response = await api.post('/addresses', data);
    return response.data;
  },

  updateAddress: async (id: string, data: Partial<Address>): Promise<Address> => {
    const response = await api.put(`/addresses/${id}`, data);
    return response.data;
  },

  deleteAddress: async (id: string): Promise<void> => {
    await api.delete(`/addresses/${id}`);
  },
};
