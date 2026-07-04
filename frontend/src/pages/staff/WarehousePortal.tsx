import { useEffect, useState, useCallback } from 'react';
import { Package, ClipboardList, CheckCircle, Truck, RefreshCw, Boxes, RotateCcw, Zap } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { returnService } from '../../services/returnService';
import { Order, ReturnRequest } from '../../types';
import StaffHeader from '../../components/layout/StaffHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { formatDateTime } from '../../utils/date';
import { DELIVERY_PROMISE } from '../../config/brand';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  accepted: 'bg-indigo-100 text-indigo-700',
  picking: 'bg-amber-100 text-amber-700',
  packed: 'bg-orange-100 text-orange-700',
};

const formatStatus = (s: string): string => s.replace(/_/g, ' ');

// Next in-store action for the operator.
const nextAction = (status: string): { to: string; label: string; icon: React.ReactNode } | null => {
  switch (status) {
    case 'placed': return { to: 'accepted', label: 'Accept Order', icon: <CheckCircle className="w-4 h-4" /> };
    case 'accepted': return { to: 'picking', label: 'Start Picking', icon: <ClipboardList className="w-4 h-4" /> };
    case 'picking': return { to: 'packed', label: 'Mark Packed', icon: <Boxes className="w-4 h-4" /> };
    default: return null;
  }
};

const TABS = [
  { key: 'active', label: 'To Do' },
  { key: 'placed', label: 'New' },
  { key: 'picking', label: 'Picking' },
  { key: 'packed', label: 'Packed' },
  { key: 'returns', label: 'Returns Inbound' },
];

const WarehousePortal = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inbound, setInbound] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tab, setTab] = useState('active');

  const load = useCallback(async () => {
    try {
      const [queue, returns] = await Promise.all([
        orderService.getQueue(),
        returnService.getInbound(),
      ]);
      setOrders(queue);
      setInbound(returns);
    } catch {
      toast.error('Failed to load the fulfillment queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh the fulfillment queue so new orders and returns appear without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      load();
    }, 15000);
    return () => clearInterval(id);
  }, [load]);

  const advance = async (order: Order, to: string) => {
    setUpdatingId(order.id);
    try {
      await orderService.updateOrderStatus(order.id, to);
      toast.success(`Order marked ${formatStatus(to)}`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to update order');
    } finally {
      setUpdatingId(null);
    }
  };

  const receiveReturn = async (returnId: string) => {
    setUpdatingId(returnId);
    try {
      await returnService.markReceived(returnId);
      toast.success('Return received at warehouse');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to receive return');
    } finally {
      setUpdatingId(null);
    }
  };

  const visible = orders.filter((o) => {
    if (tab === 'active') return ['placed', 'accepted', 'picking'].includes(o.status);
    if (tab === 'placed') return o.status === 'placed' || o.status === 'accepted';
    return o.status === tab;
  });

  const counts = {
    active: orders.filter((o) => ['placed', 'accepted', 'picking'].includes(o.status)).length,
    packed: orders.filter((o) => o.status === 'packed').length,
    returns: inbound.length,
  };

  // Per-tab counts for the fast-scan badges on each tab.
  const tabCounts: Record<string, number> = {
    active: counts.active,
    placed: orders.filter((o) => o.status === 'placed' || o.status === 'accepted').length,
    picking: orders.filter((o) => o.status === 'picking').length,
    packed: counts.packed,
    returns: counts.returns,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffHeader title="Warehouse Console" subtitle="Dark-store operator" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Console header with yellow identity strip */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-qc-card">
          <div className="h-1.5 bg-accent-400" />
          <div className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-title-sm font-bold text-gray-900">Fulfillment Queue</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-semibold text-ink-900">
                  <Zap className="w-3 h-3" /> {DELIVERY_PROMISE}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="qc-chip">
                  <ClipboardList className="w-3.5 h-3.5" /> {counts.active} to prepare
                </span>
                <span className="qc-chip">
                  <Boxes className="w-3.5 h-3.5" /> {counts.packed} packed
                </span>
                <span className="qc-chip">
                  <RotateCcw className="w-3.5 h-3.5" /> {counts.returns} returns inbound
                </span>
              </div>
            </div>
            <button
              onClick={load}
              className="flex flex-shrink-0 items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
            </button>
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
          inbound.length === 0 ? (
            <div className="text-center py-16 qc-card shadow-qc-card">
              <RotateCcw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No returns in transit</p>
              <p className="text-sm text-gray-400 mt-1">Returns collected by riders will appear here to receive.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inbound.map((r) => (
                <div key={r.id} className="qc-card shadow-qc-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm text-gray-500">Order #{r.order_id.substring(0, 8)}</span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">In transit</span>
                        {r.delivery_partner_name && (
                          <span className="text-xs text-gray-400">Rider: {r.delivery_partner_name}</span>
                        )}
                      </div>
                      <div className="mt-3 space-y-1">
                        {r.items?.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center text-[11px] font-semibold text-brand-700">
                              {item.quantity}
                            </span>
                            <span>{item.product_name || 'Item'}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Reason: {r.reason}</p>
                    </div>
                    <button
                      onClick={() => receiveReturn(r.id)}
                      disabled={updatingId === r.id}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition font-semibold text-sm shadow-qc-card disabled:opacity-50 flex-shrink-0"
                    >
                      {updatingId === r.id ? <ButtonSpinner /> : <CheckCircle className="w-4 h-4" />}
                      Mark Received
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : visible.length === 0 ? (
          <div className="text-center py-16 qc-card shadow-qc-card">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nothing here right now</p>
            <p className="text-sm text-gray-400 mt-1">New orders will appear as customers place them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((order) => {
              const action = nextAction(order.status);
              return (
                <div key={order.id} className="qc-card shadow-qc-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm text-gray-500">#{order.id.substring(0, 8)}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                          {formatStatus(order.status)}
                        </span>
                        <span className="text-xs text-gray-400">{formatDateTime(order.created_at)}</span>
                      </div>
                      <div className="mt-3 space-y-1">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center text-[11px] font-semibold text-brand-700">
                              {item.quantity}
                            </span>
                            <span>{item.product_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-800">₹{Number(order.total).toFixed(2)}</span>
                      {action ? (
                        <button
                          onClick={() => advance(order, action.to)}
                          disabled={updatingId === order.id}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition font-semibold text-sm shadow-qc-card disabled:opacity-50"
                        >
                          {updatingId === order.id ? <ButtonSpinner /> : action.icon}
                          {action.label}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                          <Truck className="w-3.5 h-3.5" />
                          {order.delivery_partner_id ? 'Awaiting pickup' : 'Awaiting rider assignment'}
                        </span>
                      )}
                    </div>
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

export default WarehousePortal;
