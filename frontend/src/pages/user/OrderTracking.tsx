import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2, Package, PackageCheck, ShoppingBag, Bike, MapPin,
  ArrowLeft, XCircle, Clock, Zap,
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import { Order, OrderStatusHistory } from '../../types';
import { parseUTC, formatShortDateTime } from '../../utils/date';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PROMISE_MINUTES = 10;
const POLL_MS = 12000;

const STEPS = [
  { key: 'placed', label: 'Order placed', sub: 'We’ve received your order', icon: ShoppingBag },
  { key: 'accepted', label: 'Accepted', sub: 'Store confirmed your order', icon: CheckCircle2 },
  { key: 'picking', label: 'Picking items', sub: 'Your items are being collected', icon: Package },
  { key: 'packed', label: 'Packed', sub: 'Ready to dispatch', icon: PackageCheck },
  { key: 'out_for_delivery', label: 'Out for delivery', sub: 'Your rider is on the way', icon: Bike },
  { key: 'delivered', label: 'Delivered', sub: 'Enjoy your order!', icon: CheckCircle2 },
];
const ORDER = STEPS.map((s) => s.key);
const TERMINAL = ['delivered', 'cancelled', 'refunded'];

const fmtCountdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const OrderTracking = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await orderService.getOrderById(id);
      setOrder(data);
      return data;
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial load.
  useEffect(() => { load(); }, [load]);

  // Poll while the order is still in progress; stop once terminal.
  useEffect(() => {
    if (!order) return;
    if (TERMINAL.includes(order.status)) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(load, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [order, load]);

  // 1s tick to drive the ETA countdown.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Order not found.</p>
        <Link to="/orders" className="mt-4 inline-block text-brand-600 font-semibold">Back to orders</Link>
      </div>
    );
  }

  const history = order.status_history || [];
  const dateMap: Record<string, string> = {};
  history.forEach((h: OrderStatusHistory) => {
    if (!dateMap[h.to_status]) dateMap[h.to_status] = h.created_at;
  });
  if (!dateMap['placed']) dateMap['placed'] = order.created_at;

  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const isDelivered = order.status === 'delivered';
  const currentIdx = ORDER.indexOf(order.status);

  const placedAt = parseUTC(order.created_at);
  const promisedAt = new Date(placedAt.getTime() + PROMISE_MINUTES * 60000);
  const remainingMs = promisedAt.getTime() - now;

  // Delivered duration (minutes) if we have the delivered timestamp.
  let deliveredMins: number | null = null;
  if (isDelivered && dateMap['delivered']) {
    deliveredMins = Math.max(1, Math.round((parseUTC(dateMap['delivered']).getTime() - placedAt.getTime()) / 60000));
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> My Orders
      </Link>

      {/* ETA hero */}
      <section
        className={`relative overflow-hidden rounded-3xl px-6 py-7 text-white ${
          isCancelled ? 'bg-error-600' : isDelivered ? 'bg-brand-600' : ''
        }`}
        style={!isCancelled && !isDelivered
          ? { background: 'linear-gradient(105deg, #f4b400 0%, #0c9f4f 100%)' }
          : undefined}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide opacity-90">
            Order #{order.id.substring(0, 8)}
          </span>
          {!TERMINAL.includes(order.status) && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              Live
            </span>
          )}
        </div>

        {isCancelled ? (
          <div className="mt-3">
            <XCircle className="w-8 h-8 mb-1" />
            <h1 className="text-2xl font-extrabold">Order {order.status === 'refunded' ? 'refunded' : 'cancelled'}</h1>
            <p className="text-sm opacity-90 mt-1">This order is no longer being delivered.</p>
          </div>
        ) : isDelivered ? (
          <div className="mt-3">
            <CheckCircle2 className="w-8 h-8 mb-1" />
            <h1 className="text-2xl font-extrabold">Delivered</h1>
            <p className="text-sm opacity-90 mt-1">
              {deliveredMins ? `Delivered in ${deliveredMins} min · ` : ''}Thanks for shopping with us!
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm font-medium opacity-90 flex items-center gap-1.5">
              <Zap className="w-4 h-4" fill="currentColor" strokeWidth={0} />
              {order.status === 'out_for_delivery' ? 'Arriving in' : 'Estimated arrival'}
            </p>
            <h1 className="text-5xl font-extrabold tabular-nums mt-1">
              {remainingMs > 0 ? fmtCountdown(remainingMs) : 'Any moment'}
              {remainingMs > 0 && <span className="text-xl font-bold ml-1">min</span>}
            </h1>
            <p className="text-sm opacity-90 mt-1">
              {order.status === 'out_for_delivery'
                ? 'Your rider is on the way to your door.'
                : 'Your order is being prepared at the store.'}
            </p>
          </div>
        )}
      </section>

      {/* Status stepper */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <ol className="relative">
          {STEPS.map((step, i) => {
            const reached = !isCancelled && currentIdx >= i;
            const isCurrent = !isCancelled && order.status === step.key;
            const at = dateMap[step.key];
            const Icon = step.icon;
            const last = i === STEPS.length - 1;
            return (
              <li key={step.key} className="flex gap-4 pb-6 last:pb-0">
                {/* rail */}
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-colors ${
                    reached ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-brand-500/20' : ''}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  {!last && <div className={`w-0.5 flex-1 mt-1 ${reached && currentIdx > i ? 'bg-brand-500' : 'bg-gray-200'}`} />}
                </div>
                {/* content */}
                <div className={`flex-1 ${last ? '' : 'pb-1'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${reached ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {at && <span className="text-[11px] text-gray-400 shrink-0">{formatShortDateTime(at)}</span>}
                  </div>
                  <p className={`text-xs mt-0.5 ${isCurrent ? 'text-brand-600 font-medium' : 'text-gray-400'}`}>
                    {step.sub}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Delivery address */}
      {order.address_snapshot && (
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <MapPin className="w-4.5 h-4.5" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-gray-800">Delivering to {order.address_snapshot.label}</p>
              <p className="text-gray-500 mt-0.5">
                {order.address_snapshot.street}, {order.address_snapshot.city}, {order.address_snapshot.state} {order.address_snapshot.zip_code}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-500" /> {order.items.length} item{order.items.length > 1 ? 's' : ''}
          </p>
          <ul className="space-y-2">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{it.product_name} × {it.quantity}</span>
                <span className="text-gray-500">${(Number(it.product_price) * it.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-gray-100 mt-3 pt-3">
            <span className="text-sm font-semibold text-gray-800">Total</span>
            <span className="text-sm font-bold text-gray-900">${Number(order.total).toFixed(2)}</span>
          </div>
        </section>
      )}
    </div>
  );
};

export default OrderTracking;
