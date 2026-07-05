import { parseUTC } from './date';

// Quick-commerce delivery promise, in minutes.
export const PROMISE_MINUTES = 10;

const TERMINAL = ['delivered', 'cancelled', 'refunded'];

/** Minutes left against the delivery promise (rounded up, never negative). */
export function remainingMinutes(createdAt: string, nowMs: number): number {
  const promised = parseUTC(createdAt).getTime() + PROMISE_MINUTES * 60000;
  return Math.max(0, Math.ceil((promised - nowMs) / 60000));
}

/**
 * Friendly, approximate ETA text for an in-progress order — deliberately NOT a
 * ticking mm:ss. Returns null for terminal orders (delivered/cancelled).
 */
export function etaText(order: { status: string; created_at: string }, nowMs: number): string | null {
  if (TERMINAL.includes(order.status)) return null;
  const mins = remainingMinutes(order.created_at, nowMs);
  if (mins <= 0) return 'Arriving any moment';
  if (mins === 1) return 'About 1 minute remaining';
  return `About ${mins} minutes remaining`;
}
