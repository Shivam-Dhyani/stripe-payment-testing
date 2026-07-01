import { useEffect, useState, useCallback } from 'react';
import { Package, ClipboardList, CheckCircle, Truck, RefreshCw, Boxes, RotateCcw } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { returnService } from '../../services/returnService';
import { Order, ReturnRequest } from '../../types';
import StaffHeader from '../../components/layout/StaffHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { formatDateTime } from '../../utils/date';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffHeader title="Warehouse Console" subtitle="Dark-store operator" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-title-sm font-bold text-gray-800">Fulfillment Queue</h1>
            <p className="text-sm text-gray-500 mt-1">
              {counts.active} to prepare &middot; {counts.packed} packed &middot; {counts.returns} returns inbound
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : tab === 'returns' ? (
          inbound.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <RotateCcw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No returns in transit</p>
              <p className="text-sm text-gray-400 mt-1">Returns collected by riders will appear here to receive.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inbound.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5">
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
                            <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-500">
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
                      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium text-sm disabled:opacity-50 flex-shrink-0"
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
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nothing here right now</p>
            <p className="text-sm text-gray-400 mt-1">New orders will appear as customers place them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((order) => {
              const action = nextAction(order.status);
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-5">
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
                            <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-500">
                              {item.quantity}
                            </span>
                            <span>{item.product_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-800">${Number(order.total).toFixed(2)}</span>
                      {action ? (
                        <button
                          onClick={() => advance(order, action.to)}
                          disabled={updatingId === order.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium text-sm disabled:opacity-50"
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
