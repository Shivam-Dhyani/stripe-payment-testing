import api from './api';
import { CartItem } from '../types';

export const cartService = {
  getCart: async (): Promise<CartItem[]> => {
    const response = await api.get('/cart');
    return response.data;
  },

  addItem: async (productId: string, quantity: number): Promise<CartItem> => {
    const response = await api.post('/cart', { product_id: productId, quantity });
    return response.data;
  },

  updateItem: async (itemId: string, quantity: number): Promise<CartItem> => {
    const response = await api.put(`/cart/${itemId}`, { quantity });
    return response.data;
  },

  removeItem: async (itemId: string): Promise<void> => {
    await api.delete(`/cart/${itemId}`);
  },

  clearCart: async (): Promise<void> => {
    await api.delete('/cart');
  },
};
