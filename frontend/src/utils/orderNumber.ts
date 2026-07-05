/** Human-friendly order label, e.g. "ZP-1042" (falls back to a short id). */
export function formatOrderNo(order: { order_number?: number | null; id: string }): string {
  return order.order_number ? `ZP-${order.order_number}` : `#${order.id.substring(0, 8)}`;
}
