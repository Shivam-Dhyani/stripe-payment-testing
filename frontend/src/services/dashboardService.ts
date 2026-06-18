import api from './api';
import { DashboardStats, RevenueData, TopProduct, CategoryDistribution, OrderTrend, Order } from '../types';

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getRevenueChart: async (): Promise<RevenueData[]> => {
    const response = await api.get('/dashboard/revenue');
    return response.data;
  },

  getTopProducts: async (): Promise<TopProduct[]> => {
    const response = await api.get('/dashboard/top-products');
    return response.data;
  },

  getRecentOrders: async (): Promise<Order[]> => {
    const response = await api.get('/dashboard/recent-orders');
    return response.data;
  },

  getCategoryDistribution: async (): Promise<CategoryDistribution[]> => {
    const response = await api.get('/dashboard/category-distribution');
    return response.data;
  },

  getOrderTrends: async (): Promise<OrderTrend[]> => {
    const response = await api.get('/dashboard/order-trends');
    return response.data;
  },
};
