import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchOrders, fetchOrderById } from '../../store/slices/orderSlice';
import { createCancellationRequest, fetchCancellationRequests } from '../../store/slices/cancellationSlice';
import { createReturnRequest, fetchReturnRequests } from '../../store/slices/returnSlice';
import { Package, ChevronDown, ChevronUp, Calendar, Hash, Check, X, XCircle, CreditCard, Ban, RotateCcw } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { Order, OrderItem, OrderStatusHistory } from '../../types';
import { formatDate, formatShortDateTime, formatDateTime } from '../../utils/date';

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

const STEP_DEFINITIONS = [
  { key: 'order_placed', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const STATUS_ORDER = ['confirmed', 'processing', 'shipped', 'delivered'];

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
  dateMap['order_placed'] = order.created_at;

  return STEP_DEFINITIONS.map((step, index) => {
    const stepStatusIndex = index - 1;

    if (step.key === 'order_placed') {
      return {
        ...step,
        completed: true,
        active: false,
        cancelled: false,
        date: formatShortDateTime(order.created_at),
      };
    }

    const isCompleted = currentStatusIndex >= stepStatusIndex && !isCancelled;
    const wasReachedBeforeCancel = isCancelled && dateMap[step.key];
    const isActive = !isCancelled && order.status === step.key;

    let showCancelled = false;
    if (isCancelled) {
      const cancelEntry = history.find((e: OrderStatusHistory) => e.to_status === 'cancelled');
      const cancelledFrom = cancelEntry?.from_status;
      const cancelledFromIndex = cancelledFrom ? STATUS_ORDER.indexOf(cancelledFrom) : -1;
      if (stepStatusIndex === cancelledFromIndex + 1) {
        showCancelled = true;
      }
    }

    const stepDate = dateMap[step.key];

    return {
      ...step,
      completed: isCompleted || !!wasReachedBeforeCancel,
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
    if (!['confirmed', 'processing', 'shipped'].includes(order.status)) return false;
    return !cancelRequests.some(r => r.order_id === order.id && r.status === 'pending');
  };

  const canRequestReturn = (order: Order): boolean => {
    if (order.status !== 'delivered') return false;
    return !returnRequests.some(r => r.order_id === order.id && ['requested', 'approved', 'pickup_scheduled'].includes(r.status));
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
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
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
                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
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
                        onClick={(e) => { e.stopPropagation(); openReturnModal(selectedOrder.id, selectedOrder.items!); }}
                        className="flex items-center space-x-2 px-4 py-2 border border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 transition font-medium text-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Request Return</span>
                      </button>
                    )}
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
                        onChange={() => toggleReturnItem(item.id, item.quantity)}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                        <p className="text-xs text-gray-500">${Number(item.product_price).toFixed(2)} each</p>
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
                          {Array.from({ length: item.quantity }, (_, i) => i + 1).map(n => (
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
    </div>
  );
};

export default OrderHistory;
