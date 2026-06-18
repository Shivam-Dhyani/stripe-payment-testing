import api from './api';
import { Category, SubCategory } from '../types';

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    const response = await api.get('/categories');
    return response.data;
  },

  getById: async (id: string): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  create: async (data: Partial<Category>): Promise<Category> => {
    const response = await api.post('/categories', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Category>): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },

  getSubCategories: async (categoryId?: string): Promise<SubCategory[]> => {
    const params = categoryId ? { category_id: categoryId } : {};
    const response = await api.get('/subcategories', { params });
    return response.data;
  },

  getSubCategoryById: async (id: string): Promise<SubCategory> => {
    const response = await api.get(`/subcategories/${id}`);
    return response.data;
  },

  createSubCategory: async (data: Partial<SubCategory>): Promise<SubCategory> => {
    const response = await api.post('/subcategories', data);
    return response.data;
  },

  updateSubCategory: async (id: string, data: Partial<SubCategory>): Promise<SubCategory> => {
    const response = await api.put(`/subcategories/${id}`, data);
    return response.data;
  },

  deleteSubCategory: async (id: string): Promise<void> => {
    await api.delete(`/subcategories/${id}`);
  },
};
