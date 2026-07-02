import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchOrders, fetchOrderById } from '../../store/slices/orderSlice';
import { createCancellationRequest, fetchCancellationRequests } from '../../store/slices/cancellationSlice';
import { createReturnRequest, fetchReturnRequests, schedulePickup, withdrawReturn } from '../../store/slices/returnSlice';
import { Package, ChevronDown, ChevronUp, Calendar, Hash, Check, X, XCircle, CreditCard, Ban, RotateCcw, Truck, MapPin } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { Order, OrderItem, OrderStatusHistory, CancellationRequest, ReturnRequest } from '../../types';
import { formatDate, formatShortDateTime, formatDateTime } from '../../utils/date';

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

const formatStatus = (s: string): string => s.replace(/_/g, ' ');

const STEP_DEFINITIONS = [
  { key: 'placed', label: 'Placed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'picking', label: 'Picking' },
  { key: 'packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const STATUS_ORDER = ['placed', 'accepted', 'picking', 'packed', 'out_for_delivery', 'delivered'];

const CANCEL_REASONS = [
  'Changed my mind',
  'Found a better price elsewhere',
  'Ordered by mistake',
  'Taking too long to ship',
  'Other',
];

const RETURN_REASONS = [
  'Product damaged',
  'Wrong item received',
  'Product not as described',
  'Quality not satisfactory',
  'Other',
];

const returnPillColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  pickup_scheduled: 'bg-purple-100 text-purple-700',
  handed_over: 'bg-indigo-100 text-indigo-700',
  received: 'bg-cyan-100 text-cyan-700',
  refunded: 'bg-green-100 text-green-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

const cancelPillColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const RETURN_FLOW: { key: string; label: string }[] = [
  { key: 'requested', label: 'Return requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'pickup_scheduled', label: 'Pickup scheduled' },
  { key: 'handed_over', label: 'Handover' },
  { key: 'received', label: 'Received by warehouse' },
  { key: 'refunded', label: 'Refunded' },
];

type TimelineStep = { key: string; label: string; state: 'done' | 'current' | 'todo' | 'rejected'; date: string | null };

const buildReturnSteps = (r: ReturnRequest): TimelineStep[] => {
  // First timestamp recorded for each status.
  const at: Record<string, string> = {};
  (r.status_history || []).forEach((h) => {
    if (!at[h.status]) at[h.status] = h.created_at;
  });
  const terminal = r.status === 'rejected' || r.status === 'withdrawn';

  if (terminal) {
    const steps: TimelineStep[] = RETURN_FLOW.filter((s) => at[s.key]).map((s) => ({
      key: s.key, label: s.label, state: 'done', date: at[s.key],
    }));
    if (steps.length === 0) steps.push({ key: 'requested', label: 'Return requested', state: 'done', date: r.created_at });
    steps.push({
      key: r.status,
      label: r.status === 'rejected' ? 'Rejected' : 'Withdrawn by you',
      state: 'rejected',
      date: at[r.status] || r.updated_at,
    });
    return steps;
  }

  const idx = RETURN_FLOW.findIndex((s) => s.key === r.status);
  return RETURN_FLOW.map((s, i) => ({
    key: s.key,
    label: s.label,
    state: at[s.key] ? (i === idx ? 'current' : 'done') : i < idx ? 'done' : 'todo',
    date: at[s.key] || (s.key === 'requested' ? r.created_at : null),
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

const renderTimeline = (steps: TimelineStep[]) => (
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

const getStepData = (order: Order) => {
  const history = order.status_history || [];
  const isCancelled = order.status === 'cancelled';
  const currentStatusIndex = STATUS_ORDER.indexOf(order.status);

  const dateMap: Record<string, string> = {};
  history.forEach((entry: OrderStatusHistory) => {
    if (!dateMap[entry.to_status]) {
      dateMap[entry.to_status] = entry.created_at;
    }
  });
  // The order being created is the "placed" milestone.
  if (!dateMap['placed']) dateMap['placed'] = order.created_at;

  let cancelledFromIndex = -1;
  if (isCancelled) {
    const cancelEntry = history.find((e: OrderStatusHistory) => e.to_status === 'cancelled');
    cancelledFromIndex = cancelEntry?.from_status ? STATUS_ORDER.indexOf(cancelEntry.from_status) : -1;
  }

  return STEP_DEFINITIONS.map((step, index) => {
    const isCompleted = !isCancelled && currentStatusIndex >= index;
    const wasReachedBeforeCancel = isCancelled && !!dateMap[step.key];
    const isActive = !isCancelled && order.status === step.key;
    const showCancelled = isCancelled && index === cancelledFromIndex + 1;
    const stepDate = dateMap[step.key];

    return {
      ...step,
      completed: isCompleted || wasReachedBeforeCancel,
      active: isActive,
      cancelled: showCancelled,
      date: stepDate ? formatShortDateTime(stepDate) : undefined,
    };
  });
};

const OrderHistory = () => {
  const dispatch = useAppDispatch();
  const { orders, selectedOrder, loading } = useAppSelector((state) => state.orders);
  const { requests: cancelRequests, submitting: cancelSubmitting } = useAppSelector((state) => state.cancellations);
  const { requests: returnRequests, submitting: returnSubmitting } = useAppSelector((state) => state.returns);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState<{ orderId: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [cancelDetails, setCancelDetails] = useState('');

  // Return modal state
  const [returnModal, setReturnModal] = useState<{ orderId: string; items: OrderItem[] } | null>(null);
  const [returnReason, setReturnReason] = useState('Product damaged');
  const [returnDetails, setReturnDetails] = useState('');
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});

  // Pickup scheduling modal state
  const [pickupModal, setPickupModal] = useState<{ returnId: string; address: string } | null>(null);
  const [pickupDate, setPickupDate] = useState('');

  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchCancellationRequests());
    dispatch(fetchReturnRequests());
  }, [dispatch]);

  const toggleOrder = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      dispatch(fetchOrderById(orderId));
    }
  };

  const canRequestCancel = (order: Order): boolean => {
    if (!['placed', 'accepted', 'picking', 'packed'].includes(order.status)) return false;
    return !cancelRequests.some(r => r.order_id === order.id && r.status === 'pending');
  };

  const canRequestReturn = (order: Order): boolean => {
    if (order.status !== 'delivered') return false;
    if (!order.items) return false;
    // Only allow if at least one item still has units eligible for return.
    return order.items.some(i => i.is_returnable && i.returnable_quantity > 0);
  };

  const getExistingCancelRequest = (orderId: string) => {
    return cancelRequests.find(r => r.order_id === orderId);
  };

  const getExistingReturnRequest = (orderId: string) => {
    return returnRequests.find(r => r.order_id === orderId);
  };

  const openCancelModal = (orderId: string) => {
    setCancelModal({ orderId });
    setCancelReason('Changed my mind');
    setCancelDetails('');
  };

  const openReturnModal = (orderId: string, items: OrderItem[]) => {
    setReturnModal({ orderId, items });
    setReturnReason('Product damaged');
    setReturnDetails('');
    setReturnItems({});
  };

  const handleSubmitCancel = async () => {
    if (!cancelModal) return;
    const reason = cancelReason === 'Other' ? cancelDetails : cancelReason;
    if (!reason.trim()) return;
    await dispatch(createCancellationRequest({ order_id: cancelModal.orderId, reason }));
    setCancelModal(null);
    dispatch(fetchCancellationRequests());
  };

  const handleSubmitReturn = async () => {
    if (!returnModal) return;
    const reason = returnReason === 'Other' ? returnDetails : returnReason;
    if (!reason.trim()) return;
    const items = Object.entries(returnItems)
      .filter(([, qty]) => qty > 0)
      .map(([order_item_id, quantity]) => ({ order_item_id, quantity }));
    if (items.length === 0) return;
    await dispatch(createReturnRequest({ order_id: returnModal.orderId, reason, items }));
    setReturnModal(null);
    dispatch(fetchReturnRequests());
  };

  const formatAddress = (a: Order['address_snapshot']): string => {
    if (!a) return '';
    return [a.street, a.city, a.state, a.zip_code, a.country].filter(Boolean).join(', ');
  };

  const openPickupModal = (returnId: string, address: string) => {
    setPickupModal({ returnId, address });
    setPickupDate('');
  };

  const handleSchedulePickup = async () => {
    if (!pickupModal || !pickupDate) return;
    await dispatch(schedulePickup({ id: pickupModal.returnId, data: { pickup_date: pickupDate } }));
    setPickupModal(null);
    dispatch(fetchReturnRequests());
  };

  const handleWithdrawReturn = async (returnId: string) => {
    await dispatch(withdrawReturn(returnId));
    dispatch(fetchReturnRequests());
  };

  const toggleReturnItem = (itemId: string, maxQty: number) => {
    setReturnItems(prev => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: maxQty };
    });
  };

  if (loading && orders.length === 0) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-title-sm font-bold text-gray-800 mb-8">Order History</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No orders yet</h2>
          <p className="text-gray-500">Your order history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleOrder(order.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-6">
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Hash className="w-4 h-4" />
                      <span>Order #{String(order.id).substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {formatStatus(order.status)}
                    </span>
                    {(() => {
                      const c = getExistingCancelRequest(order.id);
                      const r = getExistingReturnRequest(order.id);
                      return (
                        <>
                          {c && order.status !== 'cancelled' && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium capitalize ${cancelPillColors[c.status] || 'bg-gray-100 text-gray-700'}`}>
                              <Ban className="w-3 h-3" /> Cancel {c.status}
                            </span>
                          )}
                          {r && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium capitalize ${returnPillColors[r.status] || 'bg-gray-100 text-gray-700'}`}>
                              <RotateCcw className="w-3 h-3" /> Return {r.status.replace('_', ' ')}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold text-gray-800">${Number(order.total).toFixed(2)}</span>
                  {expandedOrderId === order.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {expandedOrderId === order.id && selectedOrder?.id === order.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  {/* Step Tracker */}
                  {(() => {
                    const steps = getStepData(selectedOrder);
                    return (
                      <div className="flex items-center justify-between mb-6">
                        {steps.map((step, index) => (
                          <div key={step.key} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                step.completed ? 'bg-green-500 text-white' :
                                step.active ? 'bg-brand-500 text-white' :
                                step.cancelled ? 'bg-red-500 text-white' :
                                'bg-gray-200 text-gray-400'
                              }`}>
                                {step.completed ? <Check className="w-4 h-4" /> :
                                 step.cancelled ? <X className="w-4 h-4" /> :
                                 <span className="text-xs font-bold">{index + 1}</span>}
                              </div>
                              <span className="text-xs mt-1 text-gray-500">{step.label}</span>
                              {step.date && <span className="text-[10px] text-gray-400">{step.date}</span>}
                            </div>
                            {index < steps.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-2 ${step.completed ? 'bg-green-500' : 'bg-gray-200'}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Cancellation / Return & Refund timeline — attached to the fulfillment timeline above */}
                  {(() => {
                    const c = getExistingCancelRequest(selectedOrder.id);
                    const r = getExistingReturnRequest(selectedOrder.id);
                    if (!c && !r) return null;
                    return (
                      <div className="mb-6 space-y-5 rounded-xl border border-gray-200 bg-white p-4">
                        {c && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Ban className="w-4 h-4 text-red-400" /> Cancellation Request
                            </h4>
                            {renderTimeline(buildCancelSteps(c))}
                          </div>
                        )}
                        {r && (
                          <div className={c ? 'pt-4 border-t border-gray-100' : ''}>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <RotateCcw className="w-4 h-4 text-brand-400" /> Return &amp; Refund
                            </h4>
                            {renderTimeline(buildReturnSteps(r))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Payment line */}
                  <div className="flex items-center space-x-2 mb-4 text-sm text-gray-500">
                    <CreditCard className="w-4 h-4" />
                    <span>Paid via Stripe</span>
                  </div>

                  {/* Cancellation Reason */}
                  {selectedOrder.status === 'cancelled' && selectedOrder.cancellation_reason && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Order Cancelled</p>
                        <p className="text-sm text-red-600 mt-0.5">{selectedOrder.cancellation_reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Existing Cancellation Request Status */}
                  {(() => {
                    const existingCancel = getExistingCancelRequest(selectedOrder.id);
                    if (!existingCancel || selectedOrder.status === 'cancelled') return null;
                    return (
                      <div className={`mb-4 p-4 rounded-lg border flex items-start space-x-3 ${
                        existingCancel.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                        existingCancel.status === 'rejected' ? 'bg-red-50 border-red-200' :
                        'bg-green-50 border-green-200'
                      }`}>
                        <Ban className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          existingCancel.status === 'pending' ? 'text-amber-500' :
                          existingCancel.status === 'rejected' ? 'text-red-500' :
                          'text-green-500'
                        }`} />
                        <div>
                          <p className={`text-sm font-medium ${
                            existingCancel.status === 'pending' ? 'text-amber-800' :
                            existingCancel.status === 'rejected' ? 'text-red-800' :
                            'text-green-800'
                          }`}>
                            Cancellation Request {existingCancel.status === 'pending' ? 'Pending' : existingCancel.status === 'rejected' ? 'Rejected' : 'Approved'}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5">Reason: {existingCancel.reason}</p>
                          {existingCancel.admin_notes && (
                            <p className="text-sm text-gray-500 mt-0.5">Admin: {existingCancel.admin_notes}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">Submitted {formatDateTime(existingCancel.created_at)}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Existing Return Request Status */}
                  {(() => {
                    const existingReturn = getExistingReturnRequest(selectedOrder.id);
                    if (!existingReturn) return null;
                    const returnStatusColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                      requested: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' },
                      approved: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' },
                      rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' },
                      pickup_scheduled: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', icon: 'text-purple-500' },
                      received: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', icon: 'text-cyan-500' },
                      refunded: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: 'text-green-500' },
                    };
                    const colors = returnStatusColors[existingReturn.status] || returnStatusColors.requested;
                    const statusLabel = existingReturn.status.replace('_', ' ');
                    return (
                      <div className={`mb-4 p-4 rounded-lg border flex items-start space-x-3 ${colors.bg} ${colors.border}`}>
                        <RotateCcw className={`w-5 h-5 flex-shrink-0 mt-0.5 ${colors.icon}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium capitalize ${colors.text}`}>
                            Return Request: {statusLabel}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5">Reason: {existingReturn.reason}</p>
                          {existingReturn.items.length > 0 && (
                            <div className="mt-1">
                              {existingReturn.items.map((item, i) => (
                                <p key={i} className="text-xs text-gray-500">
                                  {item.product_name} x{item.quantity} — ${((item.product_price || 0) * item.quantity).toFixed(2)}
                                </p>
                              ))}
                            </div>
                          )}
                          {existingReturn.refund_amount && (
                            <p className="text-sm text-gray-600 mt-1">Refund amount: ${Number(existingReturn.refund_amount).toFixed(2)}</p>
                          )}
                          {existingReturn.pickup_date && (
                            <p className="text-xs text-gray-500 mt-1">Pickup: {formatDateTime(existingReturn.pickup_date)}</p>
                          )}
                          {existingReturn.admin_notes && (
                            <p className="text-sm text-gray-500 mt-0.5">Admin: {existingReturn.admin_notes}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">Submitted {formatDateTime(existingReturn.created_at)}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Items */}
                  {selectedOrder.items && (
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{item.product_name.substring(0, 2).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{item.product_name}</p>
                              <p className="text-sm text-gray-500">Qty: {item.quantity} x ${Number(item.product_price).toFixed(2)}</p>
                              {selectedOrder.status === 'delivered' && item.is_returnable && (
                                item.returned_quantity > 0 && item.returnable_quantity === 0 ? (
                                  <p className="text-xs text-gray-400 mt-0.5">Returned &amp; refunded</p>
                                ) : item.returned_quantity > 0 ? (
                                  <p className="text-xs text-amber-600 mt-0.5">
                                    {item.returned_quantity} returned &middot; {item.returnable_quantity} still returnable
                                  </p>
                                ) : (
                                  <p className="text-xs text-brand-500 mt-0.5">
                                    Returnable{item.return_window_days ? ` within ${item.return_window_days} days` : ''}
                                  </p>
                                )
                              )}
                            </div>
                          </div>
                          <p className="font-medium text-gray-800">${(item.quantity * Number(item.product_price)).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Address */}
                  {selectedOrder.address_snapshot && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Address</h4>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.address_snapshot.street}, {selectedOrder.address_snapshot.city}, {selectedOrder.address_snapshot.state} {selectedOrder.address_snapshot.zip_code}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
                    {canRequestCancel(selectedOrder) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openCancelModal(selectedOrder.id); }}
                        className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-medium text-sm"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Request Cancellation</span>
                      </button>
                    )}
                    {canRequestReturn(selectedOrder) && selectedOrder.items && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openReturnModal(selectedOrder.id, selectedOrder.items!.filter(i => i.is_returnable && i.returnable_quantity > 0)); }}
                        className="flex items-center space-x-2 px-4 py-2 border border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 transition font-medium text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Request Return</span>
                      </button>
                    )}

                    {/* Customer-driven return actions */}
                    {(() => {
                      const r = getExistingReturnRequest(selectedOrder.id);
                      if (!r) return null;
                      return (
                        <>
                          {r.status === 'approved' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openPickupModal(r.id, formatAddress(selectedOrder.address_snapshot)); }}
                              className="flex items-center space-x-2 px-4 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition font-medium text-sm"
                            >
                              <Truck className="w-4 h-4" />
                              <span>Schedule Pickup</span>
                            </button>
                          )}
                          {r.status === 'pickup_scheduled' && (
                            <span className="flex items-center space-x-2 px-4 py-2 text-indigo-600 bg-indigo-50 rounded-lg font-medium text-sm">
                              <Truck className="w-4 h-4" />
                              <span>Awaiting courier pickup</span>
                            </span>
                          )}
                          {['requested', 'approved', 'pickup_scheduled'].includes(r.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleWithdrawReturn(r.id); }}
                              disabled={returnSubmitting}
                              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition font-medium text-sm disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              <span>Withdraw Return</span>
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel Request Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Ban className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-800">Request Cancellation</h2>
              </div>
              <button onClick={() => setCancelModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Your cancellation request will be reviewed by our team.
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
              {cancelReason === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Details (required)</label>
                  <textarea
                    value={cancelDetails}
                    onChange={(e) => setCancelDetails(e.target.value)}
                    placeholder="Please describe your reason..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 resize-none"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCancelModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCancel}
                disabled={cancelSubmitting || (cancelReason === 'Other' && !cancelDetails.trim())}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium text-sm disabled:opacity-50 flex items-center space-x-2"
              >
                {cancelSubmitting && <ButtonSpinner />}
                <span>Submit Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-brand-500" />
                <h2 className="text-lg font-semibold text-gray-800">Request Return</h2>
              </div>
              <button onClick={() => setReturnModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Select the items you'd like to return. Only returnable items within the return window are shown.
            </p>

            <div className="space-y-3 mb-4">
              {returnModal.items.map((item) => {
                const isSelected = !!returnItems[item.id];
                return (
                  <label key={item.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    isSelected ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleReturnItem(item.id, item.returnable_quantity)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                        <p className="text-xs text-gray-500">
                          ${Number(item.product_price).toFixed(2)} each &middot; {item.returnable_quantity} eligible
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-500">Qty:</label>
                        <select
                          value={returnItems[item.id] || 1}
                          onChange={(e) => setReturnItems(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                          className="px-2 py-1 border border-gray-200 rounded text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                        >
                          {Array.from({ length: item.returnable_quantity }, (_, i) => i + 1).map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>

            {Object.keys(returnItems).length > 0 && (
              <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  Estimated refund: $
                  {Object.entries(returnItems).reduce((sum, [itemId, qty]) => {
                    const item = returnModal.items.find(i => i.id === itemId);
                    return sum + (item ? Number(item.product_price) * qty : 0);
                  }, 0).toFixed(2)}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for return</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {returnReason === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Details (required)</label>
                  <textarea
                    value={returnDetails}
                    onChange={(e) => setReturnDetails(e.target.value)}
                    placeholder="Please describe the issue..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setReturnModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={
                  returnSubmitting ||
                  Object.keys(returnItems).length === 0 ||
                  (returnReason === 'Other' && !returnDetails.trim())
                }
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium text-sm disabled:opacity-50 flex items-center space-x-2"
              >
                {returnSubmitting && <ButtonSpinner />}
                <span>Submit Return Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Pickup Modal */}
      {pickupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-800">Schedule Pickup</h2>
              </div>
              <button onClick={() => setPickupModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Choose a date for our courier to collect the item.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
                />
              </div>
              {pickupModal.address && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Pickup Address
                  </p>
                  <p className="text-sm text-gray-700">{pickupModal.address}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Same as your delivery address.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setPickupModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedulePickup}
                disabled={returnSubmitting || !pickupDate}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-medium text-sm disabled:opacity-50 flex items-center space-x-2"
              >
                {returnSubmitting && <ButtonSpinner />}
                <span>Confirm Pickup</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
