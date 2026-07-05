import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2, Package, PackageCheck, ShoppingBag, Bike, MapPin,
  ArrowLeft, XCircle, Clock, Zap,
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import { Order, OrderStatusHistory } from '../../types';
import { parseUTC } from '../../utils/date';
import { remainingMinutes } from '../../utils/eta';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusTimeline, { TimelineStep } from '../../components/common/StatusTimeline';
import { useRealtime } from '../../realtime/RealtimeProvider';

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

const OrderTracking = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

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

  // Real-time: reload this order the moment it changes.
  useRealtime((m) => {
    if (!m.order_id || m.order_id === id) load();
  });

  // Tick every 30s to refresh the approximate minutes-remaining (no exact clock).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
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
  const remMin = remainingMinutes(order.created_at, now);

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
              {order.status === 'out_for_delivery' ? 'Almost there' : 'Estimated arrival'}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold mt-1">
              {remMin > 0 ? `About ${remMin} min` : 'Any moment now'}
            </h1>
            <p className="text-sm opacity-90 mt-1">
              {remMin > 0 ? 'remaining · ' : ''}
              {order.status === 'out_for_delivery'
                ? 'Your rider is on the way to your door.'
                : 'Your order is being prepared at the store.'}
            </p>
          </div>
        )}
      </section>

      {/* Status stepper */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <StatusTimeline
          steps={STEPS.map((step, i): TimelineStep => {
            const reached = !isCancelled && currentIdx >= i;
            const isCurrent = !isCancelled && order.status === step.key;
            return {
              key: step.key,
              label: step.label,
              sub: step.sub,
              date: dateMap[step.key] || null,
              icon: step.icon,
              state: isCurrent ? 'current' : reached ? 'done' : 'todo',
            };
          })}
        />
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
                <span className="text-gray-500">₹{(Number(it.product_price) * it.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-gray-100 mt-3 pt-3">
            <span className="text-sm font-semibold text-gray-800">Total</span>
            <span className="text-sm font-bold text-gray-900">₹{Number(order.total).toFixed(2)}</span>
          </div>
        </section>
      )}
    </div>
  );
};

export default OrderTracking;
