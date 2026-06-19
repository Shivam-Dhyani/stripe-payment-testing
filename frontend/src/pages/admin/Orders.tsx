import { useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams, themeAlpine } from 'ag-grid-community';
import { Eye, X, CheckCircle, XCircle, Clock, CreditCard, Truck, RefreshCw } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchAllOrders, updateOrderStatus } from '../../store/slices/orderSlice';
import { Order, PaymentEvent } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const Orders = () => {
  const dispatch = useAppDispatch();
  const { orders, loading } = useAppSelector((state) => state.orders);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  const viewOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setDetailOrder(order);
    }
  };

  const closeDetail = () => {
    setDetailOrder(null);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    await dispatch(updateOrderStatus({ id: orderId, status: newStatus }));
    dispatch(fetchAllOrders());
    setUpdatingOrderId(null);
  };

  const filteredOrders = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  const StatusCellRenderer = (params: ICellRendererParams) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[params.value] || 'bg-gray-100 text-gray-700'}`}>
      {params.value}
    </span>
  );

  const ActionCellRenderer = (params: ICellRendererParams) => (
    <div className="flex items-center space-x-2 h-full">
      <button
        onClick={() => viewOrder(params.data.id)}
        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition"
      >
        <Eye className="w-4 h-4" />
      </button>
      <select
        value={params.data.status}
        onChange={(e) => handleStatusChange(params.data.id, e.target.value)}
        disabled={updatingOrderId === params.data.id}
        className="text-xs border border-gray-300 rounded px-1 py-1 bg-white disabled:opacity-50"
      >
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="shipped">Shipped</option>
        <option value="delivered">Delivered</option>
        <option value="cancelled">Cancelled</option>
      </select>
      {updatingOrderId === params.data.id && <ButtonSpinner />}
    </div>
  );

  const DateCellRenderer = (params: ICellRendererParams) => (
    <span>{new Date(params.value).toLocaleDateString()}</span>
  );

  const PriceCellRenderer = (params: ICellRendererParams) => (
    <span>${Number(params.value).toFixed(2)}</span>
  );

  const columnDefs: ColDef[] = [
    { field: 'id', headerName: 'Order ID', width: 100, valueFormatter: (params) => `#${params.value}` },
    { field: 'user_id', headerName: 'Customer ID', width: 110 },
    {
      headerName: 'Items',
      width: 90,
      valueGetter: (params) => params.data?.items?.length || '-',
    },
    { field: 'total', headerName: 'Total', width: 110, cellRenderer: PriceCellRenderer },
    { field: 'status', headerName: 'Status', width: 130, cellRenderer: StatusCellRenderer },
    { field: 'created_at', headerName: 'Date', width: 120, cellRenderer: DateCellRenderer },
    { headerName: 'Actions', width: 200, cellRenderer: ActionCellRenderer, sortable: false, filter: false },
  ];

  const defaultColDef: ColDef = { sortable: true, resizable: true };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-bold text-slate-800">Orders</h1>
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100" style={{ height: 500 }}>
        <AgGridReact
          theme={themeAlpine}
          rowData={filteredOrders}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={10}
          loading={loading}
        />
      </div>

      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Order #{detailOrder.id}</h2>
              <button onClick={closeDetail} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[detailOrder.status] || ''}`}>
                  {detailOrder.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="font-semibold text-lg">${Number(detailOrder.total).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Date</p>
                <p className="font-medium">{new Date(detailOrder.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment ID</p>
                <p className="font-medium text-xs break-all">{detailOrder.stripe_payment_intent_id || '-'}</p>
              </div>
            </div>

            {detailOrder.payment_events && detailOrder.payment_events.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 mb-3">Payment Timeline</h3>
                <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                  {detailOrder.payment_events.map((event: PaymentEvent, index: number) => {
                    const isLast = index === detailOrder.payment_events!.length - 1;
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
                            <span className="text-xs text-slate-400">
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                          {event.message && (
                            <p className="text-sm text-slate-600 mt-0.5">{event.message}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!detailOrder.payment_events || detailOrder.payment_events.length === 0) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-slate-800 mb-2">Payment Timeline</h3>
                <div className="flex items-center space-x-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm">No payment events recorded for this order</p>
                </div>
              </div>
            )}

            {detailOrder.address_snapshot && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-slate-800 mb-2">Delivery Address</h3>
                <p className="text-sm text-slate-600">{detailOrder.address_snapshot.street}</p>
                <p className="text-sm text-slate-600">
                  {detailOrder.address_snapshot.city}, {detailOrder.address_snapshot.state} {detailOrder.address_snapshot.zip_code}
                </p>
                <p className="text-sm text-slate-600">{detailOrder.address_snapshot.country}</p>
              </div>
            )}

            {detailOrder.items && (
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Items</h3>
                <div className="space-y-3">
                  {detailOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{item.product_name.substring(0, 2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{item.product_name}</p>
                          <p className="text-sm text-slate-500">Qty: {item.quantity} x ${Number(item.product_price).toFixed(2)}</p>
                        </div>
                      </div>
                      <p className="font-medium">${(item.quantity * Number(item.product_price)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={closeDetail}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
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
