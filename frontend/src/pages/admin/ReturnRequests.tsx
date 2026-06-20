import { useEffect, useState } from 'react';
import { Eye, X, CheckCircle, XCircle, Clock, Search, Truck, Package, RefreshCw, ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchReturnRequests, resolveReturnRequest } from '../../store/slices/returnSlice';
import { ReturnRequest } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { formatDateTime } from '../../utils/date';

const statusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  pickup_scheduled: 'bg-purple-100 text-purple-700',
  received: 'bg-cyan-100 text-cyan-700',
  refunded: 'bg-green-100 text-green-700',
};

type ActionType = 'approved' | 'rejected' | 'pickup_scheduled' | 'received' | 'refunded';

interface ActionModal {
  request: ReturnRequest;
  action: ActionType;
}

const getActionTitle = (action: ActionType): string => {
  switch (action) {
    case 'approved': return 'Approve Return';
    case 'rejected': return 'Reject Return';
    case 'pickup_scheduled': return 'Schedule Pickup';
    case 'received': return 'Mark as Received';
    case 'refunded': return 'Process Refund';
  }
};

const getActionIcon = (action: ActionType) => {
  switch (action) {
    case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
    case 'pickup_scheduled': return <Truck className="w-5 h-5 text-purple-500" />;
    case 'received': return <Package className="w-5 h-5 text-cyan-500" />;
    case 'refunded': return <RefreshCw className="w-5 h-5 text-green-500" />;
  }
};

const getConfirmButtonStyle = (action: ActionType): string => {
  switch (action) {
    case 'approved': return 'bg-green-500 hover:bg-green-600';
    case 'rejected': return 'bg-red-500 hover:bg-red-600';
    case 'pickup_scheduled': return 'bg-purple-500 hover:bg-purple-600';
    case 'received': return 'bg-cyan-500 hover:bg-cyan-600';
    case 'refunded': return 'bg-green-500 hover:bg-green-600';
  }
};

const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ');
};

const statusTimeline: string[] = ['requested', 'approved', 'pickup_scheduled', 'received', 'refunded'];

const getCompletedStatuses = (currentStatus: string): string[] => {
  if (currentStatus === 'rejected') return ['requested', 'rejected'];
  const idx = statusTimeline.indexOf(currentStatus);
  if (idx === -1) return ['requested'];
  return statusTimeline.slice(0, idx + 1);
};

const ReturnRequests = () => {
  const dispatch = useAppDispatch();
  const { requests, loading, submitting } = useAppSelector((state) => state.returns);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [actionModal, setActionModal] = useState<ActionModal | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');

  useEffect(() => {
    dispatch(fetchReturnRequests());
  }, [dispatch]);

  const activeCount = requests.filter(
    (r) => r.status === 'requested' || r.status === 'approved' || r.status === 'pickup_scheduled'
  ).length;

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter ? r.status === statusFilter : true;
    const matchesSearch = search
      ? r.order_id.toLowerCase().includes(search.toLowerCase()) ||
        (r.customer_email || '').toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredRequests.length / perPage);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  const openActionModal = (request: ReturnRequest, action: ActionType) => {
    setActionModal({ request, action });
    setAdminNotes('');
    setPickupDate('');
    setPickupAddress('');
  };

  const closeActionModal = () => {
    setActionModal(null);
    setAdminNotes('');
    setPickupDate('');
    setPickupAddress('');
  };

  const handleResolve = async () => {
    if (!actionModal) return;
    if (actionModal.action === 'pickup_scheduled' && (!pickupDate || !pickupAddress.trim())) return;

    await dispatch(
      resolveReturnRequest({
        id: actionModal.request.id,
        data: {
          status: actionModal.action,
          admin_notes: adminNotes || undefined,
          pickup_date: actionModal.action === 'pickup_scheduled' ? pickupDate : undefined,
          pickup_address: actionModal.action === 'pickup_scheduled' ? pickupAddress : undefined,
        },
      })
    );
    closeActionModal();
    dispatch(fetchReturnRequests());
  };

  const viewRequest = (request: ReturnRequest) => {
    setSelectedRequest(request);
  };

  const closeDetail = () => {
    setSelectedRequest(null);
  };

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

  const getTimelineIcon = (status: string) => {
    switch (status) {
      case 'requested': return <Clock className="w-3.5 h-3.5" />;
      case 'approved': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'rejected': return <XCircle className="w-3.5 h-3.5" />;
      case 'pickup_scheduled': return <Truck className="w-3.5 h-3.5" />;
      case 'received': return <Package className="w-3.5 h-3.5" />;
      case 'refunded': return <RefreshCw className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const getTimelineColor = (status: string) => {
    switch (status) {
      case 'requested': return { color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'approved': return { color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'rejected': return { color: 'text-red-600', bg: 'bg-red-100' };
      case 'pickup_scheduled': return { color: 'text-purple-600', bg: 'bg-purple-100' };
      case 'received': return { color: 'text-cyan-600', bg: 'bg-cyan-100' };
      case 'refunded': return { color: 'text-green-600', bg: 'bg-green-100' };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h1 className="text-title-sm font-bold text-gray-800">Return Requests</h1>
          {activeCount > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              {activeCount} active
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
            placeholder="Search by order ID or customer email..."
            className="pl-9 pr-4 py-2 h-10 w-72 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 h-10 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
        >
          <option value="">All Statuses</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="pickup_scheduled">Pickup Scheduled</option>
          <option value="received">Received</option>
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
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Refund Amount</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Requested</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No return requests found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-gray-500">#{request.order_id.substring(0, 8)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-800">{request.customer_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{request.customer_email || '-'}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-800">
                      {request.items.length} {request.items.length === 1 ? 'item' : 'items'}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-800">
                      ${Number(request.refund_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[request.status] || 'bg-gray-100 text-gray-700'}`}>
                        {formatStatus(request.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-800">
                      {formatDateTime(request.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {request.status === 'requested' && (
                          <>
                            <button
                              onClick={() => openActionModal(request, 'approved')}
                              disabled={submitting}
                              className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openActionModal(request, 'rejected')}
                              disabled={submitting}
                              className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 font-medium"
                              title="Reject"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <button
                            onClick={() => openActionModal(request, 'pickup_scheduled')}
                            disabled={submitting}
                            className="text-xs px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 font-medium"
                            title="Schedule Pickup"
                          >
                            Schedule Pickup
                          </button>
                        )}
                        {request.status === 'pickup_scheduled' && (
                          <button
                            onClick={() => openActionModal(request, 'received')}
                            disabled={submitting}
                            className="text-xs px-3 py-1.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 font-medium"
                            title="Mark Received"
                          >
                            Mark Received
                          </button>
                        )}
                        {request.status === 'received' && (
                          <button
                            onClick={() => openActionModal(request, 'refunded')}
                            disabled={submitting}
                            className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                            title="Process Refund"
                          >
                            Process Refund
                          </button>
                        )}
                        {(request.status === 'rejected' || request.status === 'refunded') && (
                          <button
                            onClick={() => viewRequest(request)}
                            className="p-1.5 text-brand-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredRequests.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Showing {Math.min((currentPage - 1) * perPage + 1, filteredRequests.length)} to {Math.min(currentPage * perPage, filteredRequests.length)} of {filteredRequests.length} results
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

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getActionIcon(actionModal.action)}
                <h2 className="text-lg font-semibold text-gray-800">
                  {getActionTitle(actionModal.action)}
                </h2>
              </div>
              <button onClick={closeActionModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Order <span className="font-mono">#{actionModal.request.order_id.substring(0, 8)}</span>
              {actionModal.request.refund_amount != null && (
                <> &middot; Refund: <span className="font-medium text-gray-700">${Number(actionModal.request.refund_amount).toFixed(2)}</span></>
              )}
            </p>

            {/* Return Items List */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Return Items</h4>
              <div className="space-y-2">
                {actionModal.request.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-800">{item.product_name || 'Unknown Product'}</span>
                      <span className="text-gray-400 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="text-gray-600">${Number(item.product_price || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* Pickup fields for Schedule Pickup action */}
              {actionModal.action === 'pickup_scheduled' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      Pickup Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="w-3.5 h-3.5 inline mr-1" />
                      Pickup Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Enter the pickup address..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 resize-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this action..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeActionModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={submitting || (actionModal.action === 'pickup_scheduled' && (!pickupDate || !pickupAddress.trim()))}
                className={`px-4 py-2 text-white rounded-lg transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonStyle(actionModal.action)}`}
              >
                {submitting ? <ButtonSpinner /> : `Confirm ${getActionTitle(actionModal.action)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Return Request Details</h2>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono text-sm font-medium text-gray-800">#{selectedRequest.order_id.substring(0, 8)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[selectedRequest.status] || 'bg-gray-100 text-gray-700'}`}>
                  {formatStatus(selectedRequest.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium text-gray-800">{selectedRequest.customer_name || 'Unknown'}</p>
                <p className="text-xs text-gray-400">{selectedRequest.customer_email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requested</p>
                <p className="font-medium text-gray-800">{formatDateTime(selectedRequest.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Refund Amount</p>
                <p className="font-semibold text-lg">${Number(selectedRequest.refund_amount || 0).toFixed(2)}</p>
              </div>
              {selectedRequest.resolver_name && (
                <div>
                  <p className="text-sm text-gray-500">Resolved By</p>
                  <p className="font-medium text-gray-800">{selectedRequest.resolver_name}</p>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Return Reason</h3>
              <p className="text-sm text-gray-600">{selectedRequest.reason}</p>
            </div>

            {/* Return Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Return Items</h3>
              <div className="space-y-3">
                {selectedRequest.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {(item.product_name || 'UN').substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{item.product_name || 'Unknown Product'}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity} x ${Number(item.product_price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="font-medium">${(item.quantity * Number(item.product_price || 0)).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Timeline */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Status Timeline</h3>
              <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                {getCompletedStatuses(selectedRequest.status).map((status, index, arr) => {
                  const isLast = index === arr.length - 1;
                  const { color, bg } = getTimelineColor(status);
                  return (
                    <div key={status} className="relative">
                      <div className={`absolute -left-[calc(0.75rem+1px)] top-0 w-6 h-6 rounded-full flex items-center justify-center ${bg} ${color} ${isLast ? 'ring-2 ring-offset-2 ring-current' : ''}`}>
                        {getTimelineIcon(status)}
                      </div>
                      <div className="ml-4">
                        <span className={`text-sm font-semibold capitalize ${color}`}>
                          {formatStatus(status)}
                        </span>
                        {status === 'requested' && (
                          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(selectedRequest.created_at)}</p>
                        )}
                        {status === selectedRequest.status && status !== 'requested' && (
                          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(selectedRequest.updated_at)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Notes */}
            {selectedRequest.admin_notes && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Admin Notes</h3>
                <p className="text-sm text-gray-600">{selectedRequest.admin_notes}</p>
              </div>
            )}

            {/* Pickup Details */}
            {selectedRequest.pickup_date && (
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Pickup Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-600">Date: {selectedRequest.pickup_date}</span>
                  </div>
                  {selectedRequest.pickup_address && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-purple-500 mt-0.5" />
                      <span className="text-sm text-gray-600">{selectedRequest.pickup_address}</span>
                    </div>
                  )}
                </div>
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

export default ReturnRequests;
