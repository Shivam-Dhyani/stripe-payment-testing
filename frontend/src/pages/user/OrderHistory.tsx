import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchOrders, fetchOrderById } from '../../store/slices/orderSlice';
import { Package, ChevronDown, ChevronUp, Calendar, Hash } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
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
      <h1 className="text-3xl font-bold text-slate-800 mb-8">Order History</h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No orders yet</h2>
          <p className="text-slate-500">Your order history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => toggleOrder(order.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-6">
                  <div>
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <Hash className="w-4 h-4" />
                      <span>Order #{String(order.id).substring(0, 8)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold text-slate-800">${Number(order.total).toFixed(2)}</span>
                  {expandedOrderId === order.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {expandedOrderId === order.id && selectedOrder?.id === order.id && selectedOrder.items && (
                <div className="border-t border-gray-100 p-6 bg-gray-50">
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{item.product_name.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{item.product_name}</p>
                            <p className="text-sm text-slate-500">Qty: {item.quantity} x ${Number(item.product_price).toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="font-medium text-slate-800">${(item.quantity * Number(item.product_price)).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  {selectedOrder.address_snapshot && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Delivery Address</h4>
                      <p className="text-sm text-slate-600">
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
