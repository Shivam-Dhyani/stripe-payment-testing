export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'customer' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_default: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  sub_categories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  sub_category_id: string;
  name: string;
  description: string;
  price: number | string;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  sub_category?: SubCategory & { category?: Category };
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  address_snapshot: Record<string, string>;
  total: number | string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  stripe_payment_intent_id: string | null;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number | string;
  quantity: number;
}

export interface DashboardStats {
  total_revenue: number | string;
  total_orders: number;
  total_products: number;
  total_customers: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ProductFilters {
  page?: number;
  size?: number;
  category_id?: string;
  sub_category_id?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  min_price?: number;
  max_price?: number;
  include_inactive?: boolean;
}

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface TopProduct {
  name: string;
  total_sold: number;
}

export interface CategoryDistribution {
  name: string;
  value: number;
}

export interface OrderTrend {
  date: string;
  orders: number;
}
