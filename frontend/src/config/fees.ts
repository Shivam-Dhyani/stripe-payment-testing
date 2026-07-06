import { StoreSettings } from '../types';

// Fallback used before the admin-configured settings load from the backend.
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  delivery_fee: 25,
  free_delivery_threshold: 199,
  small_cart_fee: 15,
  small_cart_threshold: 99,
  tax_percent: 5,
};

/** Delivery + small-cart handling fee for a subtotal, per store settings. */
export function computeDeliveryFee(subtotal: number, s: StoreSettings): number {
  let fee = 0;
  if (subtotal < s.free_delivery_threshold) fee += Number(s.delivery_fee);
  if (subtotal < s.small_cart_threshold) fee += Number(s.small_cart_fee);
  return fee;
}

/** Tax on the item subtotal (2-decimal), per store settings. */
export function computeTax(subtotal: number, s: StoreSettings): number {
  return Math.round(subtotal * Number(s.tax_percent)) / 100;
}

/** How much more to add to unlock free delivery (0 once reached). */
export function amountToFreeDelivery(subtotal: number, s: StoreSettings): number {
  return Math.max(0, Number(s.free_delivery_threshold) - subtotal);
}
