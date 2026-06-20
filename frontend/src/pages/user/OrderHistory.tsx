import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchOrders, fetchOrderById } from '../../store/slices/orderSlice';
import { Package, ChevronDown, ChevronUp, Calendar, Hash, Check, X, XCircle, CreditCard } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Order, OrderStatusHistory } from '../../types';

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

const getStepData = (order: Order) => {
  const history = order.status_history || [];
  const isCancelled = order.status === 'cancelled';

  // Find the index of the current status in the flow
  const currentStatusIndex = STATUS_ORDER.indexOf(order.status);

  // Build date map from status_history
  const dateMap: Record<string, string> = {};
  history.forEach((entry: OrderStatusHistory) => {
    if (!dateMap[entry.to_status]) {
      dateMap[entry.to_status] = entry.created_at;
    }
  });

  // Order placed date is always the order creation date
  dateMap['order_placed'] = order.created_at;

  return STEP_DEFINITIONS.map((step, index) => {
    const stepStatusIndex = index - 1; // offset because index 0 is "order_placed"

    if (step.key === 'order_placed') {
      // Order placed is always completed
      return {
        ...step,
        completed: true,
        active: false,
        cancelled: false,
        date: new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      };
    }

    const isCompleted = currentStatusIndex >= stepStatusIndex && !isCancelled;
    const wasReachedBeforeCancel = isCancelled && dateMap[step.key];
    const isActive = !isCancelled && order.status === step.key;

    // Show cancelled marker on the step after the last completed step
    let showCancelled = false;
    if (isCancelled) {
      // Find the last status reached before cancellation
      const cancelEntry = history.find((e: OrderStatusHistory) => e.to_status === 'cancelled');
      const cancelledFrom = cancelEntry?.from_status;
      const cancelledFromIndex = cancelledFrom ? STATUS_ORDER.indexOf(cancelledFrom) : -1;
      // Show cancelled on the step right after the cancelled-from step
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
      date: stepDate
        ? new Date(stepDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : undefined,
    };
  });
};

const OrderHistory = () => {
  const dispatch = useAppDispatch();
  const { orders, selectedOrder, loading } = useAppSelector((state) => state.orders);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const toggleOrder = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      dispatch(fetchOrderById(orderId));
    }
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
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
