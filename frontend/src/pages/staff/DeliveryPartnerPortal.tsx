import { useEffect, useState, useCallback } from 'react';
import { Package, Truck, CheckCircle, RefreshCw, MapPin, RotateCcw, Warehouse } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { returnService } from '../../services/returnService';
import { Order, ReturnRequest } from '../../types';
import StaffHeader from '../../components/layout/StaffHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { formatDateTime } from '../../utils/date';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <StaffHeader title="Rider Console" subtitle="Delivery partner" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-title-sm font-bold text-gray-800">My Deliveries</h1>
            <p className="text-sm text-gray-500 mt-1">
              {counts.pickup} to pick up &middot; {counts.out} out for delivery &middot; {counts.returns} return pickups
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
          returns.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <RotateCcw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No return pickups assigned</p>
              <p className="text-sm text-gray-400 mt-1">Returns you're assigned to collect will show here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {returns.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className="font-mono text-sm text-gray-500">Order #{r.order_id.substring(0, 8)}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                      r.status === 'handed_over' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {formatStatus(r.status)}
                    </span>
                  </div>

                  {r.pickup_address && (
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg mb-3">
                      <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-700">{r.pickup_address}</p>
                        {r.pickup_date && <p className="text-xs text-gray-400 mt-0.5">Pickup: {formatDateTime(r.pickup_date)}</p>}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 mb-4">
                    {r.items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-500">
                          {item.quantity}
                        </span>
                        <span>{item.product_name || 'Item'}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Reason: {r.reason}</span>
                    {r.status === 'pickup_scheduled' ? (
                      <button
                        onClick={() => collectReturn(r.id)}
                        disabled={updatingId === r.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium text-sm disabled:opacity-50"
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
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No orders in this list</p>
            <p className="text-sm text-gray-400 mt-1">Assigned orders that are packed will show up here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((order) => {
              const action = nextAction(order.status);
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-200 p-5">
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
                    <p className="text-sm text-gray-700">{formatAddress(order.address_snapshot) || 'No address on file'}</p>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 mb-4">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-500">
                          {item.quantity}
                        </span>
                        <span>{item.product_name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
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
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
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
