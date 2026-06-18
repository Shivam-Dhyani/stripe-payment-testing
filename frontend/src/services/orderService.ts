import api from './api';
import { Order } from '../types';

export const orderService = {
  checkout: async (addressId: number): Promise<{ order: Order; client_secret: string }> => {
    const response = await api.post('/orders/checkout', { address_id: addressId });
    return response.data;
  },

  confirmPayment: async (orderId: number, paymentIntentId: string): Promise<Order> => {
    const response = await api.post(`/orders/${orderId}/confirm`, {
      payment_intent_id: paymentIntentId,
    });
    return response.data;
  },

  getOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOrderById: async (id: number): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id: number, status: string): Promise<Order> => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },

  getAllOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders/all');
    return response.data;
  },
};
