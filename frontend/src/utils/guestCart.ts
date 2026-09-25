import { CartItem, Product, ProductVariant } from '../types';

// A cart for logged-out visitors, kept in localStorage and merged into the
// server cart on login. Guest item id === product_id for simple updates.
const KEY = 'guest_cart';

export function getGuestCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function guestAdd(product: Product, qty: number, variant?: ProductVariant | null): CartItem[] {
  const items = getGuestCart();
  // Line identity is product + variant, so different options stay separate.
  const lineId = variant ? `${product.id}::${variant.id}` : product.id;
  const idx = items.findIndex((i) => i.id === lineId);
  if (idx >= 0) {
    items[idx].quantity += qty;
    items[idx].product = product;
  } else {
    items.push({
      id: lineId,
      user_id: 'guest',
      product_id: product.id,
      variant_id: variant?.id ?? null,
      variant_label: variant?.label ?? null,
      unit_price: Number(variant ? variant.price : product.price),
      available_stock: Number(variant ? variant.stock : product.stock),
      image_url: variant?.image_url ?? product.image_url ?? null,
      quantity: qty,
      product,
    });
  }
  save(items);
  return items;
}

export function guestUpdate(itemId: string, qty: number): CartItem[] {
  let items = getGuestCart();
  if (qty <= 0) {
    items = items.filter((i) => i.id !== itemId);
  } else {
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx >= 0) items[idx].quantity = qty;
  }
  save(items);
  return items;
}

export function guestRemove(itemId: string): CartItem[] {
  const items = getGuestCart().filter((i) => i.id !== itemId);
  save(items);
  return items;
}

export function clearGuestCart() {
  localStorage.removeItem(KEY);
}
