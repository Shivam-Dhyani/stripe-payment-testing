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
  is_returnable: boolean;
  return_window_days: number | null;
  sub_category?: SubCategory & { category?: Category };
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface PaymentEvent {
  id: string;
  order_id: string;
  event_type: 'created' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
  message: string | null;
  event_data: Record<string, any> | null;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  address_snapshot: Record<string, string>;
  total: number | string;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  stripe_payment_intent_id: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  items?: OrderItem[];
  payment_events?: PaymentEvent[];
  status_history?: OrderStatusHistory[];
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

export interface CancellationRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  resolved_by: string | null;
  resolver_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  order_total: number | null;
  order_status: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface ReturnRequestItem {
  id: string;
  order_item_id: string;
  quantity: number;
  product_name: string | null;
  product_price: number | null;
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'pickup_scheduled' | 'received' | 'refunded';
  admin_notes: string | null;
  pickup_date: string | null;
  pickup_address: string | null;
  refund_amount: number | null;
  resolved_by: string | null;
  resolver_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  order_total: number | null;
  order_status: string | null;
  created_at: string;
  updated_at: string;
  items: ReturnRequestItem[];
}

export interface AdminCartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  quantity: number;
  stock: number;
  created_at: string;
}

export interface AdminCartUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  cart_items: AdminCartItem[];
  total_items: number;
  cart_total: number;
}
