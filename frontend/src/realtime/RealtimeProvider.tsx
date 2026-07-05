import { createContext, useCallback, useContext, useEffect, useRef, ReactNode } from 'react';
import { useAppSelector } from '../hooks/useAppSelector';

export interface RealtimeMessage {
  type: string;
  order_id?: string;
  return_id?: string;
  status?: string;
}

type Listener = (msg: RealtimeMessage) => void;

const RealtimeContext = createContext<{ subscribe: (l: Listener) => () => void }>({
  subscribe: () => () => {},
});

function wsUrl(token: string): string {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const base = api.replace(/^http/, 'ws'); // http->ws, https->wss
  return `${base}/ws?token=${encodeURIComponent(token)}`;
}

/**
 * Opens a single authenticated WebSocket and fans messages out to subscribers.
 * Auto-reconnects with backoff while logged in; closes on logout. Pages use
 * `useRealtime()` to refetch on events instead of polling on a timer.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAppSelector((s) => s.auth);
  const listeners = useRef<Set<Listener>>(new Set());

  const subscribe = useCallback((l: Listener) => {
    listeners.current.add(l);
    return () => {
      listeners.current.delete(l);
    };
  }, []);

  useEffect(() => {
    if (!token || !user) return;

    let closedByUs = false;
    let attempts = 0;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(wsUrl(token));
      ws.onopen = () => { attempts = 0; };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as RealtimeMessage;
          listeners.current.forEach((l) => l(data));
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        if (closedByUs) return;
        attempts += 1;
        const delay = Math.min(30000, 1000 * 2 ** attempts);
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => { ws?.close(); };
    };
    connect();

    return () => {
      closedByUs = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [token, user]);

  return <RealtimeContext.Provider value={{ subscribe }}>{children}</RealtimeContext.Provider>;
}

/** Register a handler for real-time messages (auto-unsubscribes on unmount). */
export function useRealtime(handler: Listener) {
  const { subscribe } = useContext(RealtimeContext);
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((msg) => ref.current(msg)), [subscribe]);
}
