// Delivery / handling fees — MUST match backend app/config.py + services/fees.py.
export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_THRESHOLD = 199;
export const SMALL_CART_FEE = 15;
export const SMALL_CART_THRESHOLD = 99;

/** Delivery + small-cart handling fee for an item subtotal. */
export function computeDeliveryFee(subtotal: number): number {
  let fee = 0;
  if (subtotal < FREE_DELIVERY_THRESHOLD) fee += DELIVERY_FEE;
  if (subtotal < SMALL_CART_THRESHOLD) fee += SMALL_CART_FEE;
  return fee;
}

/** How much more the shopper must add to unlock free delivery (0 once reached). */
export function amountToFreeDelivery(subtotal: number): number {
  return Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
}
