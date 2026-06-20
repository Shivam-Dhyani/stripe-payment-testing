import { useEffect, useState } from 'react';
import { Eye, X, CheckCircle, XCircle, Clock, CreditCard, Truck, RefreshCw, Search, ShoppingBag, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, AlertTriangle, Package, Check } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchAllOrders, updateOrderStatus } from '../../store/slices/orderSlice';
import { Order, PaymentEvent, OrderStatusHistory } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { formatDate, formatDateTime } from '../../utils/date';

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

const validTransitions: Record<string, string[]> = {
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
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
  const { orders, loading } = useAppSelector((state) => state.orders);
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

  // Payment events accordion state
  const [paymentEventsOpen, setPaymentEventsOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  const viewOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setDetailOrder(order);
      setPaymentEventsOpen(false);
    }
  };

  const closeDetail = () => {
    setDetailOrder(null);
  };

  const handleAdvanceStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    await dispatch(updateOrderStatus({ id: orderId, status: newStatus }));
    dispatch(fetchAllOrders());
    setUpdatingOrderId(null);
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

  const getNextAction = (status: string): string | null => {
    const transitions = validTransitions[status];
    if (!transitions) return null;
    return transitions.find(t => t !== 'cancelled') || null;
  };

  const canCancel = (status: string): boolean => {
    const transitions = validTransitions[status];
    return transitions ? transitions.includes('cancelled') : false;
  };

  const getActionLabel = (nextStatus: string): string => {
    switch (nextStatus) {
      case 'processing': return 'Mark Processing';
      case 'shipped': return 'Mark Shipped';
      case 'delivered': return 'Mark Delivered';
      default: return `Mark ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}`;
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

  const actionableCount = orders.filter(o => o.status === 'confirmed' || o.status === 'processing').length;

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
      case 'confirmed': return <Check className="w-3.5 h-3.5" />;
      case 'processing': return <Package className="w-3.5 h-3.5" />;
      case 'shipped': return <Truck className="w-3.5 h-3.5" />;
      case 'delivered': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5" />;
      case 'refunded': return <RefreshCw className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getTimelineColor = (toStatus: string) => {
    switch (toStatus) {
      case 'confirmed': return { color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'processing': return { color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'shipped': return { color: 'text-purple-600', bg: 'bg-purple-100' };
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
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
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
                  const nextAction = getNextAction(order.status);
                  const showCancel = canCancel(order.status);
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
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                          {order.status}
                        </span>
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
                          {nextAction ? (
                            <button
                              onClick={() => handleAdvanceStatus(order.id, nextAction)}
                              disabled={updatingOrderId === order.id}
                              className="text-xs px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 font-medium"
                            >
                              {updatingOrderId === order.id ? <ButtonSpinner /> : getActionLabel(nextAction)}
                            </button>
                          ) : !showCancel ? (
                            <span className="text-xs text-gray-400">&mdash;</span>
                          ) : null}
                          {showCancel && (
                            <button
                              onClick={() => openCancelModal(order.id)}
                              disabled={updatingOrderId === order.id}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Cancel order"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
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
                  {detailOrder.status}
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
                <div className="flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-800">Paid via Stripe</span>
                </div>
                {detailOrder.stripe_payment_intent_id && (
                  <p className="font-mono text-xs text-gray-400 mt-0.5 break-all">{detailOrder.stripe_payment_intent_id}</p>
                )}
              </div>
            </div>

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
                                <>{entry.from_status} <ArrowRight className="w-3 h-3 inline mx-0.5" /> {entry.to_status}</>
                              ) : (
                                entry.to_status
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

            {/* Items */}
            {detailOrder.items && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Items</h3>
                <div className="space-y-3">
                  {detailOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{item.product_name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{item.product_name}</p>
                          <p className="text-sm text-gray-500">Qty: {item.quantity} x ${Number(item.product_price).toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="font-medium">${(item.quantity * Number(item.product_price)).toFixed(2)}</p>
                    </div>
                  ))}
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
