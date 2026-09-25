import api from './api';
import { Product, PaginatedResponse, ProductFilters, ProductVariant } from '../types';

/** Body accepted by the variant create/update endpoints (update takes it partially). */
export interface VariantPayload {
  sku?: string | null;
  option_values?: Record<string, string> | null;
  price?: number;
  mrp?: number | null;
  stock?: number;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

/** Create requires at least a price; everything else falls back to backend defaults. */
export type VariantCreatePayload = VariantPayload & { price: number };

export const productService = {
  getAll: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const response = await api.get('/products', { params: filters });
    return response.data;
  },

  getById: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (data: Partial<Product>): Promise<Product> => {
    const response = await api.post('/products', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  generateImage: async (name: string, category?: string): Promise<{ image_url: string }> => {
    const response = await api.post('/products/generate-image', { name, category });
    return response.data;
  },

  listVariants: async (productId: string): Promise<ProductVariant[]> => {
    const response = await api.get(`/products/${productId}/variants`);
    return response.data;
  },

  createVariant: async (productId: string, data: VariantCreatePayload): Promise<ProductVariant> => {
    const response = await api.post(`/products/${productId}/variants`, data);
    return response.data;
  },

  updateVariant: async (productId: string, variantId: string, data: VariantPayload): Promise<ProductVariant> => {
    const response = await api.put(`/products/${productId}/variants/${variantId}`, data);
    return response.data;
  },

  deleteVariant: async (productId: string, variantId: string): Promise<void> => {
    await api.delete(`/products/${productId}/variants/${variantId}`);
  },
};
