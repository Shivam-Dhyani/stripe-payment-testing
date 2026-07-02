import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, X, CheckCircle, XCircle, Clock, CreditCard, Truck, RefreshCw, Search, ShoppingBag, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, AlertTriangle, Package, Check, RotateCcw, Ban } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchAllOrders, updateOrderStatus } from '../../store/slices/orderSlice';
import { fetchReturnRequests } from '../../store/slices/returnSlice';
import { fetchCancellationRequests } from '../../store/slices/cancellationSlice';
import { orderService } from '../../services/orderService';
import { warehouseService, staffService } from '../../services/warehouseService';
import { Order, PaymentEvent, OrderStatusHistory, CancellationRequest, ReturnRequest, Warehouse, User } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { formatDate, formatDateTime } from '../../utils/date';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  accepted: 'bg-indigo-100 text-indigo-700',
  picking: 'bg-amber-100 text-amber-700',
  packed: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
  partially_refunded: 'bg-orange-100 text-orange-700',
};

const formatStatus = (s: string): string => s.replace(/_/g, ' ');

const returnStatusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  pickup_scheduled: 'bg-purple-100 text-purple-700',
  handed_over: 'bg-indigo-100 text-indigo-700',
  received: 'bg-cyan-100 text-cyan-700',
  refunded: 'bg-green-100 text-green-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

const cancelStatusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const RETURN_FLOW: { key: string; label: string }[] = [
  { key: 'requested', label: 'Return Requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'pickup_scheduled', label: 'Pickup Scheduled' },
  { key: 'handed_over', label: 'Picked Up by Courier' },
  { key: 'received', label: 'Received at Warehouse' },
  { key: 'refunded', label: 'Refunded' },
];

type TimelineStep = { key: string; label: string; state: 'done' | 'current' | 'todo' | 'rejected'; date: string | null };

const buildReturnSteps = (r: ReturnRequest): TimelineStep[] => {
  if (r.status === 'rejected') {
    return [
      { key: 'requested', label: 'Return Requested', state: 'done', date: r.created_at },
      { key: 'rejected', label: 'Rejected', state: 'rejected', date: r.updated_at },
    ];
  }
  if (r.status === 'withdrawn') {
    return [
      { key: 'requested', label: 'Return Requested', state: 'done', date: r.created_at },
      { key: 'withdrawn', label: 'Withdrawn by customer', state: 'rejected', date: r.updated_at },
    ];
  }
  const idx = RETURN_FLOW.findIndex((s) => s.key === r.status);
  return RETURN_FLOW.map((s, i) => ({
    key: s.key,
    label: s.label,
    state: i < idx ? 'done' : i === idx ? 'current' : 'todo',
    date:
      s.key === 'requested'
        ? r.created_at
        : s.key === 'pickup_scheduled' && r.pickup_date
        ? r.pickup_date
        : i === idx
        ? r.updated_at
        : null,
  }));
};

const buildCancelSteps = (c: CancellationRequest): TimelineStep[] => {
  const second: TimelineStep =
    c.status === 'pending'
      ? { key: 'pending', label: 'Awaiting Review', state: 'current', date: null }
      : c.status === 'approved'
      ? { key: 'approved', label: 'Approved — Order Cancelled', state: 'done', date: c.resolved_at }
      : { key: 'rejected', label: 'Rejected', state: 'rejected', date: c.resolved_at };
  return [
    { key: 'requested', label: 'Cancellation Requested', state: 'done', date: c.created_at },
    second,
  ];
};

const renderRequestTimeline = (steps: TimelineStep[]) => (
  <div className="relative pl-6 border-l-2 border-gray-200 space-y-3">
    {steps.map((s) => (
      <div key={s.key} className="relative">
        <div
          className={`absolute -left-[calc(0.75rem+1px)] top-0 w-6 h-6 rounded-full flex items-center justify-center ${
            s.state === 'done'
              ? 'bg-green-500 text-white'
              : s.state === 'current'
              ? 'bg-brand-500 text-white'
              : s.state === 'rejected'
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          {s.state === 'done' ? (
            <Check className="w-3.5 h-3.5" />
          ) : s.state === 'rejected' ? (
            <X className="w-3.5 h-3.5" />
          ) : s.state === 'current' ? (
            <span className="w-2 h-2 bg-white rounded-full" />
          ) : (
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          )}
        </div>
        <div className="ml-3">
          <span className={`text-sm font-medium ${s.state === 'todo' ? 'text-gray-400' : 'text-gray-700'}`}>{s.label}</span>
          {s.date && <p className="text-[11px] text-gray-400">{formatDateTime(s.date)}</p>}
        </div>
      </div>
    ))}
  </div>
);

const validTransitions: Record<string, string[]> = {
  placed: ['accepted', 'cancelled'],
  accepted: ['picking', 'cancelled'],
  picking: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
};

const CANCEL_REASONS = [
  'Out of stock',
  'Customer request',
  'Payment issue',
  'Fraudulent order',
  'Other',
];

const Orders = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { orders, loading } = useAppSelector((state) => state.orders);
  const { requests: returnRequests } = useAppSelector((state) => state.returns);
  const { requests: cancelRequests } = useAppSelector((state) => state.cancellations);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState<{ orderId: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('Out of stock');
  const [cancelNotes, setCancelNotes] = useState('');

  // Assign-rider modal state (from the list)
  const [assignModal, setAssignModal] = useState<{ order: Order } | null>(null);
  const [assignRiderId, setAssignRiderId] = useState('');
  const [assigningRider, setAssigningRider] = useState(false);

  // Payment events accordion state
  const [paymentEventsOpen, setPaymentEventsOpen] = useState(false);

  // Fulfillment assignment state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedRider, setSelectedRider] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    dispatch(fetchAllOrders());
    dispatch(fetchReturnRequests());
    dispatch(fetchCancellationRequests());
    warehouseService.getAll(true).then(setWarehouses).catch(() => {});
    staffService.getByRole('delivery_partner').then(setDeliveryPartners).catch(() => {});
  }, [dispatch]);

  const riderName = (id?: string | null) => {
    if (!id) return null;
    const r = deliveryPartners.find((p) => p.id === id);
    return r ? `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email : id.substring(0, 8);
  };

  const handleAssign = async () => {
    if (!detailOrder) return;
    setAssigning(true);
    try {
      const updated = await orderService.assignOrder(detailOrder.id, {
        warehouse_id: selectedWarehouse || undefined,
        delivery_partner_id: selectedRider || undefined,
      });
      setDetailOrder(updated);
      dispatch(fetchAllOrders());
      toast.success('Assignment updated');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to update assignment');
    } finally {
      setAssigning(false);
    }
  };

  // Return requests for a given order (most recent first, as returned by the API).
  const getOrderReturns = (orderId: string) =>
    returnRequests.filter((r) => r.order_id === orderId);

  // Cancellation requests for a given order.
  const getOrderCancellations = (orderId: string) =>
    cancelRequests.filter((c) => c.order_id === orderId);

  // An unresolved cancellation (pending) blocks further order processing.
  const getActiveCancel = (orderId: string) =>
    cancelRequests.find((c) => c.order_id === orderId && c.status === 'pending');

  // An in-progress return (not yet refunded or rejected) blocks further order processing.
  const getActiveReturn = (orderId: string) =>
    returnRequests.find(
      (r) => r.order_id === orderId && ['requested', 'approved', 'pickup_scheduled', 'handed_over', 'received'].includes(r.status)
    );

  // Return activity for a specific order item: status + quantity per matching return.
  const getItemReturns = (orderId: string, orderItemId: string) => {
    const result: { status: string; quantity: number }[] = [];
    getOrderReturns(orderId).forEach((r) => {
      r.items.forEach((it) => {
        if (it.order_item_id === orderItemId) {
          result.push({ status: r.status, quantity: it.quantity });
        }
      });
    });
    return result;
  };

  const viewOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setDetailOrder(order);
      setPaymentEventsOpen(false);
      setSelectedWarehouse(order.warehouse_id || '');
      setSelectedRider(order.delivery_partner_id || '');
    }
  };

  const closeDetail = () => {
    setDetailOrder(null);
  };

  const openCancelModal = (orderId: string) => {
    setCancelModal({ orderId });
    setCancelReason('Out of stock');
    setCancelNotes('');
  };

  const closeCancelModal = () => {
    setCancelModal(null);
    setCancelReason('Out of stock');
    setCancelNotes('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal) return;
    const reason = cancelReason === 'Other' ? cancelNotes : cancelReason;
    if (!reason.trim()) return;
    setUpdatingOrderId(cancelModal.orderId);
    await dispatch(updateOrderStatus({
      id: cancelModal.orderId,
      status: 'cancelled',
      notes: cancelNotes || undefined,
      cancellationReason: reason,
    }));
    dispatch(fetchAllOrders());
    setUpdatingOrderId(null);
    closeCancelModal();
  };

  const canCancel = (status: string): boolean => {
    const transitions = validTransitions[status];
    return transitions ? transitions.includes('cancelled') : false;
  };

  // Rider can be assigned any time the order is still in the store (pre-dispatch).
  const isPreDispatch = (status: string): boolean =>
    ['placed', 'accepted', 'picking', 'packed'].includes(status);

  const openAssignModal = (order: Order) => {
    setAssignModal({ order });
    setAssignRiderId(order.delivery_partner_id || '');
  };

  const submitAssignRider = async () => {
    if (!assignModal || !assignRiderId) return;
    setAssigningRider(true);
    try {
      await orderService.assignOrder(assignModal.order.id, { delivery_partner_id: assignRiderId });
      dispatch(fetchAllOrders());
      toast.success('Rider assigned');
      setAssignModal(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to assign rider');
    } finally {
      setAssigningRider(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter ? o.status === statusFilter : true;
    const matchesSearch = search
      ? o.id.toLowerCase().includes(search.toLowerCase()) || o.user_id.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredOrders.length / perPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const actionableCount = orders.filter(o => ['placed', 'accepted', 'picking', 'packed'].includes(o.status)).length;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const getTimelineIcon = (toStatus: string) => {
    switch (toStatus) {
      case 'placed': return <Check className="w-3.5 h-3.5" />;
      case 'accepted': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'picking': return <Package className="w-3.5 h-3.5" />;
      case 'packed': return <Package className="w-3.5 h-3.5" />;
      case 'out_for_delivery': return <Truck className="w-3.5 h-3.5" />;
      case 'delivered': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      case 'refunded': return <RefreshCw className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getTimelineColor = (toStatus: string) => {
    switch (toStatus) {
      case 'placed': return { color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'accepted': return { color: 'text-indigo-600', bg: 'bg-indigo-100' };
      case 'picking': return { color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'packed': return { color: 'text-orange-600', bg: 'bg-orange-100' };
      case 'out_for_delivery': return { color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'delivered': return { color: 'text-green-600', bg: 'bg-green-100' };
      case 'cancelled': return { color: 'text-red-600', bg: 'bg-red-100' };
      case 'refunded': return { color: 'text-gray-600', bg: 'bg-gray-100' };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-title-sm font-bold text-gray-800">Orders</h1>
          {actionableCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              {actionableCount} actionable
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or customer..."
            className="pl-9 pr-4 py-2 h-10 w-64 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 h-10 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
        >
          <option value="">All Statuses</option>
          <option value="placed">Placed</option>
          <option value="accepted">Accepted</option>
          <option value="picking">Picking</option>
          <option value="packed">Packed</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Order</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Items</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Total</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-10 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No orders found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const showCancel = canCancel(order.status);
                  const activeCancel = getActiveCancel(order.id);
                  const activeReturn = getActiveReturn(order.id);
                  const blocked = Boolean(activeCancel || activeReturn);
                  return (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-500">#{order.id.substring(0, 8)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-gray-500">{order.user_id.substring(0, 8)}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-800">{order.items?.length || '-'}</td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-800">${Number(order.total).toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                            {formatStatus(order.status)}
                          </span>
                          {getOrderCancellations(order.id).map((c) => (
                            <span
                              key={c.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${cancelStatusColors[c.status] || 'bg-gray-100 text-gray-700'}`}
                            >
                              <Ban className="w-2.5 h-2.5" />
                              Cancel {c.status}
                            </span>
                          ))}
                          {getOrderReturns(order.id).map((r) => (
                            <span
                              key={r.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${returnStatusColors[r.status] || 'bg-gray-100 text-gray-700'}`}
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              Return {r.status.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-800">{formatDate(order.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewOrder(order.id)}
                            className="p-1.5 text-brand-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {blocked ? (
                            <>
                              {activeCancel && (
                                <button
                                  onClick={() => navigate('/admin/cancellations')}
                                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                                  title="Resolve the cancellation request before processing this order"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  Review Cancellation
                                </button>
                              )}
                              {activeReturn && (
                                <button
                                  onClick={() => navigate('/admin/returns')}
                                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
                                  title="Resolve the return/refund request before processing this order"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Review Refund
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {isPreDispatch(order.status) && (
                                order.delivery_partner_id ? (
                                  <button
                                    onClick={() => openAssignModal(order)}
                                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                    title="Reassign rider"
                                  >
                                    <Truck className="w-3.5 h-3.5 text-brand-500" />
                                    {riderName(order.delivery_partner_id)}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openAssignModal(order)}
                                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                                      order.status === 'packed'
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'border border-brand-300 text-brand-600 hover:bg-brand-50'
                                    }`}
                                    title={order.status === 'packed' ? 'Packed — assign a rider to dispatch' : 'Assign a rider'}
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    Assign Rider
                                  </button>
                                )
                              )}
                              {showCancel && (
                                <button
                                  onClick={() => openCancelModal(order.id)}
                                  disabled={updatingOrderId === order.id}
                                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 font-medium"
                                  title="Cancel order"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Cancel
                                </button>
                              )}
                              {!isPreDispatch(order.status) && !showCancel && (
                                <span className="text-xs text-gray-400">&mdash;</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredOrders.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * perPage + 1, filteredOrders.length)} to {Math.min(currentPage * perPage, filteredOrders.length)} of {filteredOrders.length} results
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              {getPageNumbers().map((page, idx) =>
                typeof page === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-sm text-gray-400">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-brand-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-800">Cancel Order</h2>
              </div>
              <button onClick={closeCancelModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for cancelling order <span className="font-mono">#{cancelModal.orderId.substring(0, 8)}</span>.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
                >
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {cancelReason === 'Other' ? 'Reason details (required)' : 'Additional notes'}
                </label>
                <textarea
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder={cancelReason === 'Other' ? 'Enter the cancellation reason...' : 'Optional notes...'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeCancelModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelReason === 'Other' && !cancelNotes.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Rider Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-brand-500" />
                <h2 className="text-lg font-semibold text-gray-800">Assign Delivery Partner</h2>
              </div>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Order <span className="font-mono">#{assignModal.order.id.substring(0, 8)}</span> — assign a rider so it can be dispatched once packed.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Partner</label>
            <select
              value={assignRiderId}
              onChange={(e) => setAssignRiderId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
            >
              <option value="">— Select rider —</option>
              {deliveryPartners.map((r) => (
                <option key={r.id} value={r.id}>
                  {`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email}
                </option>
              ))}
            </select>
            {deliveryPartners.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">No delivery partners found. Create one from the admin staff tools.</p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAssignModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submitAssignRider}
                disabled={assigningRider || !assignRiderId}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium text-sm disabled:opacity-50"
              >
                {assigningRider && <ButtonSpinner />}
                Assign Rider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Order #{detailOrder.id.substring(0, 8)}</h2>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Order Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[detailOrder.status] || 'bg-gray-100 text-gray-700'}`}>
                  {formatStatus(detailOrder.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-semibold text-lg">${Number(detailOrder.total).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formatDateTime(detailOrder.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-800">
                    <CreditCard className="w-4 h-4 text-gray-400" /> Stripe
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${paymentStatusColors[detailOrder.payment_status || 'pending'] || 'bg-gray-100 text-gray-700'}`}>
                    {formatStatus(detailOrder.payment_status || 'pending')}
                  </span>
                </div>
                {Number(detailOrder.refunded_amount) > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">Refunded: ${Number(detailOrder.refunded_amount).toFixed(2)}</p>
                )}
                {detailOrder.receipt_url && (
                  <a href={detailOrder.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline mt-0.5 inline-block">
                    View receipt
                  </a>
                )}
                {detailOrder.stripe_payment_intent_id && (
                  <p className="font-mono text-xs text-gray-400 mt-0.5 break-all">{detailOrder.stripe_payment_intent_id}</p>
                )}
              </div>
            </div>

            {/* Fulfillment Assignment */}
            {!['delivered', 'cancelled', 'refunded'].includes(detailOrder.status) && (
              <div className="mb-6 rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Fulfillment Assignment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse / Dark Store</label>
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
                    >
                      <option value="">— Select warehouse —</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Partner</label>
                    <select
                      value={selectedRider}
                      onChange={(e) => setSelectedRider(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
                    >
                      <option value="">— Unassigned —</option>
                      {deliveryPartners.map((r) => (
                        <option key={r.id} value={r.id}>
                          {`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-400">
                    {detailOrder.delivery_partner_id
                      ? `Assigned rider: ${riderName(detailOrder.delivery_partner_id)}`
                      : 'A delivery partner is required before dispatching (Out for Delivery).'}
                  </p>
                  <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium text-sm disabled:opacity-50"
                  >
                    {assigning && <ButtonSpinner />}
                    Save Assignment
                  </button>
                </div>
              </div>
            )}

            {/* Cancellation Reason Alert */}
            {detailOrder.status === 'cancelled' && detailOrder.cancellation_reason && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Order Cancelled</p>
                  <p className="text-sm text-red-600 mt-0.5">{detailOrder.cancellation_reason}</p>
                </div>
              </div>
            )}

            {/* Fulfillment Timeline */}
            {detailOrder.status_history && detailOrder.status_history.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Fulfillment Timeline</h3>
                <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                  {detailOrder.status_history.map((entry: OrderStatusHistory, index: number) => {
                    const isLast = index === detailOrder.status_history!.length - 1;
                    const { color, bg } = getTimelineColor(entry.to_status);
                    return (
                      <div key={entry.id} className="relative">
                        <div className={`absolute -left-[calc(0.75rem+1px)] top-0 w-6 h-6 rounded-full flex items-center justify-center ${bg} ${color} ${isLast ? 'ring-2 ring-offset-2 ring-current' : ''}`}>
                          {getTimelineIcon(entry.to_status)}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-semibold capitalize ${color}`}>
                              {entry.from_status ? (
                                <>{formatStatus(entry.from_status)} <ArrowRight className="w-3 h-3 inline mx-0.5" /> {formatStatus(entry.to_status)}</>
                              ) : (
                                formatStatus(entry.to_status)
                              )}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-xs text-gray-400">
                              {formatDateTime(entry.created_at)}
                            </span>
                            {entry.changed_by_name && (
                              <span className="text-xs text-gray-500">by {entry.changed_by_name}</span>
                            )}
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-gray-600 mt-0.5">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!detailOrder.status_history || detailOrder.status_history.length === 0) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Fulfillment Timeline</h3>
                <div className="flex items-center space-x-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm">No fulfillment history recorded for this order</p>
                </div>
              </div>
            )}

            {/* Payment Events Accordion */}
            <div className="mb-6 rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setPaymentEventsOpen(!paymentEventsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <h3 className="font-semibold text-gray-800 text-sm">Payment Events</h3>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${paymentEventsOpen ? 'rotate-180' : ''}`} />
              </button>
              {paymentEventsOpen && (
                <div className="px-4 py-3">
                  {(() => {
                    const paymentOnlyEvents = (detailOrder.payment_events || []).filter(
                      (e: PaymentEvent) => ['created', 'succeeded', 'failed', 'refunded'].includes(e.event_type)
                    );
                    return paymentOnlyEvents.length > 0 ? (
                    <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                      {paymentOnlyEvents.map((event: PaymentEvent, index: number) => {
                        const isLast = index === paymentOnlyEvents.length - 1;
                        const eventConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
                          created: { icon: <CreditCard className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-100' },
                          processing: { icon: <Truck className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-100' },
                          succeeded: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100' },
                          failed: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-100' },
                          refunded: { icon: <RefreshCw className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-100' },
                          cancelled: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-100' },
                        };
                        const config = eventConfig[event.event_type] || eventConfig.created;
                        return (
                          <div key={event.id} className="relative">
                            <div className={`absolute -left-[calc(0.75rem+1px)] top-0 w-6 h-6 rounded-full flex items-center justify-center ${config.bg} ${config.color} ${isLast ? 'ring-2 ring-offset-2 ring-current' : ''}`}>
                              {config.icon}
                            </div>
                            <div className="ml-4">
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-semibold capitalize ${config.color}`}>
                                  {event.event_type}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDateTime(event.created_at)}
                                </span>
                              </div>
                              {event.message && (
                                <p className="text-sm text-gray-600 mt-0.5">{event.message}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <p className="text-sm">No payment events recorded</p>
                    </div>
                  );
                  })()}
                </div>
              )}
            </div>

            {/* Cancellation & Return Requests */}
            {(() => {
              const cancels = getOrderCancellations(detailOrder.id);
              const returns = getOrderReturns(detailOrder.id);
              if (cancels.length === 0 && returns.length === 0) return null;
              return (
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Cancellation &amp; Return Requests</h3>
                    <span className="text-xs text-gray-500">Manage in the Cancellations / Returns modules</span>
                  </div>
                  <div className="space-y-5">
                    {cancels.map((c) => (
                      <div key={c.id} className="rounded-lg bg-white border border-gray-200 p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Ban className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-semibold text-gray-700">Cancellation Request</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${cancelStatusColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Reason: {c.reason}</p>
                        {renderRequestTimeline(buildCancelSteps(c))}
                      </div>
                    ))}
                    {returns.map((r) => (
                      <div key={r.id} className="rounded-lg bg-white border border-gray-200 p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <RotateCcw className="w-4 h-4 text-brand-400" />
                          <span className="text-sm font-semibold text-gray-700">Return Request</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${returnStatusColors[r.status] || 'bg-gray-100 text-gray-700'}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                          {r.refund_amount != null && (
                            <span className="text-xs text-gray-500 ml-auto">Refund: ${Number(r.refund_amount).toFixed(2)}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Reason: {r.reason}</p>
                        {renderRequestTimeline(buildReturnSteps(r))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Items */}
            {detailOrder.items && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Items</h3>
                <div className="space-y-3">
                  {detailOrder.items.map((item) => {
                    const itemReturns = getItemReturns(detailOrder.id, item.id);
                    return (
                      <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{item.product_name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{item.product_name}</p>
                            <p className="text-sm text-gray-500">Qty: {item.quantity} x ${Number(item.product_price).toFixed(2)}</p>
                            {itemReturns.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {itemReturns.map((ret, i) => (
                                  <span
                                    key={i}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${returnStatusColors[ret.status] || 'bg-gray-100 text-gray-700'}`}
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    Return {ret.status.replace('_', ' ')} &times;{ret.quantity}
                                  </span>
                                ))}
                              </div>
                            ) : item.is_returnable ? (
                              <p className="text-[11px] text-gray-400 mt-1">
                                Returnable{item.return_window_days ? ` within ${item.return_window_days} days` : ''}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <p className="font-medium">${(item.quantity * Number(item.product_price)).toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Address */}
            {detailOrder.address_snapshot && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Delivery Address</h3>
                <p className="text-sm text-gray-600">{detailOrder.address_snapshot.street}</p>
                <p className="text-sm text-gray-600">
                  {detailOrder.address_snapshot.city}, {detailOrder.address_snapshot.state} {detailOrder.address_snapshot.zip_code}
                </p>
                <p className="text-sm text-gray-600">{detailOrder.address_snapshot.country}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={closeDetail}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
