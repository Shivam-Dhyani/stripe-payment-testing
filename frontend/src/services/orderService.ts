import api from './api';
import { Order } from '../types';

export const orderService = {
  checkout: async (addressId: string): Promise<{ order_id: string; total: number; client_secret: string; payment_intent_id: string }> => {
    const response = await api.post('/orders/checkout', { address_id: addressId });
    return response.data;
  },

  confirmPayment: async (orderId: string, paymentIntentId: string): Promise<Order> => {
    const response = await api.post(`/orders/${orderId}/confirm`, {
      payment_intent_id: paymentIntentId,
    });
    return response.data;
  },

  getOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },

  getAllOrders: async (): Promise<Order[]> => {
    const response = await api.get('/orders/all');
    return response.data;
  },

  reportPaymentFailure: async (data: {
    order_id: string;
    error_code?: string;
    error_message: string;
    decline_code?: string;
  }): Promise<void> => {
    await api.post('/orders/payment-failed', data);
  },
};
