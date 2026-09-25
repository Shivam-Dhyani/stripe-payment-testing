import api from './api';
import { CartItem } from '../types';

export const cartService = {
  getCart: async (): Promise<CartItem[]> => {
    const response = await api.get('/cart');
    return response.data;
  },

  addItem: async (productId: string, quantity: number, variantId?: string | null): Promise<CartItem> => {
    const response = await api.post('/cart', { product_id: productId, quantity, variant_id: variantId ?? null });
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
