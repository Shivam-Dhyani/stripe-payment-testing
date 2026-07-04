import { useEffect, useState } from 'react';
import { Eye, X, Clock, Search, Truck, Package, ChevronLeft, ChevronRight, Calendar, MapPin, RotateCcw, CheckCircle2, CalendarClock, PackageCheck, Warehouse, BadgeCheck } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchReturnRequests, resolveReturnRequest, assignReturnRider } from '../../store/slices/returnSlice';
import { staffService } from '../../services/warehouseService';
import { ReturnRequest, User } from '../../types';
import StatusTimeline, { TimelineStep } from '../../components/common/StatusTimeline';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { formatDateTime } from '../../utils/date';
import { useConfirm } from '../../components/common/ConfirmDialog';

const statusColors: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  pickup_scheduled: 'bg-purple-100 text-purple-700',
  handed_over: 'bg-indigo-100 text-indigo-700',
  received: 'bg-cyan-100 text-cyan-700',
  refunded: 'bg-green-100 text-green-700',
  withdrawn: 'bg-gray-100 text-gray-600',
};

type ActionType = 'approved' | 'rejected' | 'pickup_scheduled' | 'received' | 'refunded';

const getActionTitle = (action: ActionType): string => {
  switch (action) {
    case 'approved': return 'Approve Return';
    case 'rejected': return 'Reject Return';
    case 'pickup_scheduled': return 'Schedule Pickup';
    case 'received': return 'Mark as Received';
    case 'refunded': return 'Process Refund';
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

// Admin-facing timeline labels.
const timelineLabels: Record<string, string> = {
  requested: 'Return requested',
  approved: 'Approved',
  rejected: 'Rejected',
  pickup_scheduled: 'Pickup scheduled',
  handed_over: 'Picked up by rider',
  received: 'Received at warehouse',
  refunded: 'Refunded',
  withdrawn: 'Withdrawn',
};

const roleLabels: Record<string, string> = {
  customer: 'Customer',
  admin: 'Admin',
  delivery_partner: 'Delivery Partner',
  warehouse_operator: 'Warehouse',
};

// Per-step icons for the shared status timeline (rejected/withdrawn use the
// component's built-in rejected marker instead).
const returnStepIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  requested: RotateCcw,
  approved: CheckCircle2,
  pickup_scheduled: CalendarClock,
  handed_over: PackageCheck,
  received: Warehouse,
  refunded: BadgeCheck,
};

// Build timeline steps from the return's status history, preserving the
// done/current/rejected state, raw dates, and the acting user's name + role.
const buildReturnTimeline = (request: ReturnRequest): TimelineStep[] => {
  const history = request.status_history || [];
  return history.map((h, index): TimelineStep => {
    const isLast = index === history.length - 1;
    const rejected = h.status === 'rejected' || h.status === 'withdrawn';
    const actor = h.actor_name
      ? `by ${h.actor_name}${h.actor_role ? ` · ${roleLabels[h.actor_role] || h.actor_role}` : ''}`
      : undefined;
    return {
      key: `${h.status}-${index}`,
      label: timelineLabels[h.status] || formatStatus(h.status),
      sub: actor,
      date: h.created_at,
      state: rejected ? 'rejected' : isLast ? 'current' : 'done',
      icon: rejected ? undefined : returnStepIcons[h.status],
    };
  });
};

const ReturnRequests = () => {
  const dispatch = useAppDispatch();
  const confirm = useConfirm();
  const { requests, loading, submitting } = useAppSelector((state) => state.returns);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
  const [selectedRider, setSelectedRider] = useState('');

  // Assign-rider modal (from the list)
  const [assignModal, setAssignModal] = useState<ReturnRequest | null>(null);
  const [assignRiderId, setAssignRiderId] = useState('');
  const [assigningRider, setAssigningRider] = useState(false);

  useEffect(() => {
    dispatch(fetchReturnRequests());
    staffService.getByRole('delivery_partner').then(setDeliveryPartners).catch(() => {});
  }, [dispatch]);

  // Auto-refresh so incoming return requests and status changes appear without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      dispatch(fetchReturnRequests());
    }, 15000);
    return () => clearInterval(id);
  }, [dispatch]);

  const handleAssignRider = async () => {
    if (!selectedRequest || !selectedRider) return;
    const result = await dispatch(assignReturnRider({ id: selectedRequest.id, deliveryPartnerId: selectedRider }));
    if (assignReturnRider.fulfilled.match(result)) {
      setSelectedRequest(result.payload);
    }
  };

  const openAssignModal = (request: ReturnRequest) => {
    setAssignModal(request);
    setAssignRiderId(request.delivery_partner_id || '');
  };

  const submitAssignRider = async () => {
    if (!assignModal || !assignRiderId) return;
    setAssigningRider(true);
    const result = await dispatch(assignReturnRider({ id: assignModal.id, deliveryPartnerId: assignRiderId }));
    setAssigningRider(false);
    if (assignReturnRider.fulfilled.match(result)) {
      setAssignModal(null);
      dispatch(fetchReturnRequests());
    }
  };

  const activeCount = requests.filter(
    (r) => ['requested', 'approved', 'pickup_scheduled', 'handed_over', 'received'].includes(r.status)
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

  // Admin actions only. Scheduling pickup and confirming hand-over are done by the customer.
  const nextActionsFor = (status: string): ActionType[] => {
    switch (status) {
      case 'requested': return ['rejected', 'approved'];
      case 'handed_over': return ['received'];
      case 'received': return ['refunded'];
      default: return [];
    }
  };

  // Statuses where the admin is waiting on the customer or rider's next move.
  const waitingOnCustomer = (status: string): string | null => {
    if (status === 'approved') return 'Waiting for the customer to schedule a pickup.';
    if (status === 'pickup_scheduled') return 'Waiting for the assigned rider to collect the item.';
    return null;
  };

  const confirmForAction = (action: ActionType) => {
    if (action === 'approved') {
      return { title: 'Approve return?', message: 'The customer will be able to schedule a pickup for the item.', confirmLabel: 'Approve' };
    }
    if (action === 'rejected') {
      return { title: 'Reject return?', message: 'The customer will be notified that their return was declined.', confirmLabel: 'Reject', tone: 'danger' as const };
    }
    if (action === 'refunded') {
      const amt = Number(selectedRequest?.refund_amount || 0).toFixed(2);
      return { title: 'Process refund?', message: `$${amt} will be refunded to the customer. This can't be undone.`, confirmLabel: 'Refund' };
    }
    return null; // 'received' is a routine step — no confirmation
  };

  const handleResolve = async (action: ActionType) => {
    if (!selectedRequest) return;
    const opts = confirmForAction(action);
    if (opts && !(await confirm(opts))) return;
    await dispatch(
      resolveReturnRequest({
        id: selectedRequest.id,
        data: {
          status: action,
          admin_notes: adminNotes || undefined,
        },
      })
    );
    closeDetail();
    dispatch(fetchReturnRequests());
  };

  const viewRequest = (request: ReturnRequest) => {
    setSelectedRequest(request);
    setAdminNotes('');
    setSelectedRider(request.delivery_partner_id || '');
  };

  const closeDetail = () => {
    setSelectedRequest(null);
    setAdminNotes('');
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
          <option value="handed_over">Handed Over</option>
          <option value="received">Received</option>
          <option value="refunded">Refunded</option>
          <option value="withdrawn">Withdrawn</option>
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
                        {['approved', 'pickup_scheduled'].includes(request.status) && (
                          request.delivery_partner_id ? (
                            <button
                              onClick={() => openAssignModal(request)}
                              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                              title="Reassign pickup rider"
                            >
                              <Truck className="w-3.5 h-3.5 text-brand-500" />
                              {request.delivery_partner_name || 'Rider'}
                            </button>
                          ) : (
                            <button
                              onClick={() => openAssignModal(request)}
                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                                request.status === 'pickup_scheduled'
                                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                                  : 'border border-brand-300 text-brand-600 hover:bg-brand-50'
                              }`}
                              title={request.status === 'pickup_scheduled' ? 'Pickup scheduled — assign a rider to collect' : 'Assign a pickup rider'}
                            >
                              <Truck className="w-3.5 h-3.5" />
                              Assign Rider
                            </button>
                          )
                        )}
                        {(() => {
                          const isActionable = nextActionsFor(request.status).length > 0;
                          return (
                            <button
                              onClick={() => viewRequest(request)}
                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                                isActionable
                                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                                  : 'text-brand-500 hover:bg-gray-100'
                              }`}
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                              {isActionable ? 'Review' : 'View'}
                            </button>
                          );
                        })()}
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

      {/* Assign Rider Modal (from the list) */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-brand-500" />
                <h2 className="text-lg font-semibold text-gray-800">Assign Pickup Rider</h2>
              </div>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Return for order <span className="font-mono">#{assignModal.order_id.substring(0, 8)}</span> — assign a rider to collect the item from the customer.
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

            {/* Status Timeline — every transition with time + who did it */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Status Timeline</h3>
              <StatusTimeline steps={buildReturnTimeline(selectedRequest)} />
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

            {/* Return Pickup Rider */}
            {['approved', 'pickup_scheduled', 'handed_over'].includes(selectedRequest.status) && (
              <div className="mb-6 rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Return Pickup Rider</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedRider}
                    onChange={(e) => setSelectedRider(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20"
                  >
                    <option value="">— Select rider —</option>
                    {deliveryPartners.map((r) => (
                      <option key={r.id} value={r.id}>
                        {`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignRider}
                    disabled={submitting || !selectedRider}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium text-sm disabled:opacity-50"
                  >
                    {submitting && <ButtonSpinner />}
                    Assign Rider
                  </button>
                </div>
                {selectedRequest.delivery_partner_name && (
                  <p className="text-xs text-gray-400 mt-2">Currently assigned: {selectedRequest.delivery_partner_name}</p>
                )}
              </div>
            )}

            {/* Workflow Actions */}
            {nextActionsFor(selectedRequest.status).length > 0 ? (
              <div className="border-t border-gray-200 pt-5">
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

                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={closeDetail}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm disabled:opacity-50"
                  >
                    Close
                  </button>
                  {nextActionsFor(selectedRequest.status).map((action) => (
                    <button
                      key={action}
                      onClick={() => handleResolve(action)}
                      disabled={submitting}
                      className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonStyle(action)}`}
                    >
                      {submitting ? <ButtonSpinner /> : getActionTitle(action)}
                    </button>
                  ))}
                </div>
              </div>
            ) : waitingOnCustomer(selectedRequest.status) ? (
              <div className="border-t border-gray-200 pt-5">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">{waitingOnCustomer(selectedRequest.status)}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={closeDetail}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  onClick={closeDetail}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnRequests;
