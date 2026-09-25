import { CartItem } from '../types';

/**
 * Effective values for a cart line. The backend sends variant-aware
 * `unit_price` / `available_stock` / `image_url`; these helpers fall back to
 * the product for guest-cart lines built client-side.
 */
export function lineUnitPrice(item: CartItem): number {
  if (item.unit_price != null) return Number(item.unit_price);
  return Number(item.product?.price ?? 0);
}

export function lineStock(item: CartItem): number {
  if (item.available_stock != null) return Number(item.available_stock);
  return Number(item.product?.stock ?? 0);
}

export function lineImage(item: CartItem): string | null {
  return item.image_url ?? item.product?.image_url ?? null;
}

export function lineTotal(item: CartItem): number {
  return lineUnitPrice(item) * item.quantity;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + lineTotal(i), 0);
}
