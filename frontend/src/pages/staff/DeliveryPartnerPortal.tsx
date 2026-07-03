import { useEffect, useState, useCallback } from 'react';
import { Package, Truck, CheckCircle, RefreshCw, MapPin, RotateCcw, Warehouse, Zap, User } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { returnService } from '../../services/returnService';
import { Order, ReturnRequest } from '../../types';
import StaffHeader from '../../components/layout/StaffHeader';
import InstallAppButton from '../../components/common/InstallAppButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { formatDateTime } from '../../utils/date';
import { DELIVERY_PROMISE } from '../../config/brand';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  packed: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
};

const formatStatus = (s: string): string => s.replace(/_/g, ' ');

const nextAction = (status: string): { to: string; label: string; icon: React.ReactNode } | null => {
  switch (status) {
    case 'packed': return { to: 'out_for_delivery', label: 'Picked Up — Start Delivery', icon: <Truck className="w-4 h-4" /> };
    case 'out_for_delivery': return { to: 'delivered', label: 'Mark Delivered', icon: <CheckCircle className="w-4 h-4" /> };
    default: return null;
  }
};

const formatAddress = (a: Order['address_snapshot']): string => {
  if (!a) return '';
  return [a.street, a.city, a.state, a.zip_code, a.country].filter(Boolean).join(', ');
};

const TABS = [
  { key: 'pickup', label: 'To Pick Up' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'returns', label: 'Return Pickups' },
];

const DeliveryPartnerPortal = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState('pickup');
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const [deliveries, pickups] = await Promise.all([
        orderService.getMyDeliveries(),
        returnService.getPickups(),
      ]);
      setOrders(deliveries);
      setReturns(pickups);
    } catch {
      toast.error('Failed to load your deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const advance = async (order: Order, to: string) => {
    if (to === 'delivered') {
      const ok = await confirm({
        title: 'Mark as delivered?',
        message: `Confirm you handed order #${order.id.substring(0, 8)} to the customer. This can't be undone.`,
        confirmLabel: 'Mark Delivered',
      });
      if (!ok) return;
    }
    setUpdatingId(order.id);
    try {
      await orderService.updateOrderStatus(order.id, to);
      toast.success(to === 'delivered' ? 'Delivered!' : 'Out for delivery');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

  const collectReturn = async (returnId: string) => {
    setUpdatingId(returnId);
    try {
      await returnService.markPickedUp(returnId);
      toast.success('Return collected — deliver it to the warehouse');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to update return');
    } finally {
      setUpdatingId(null);
    }
  };

  const visible = orders.filter((o) => (tab === 'pickup' ? o.status === 'packed' : o.status === tab));

  const counts = {
    pickup: orders.filter((o) => o.status === 'packed').length,
    out: orders.filter((o) => o.status === 'out_for_delivery').length,
    returns: returns.filter((r) => r.status === 'pickup_scheduled').length,
  };

  // Per-tab counts for the fast-scan badges on each tab.
  const tabCounts: Record<string, number> = {
    pickup: counts.pickup,
    out_for_delivery: counts.out,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    returns: counts.returns,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffHeader title="Rider Console" subtitle="Delivery partner" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Console header with yellow identity strip */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-qc-card">
          <div className="h-1.5 bg-accent-400" />
          <div className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-title-sm font-bold text-gray-900">My Deliveries</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-semibold text-ink-900">
                  <Zap className="w-3 h-3" /> {DELIVERY_PROMISE}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="qc-chip">
                  <Package className="w-3.5 h-3.5" /> {counts.pickup} to pick up
                </span>
                <span className="qc-chip">
                  <Truck className="w-3.5 h-3.5" /> {counts.out} out for delivery
                </span>
                <span className="qc-chip">
                  <RotateCcw className="w-3.5 h-3.5" /> {counts.returns} return pickups
                </span>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <InstallAppButton />
              <button
                onClick={load}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = tabCounts[t.key] ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent-400 text-ink-900 shadow-qc-card'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {t.label}
                {n > 0 && (
                  <span
                    className={`inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                      active ? 'bg-ink-900/10 text-ink-900' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : tab === 'returns' ? (
          returns.length === 0 ? (
            <div className="text-center py-16 qc-card shadow-qc-card">
              <RotateCcw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No return pickups assigned</p>
              <p className="text-sm text-gray-400 mt-1">Returns you're assigned to collect will show here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {returns.map((r) => (
                <div key={r.id} className="qc-card shadow-qc-card p-5">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className="font-mono text-sm text-gray-500">Order #{r.order_id.substring(0, 8)}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      r.status === 'handed_over' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {formatStatus(r.status)}
                    </span>
                  </div>

                  {r.customer_name && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-800">{r.customer_name}</span>
                    </div>
                  )}

                  {r.pickup_address && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg mb-3">
                      <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pickup from</p>
                        <p className="text-sm text-gray-700">{r.pickup_address}</p>
                        {r.pickup_date && <p className="text-xs text-gray-400 mt-0.5">Pickup: {formatDateTime(r.pickup_date)}</p>}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 mb-4">
                    {r.items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center text-[11px] font-semibold text-brand-700">
                          {item.quantity}
                        </span>
                        <span>{item.product_name || 'Item'}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <span className="text-sm text-gray-500 min-w-0 truncate">Reason: {r.reason}</span>
                    {r.status === 'pickup_scheduled' ? (
                      <button
                        onClick={() => collectReturn(r.id)}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center gap-2 justify-center px-5 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition font-semibold text-sm shadow-qc-card disabled:opacity-50"
                      >
                        {updatingId === r.id ? <ButtonSpinner /> : <RotateCcw className="w-4 h-4" />}
                        Mark Picked Up
                      </button>
                    ) : r.status === 'handed_over' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                        <Warehouse className="w-3.5 h-3.5" /> Drop at warehouse
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Awaiting customer to schedule</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : visible.length === 0 ? (
          <div className="text-center py-16 qc-card shadow-qc-card">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No orders in this list</p>
            <p className="text-sm text-gray-400 mt-1">Assigned orders that are packed will show up here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((order) => {
              const action = nextAction(order.status);
              return (
                <div key={order.id} className="qc-card shadow-qc-card p-5">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className="font-mono text-sm text-gray-500">#{order.id.substring(0, 8)}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {formatStatus(order.status)}
                    </span>
                    <span className="text-xs text-gray-400">{formatDateTime(order.created_at)}</span>
                  </div>

                  {/* Delivery address */}
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg mb-3">
                    <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Deliver to</p>
                      <p className="text-sm text-gray-700">{formatAddress(order.address_snapshot) || 'No address on file'}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 mb-4">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center text-[11px] font-semibold text-brand-700">
                          {item.quantity}
                        </span>
                        <span>{item.product_name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                    <span className="text-base font-bold text-gray-900 flex-shrink-0">${Number(order.total).toFixed(2)}</span>
                    {action ? (
                      <button
                        onClick={() => advance(order, action.to)}
                        disabled={updatingId === order.id}
                        className="inline-flex flex-1 max-w-[65%] items-center gap-2 justify-center px-5 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition font-semibold text-sm shadow-qc-card disabled:opacity-50"
                      >
                        {updatingId === order.id ? <ButtonSpinner /> : action.icon}
                        {action.label}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg">
                        <CheckCircle className="w-3.5 h-3.5" /> Delivered
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default DeliveryPartnerPortal;
