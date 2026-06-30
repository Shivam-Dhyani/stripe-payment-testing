import { useEffect, useState } from 'react';
import { Eye, X, CheckCircle, XCircle, Clock, Search, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCancellationRequests, resolveCancellationRequest } from '../../store/slices/cancellationSlice';
import { CancellationRequest } from '../../types';
import ButtonSpinner from '../../components/common/ButtonSpinner';
import { formatDateTime } from '../../utils/date';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const CancellationRequests = () => {
  const dispatch = useAppDispatch();
  const { requests, loading, submitting } = useAppSelector((state) => state.cancellations);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  useEffect(() => {
    dispatch(fetchCancellationRequests());
  }, [dispatch]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

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

  const handleResolve = async (action: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    await dispatch(
      resolveCancellationRequest({
        id: selectedRequest.id,
        data: {
          status: action,
          admin_notes: resolveNotes || undefined,
        },
      })
    );
    closeDetail();
    dispatch(fetchCancellationRequests());
  };

  const viewRequest = (request: CancellationRequest) => {
    setSelectedRequest(request);
    setResolveNotes('');
  };

  const closeDetail = () => {
    setSelectedRequest(null);
    setResolveNotes('');
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
          <h1 className="text-title-sm font-bold text-gray-800">Cancellation Requests</h1>
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              {pendingCount} pending
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
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Order</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Customer</th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-gray-600">Reason</th>
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
                    <td className="px-5 py-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 bg-gray-200 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No cancellation requests found</p>
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
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-600">{truncateText(request.reason, 50)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[request.status] || 'bg-gray-100 text-gray-700'}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-800">
                      {formatDateTime(request.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewRequest(request)}
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${
                            request.status === 'pending'
                              ? 'bg-brand-500 text-white hover:bg-brand-600'
                              : 'text-brand-500 hover:bg-gray-100'
                          }`}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                          {request.status === 'pending' ? 'Review' : 'View'}
                        </button>
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

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-theme-lg w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Cancellation Request Details</h2>
              <button onClick={closeDetail} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Order ID</p>
                <p className="font-mono text-sm font-medium text-gray-800">#{selectedRequest.order_id.substring(0, 8)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[selectedRequest.status] || 'bg-gray-100 text-gray-700'}`}>
                  {selectedRequest.status}
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
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Cancellation Reason</h3>
              <p className="text-sm text-gray-600">{selectedRequest.reason}</p>
            </div>

            {selectedRequest.admin_notes && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Admin Notes</h3>
                <p className="text-sm text-gray-600">{selectedRequest.admin_notes}</p>
              </div>
            )}

            {selectedRequest.resolved_at && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Resolved By</p>
                  <p className="font-medium text-gray-800">{selectedRequest.resolver_name || 'Admin'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resolved At</p>
                  <p className="font-medium text-gray-800">{formatDateTime(selectedRequest.resolved_at)}</p>
                </div>
              </div>
            )}

            {selectedRequest.status === 'pending' ? (
              <div className="border-t border-gray-200 pt-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (optional)</label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 resize-none"
                />
                <div className="flex justify-end gap-3 mt-5">
                  <button
                    onClick={closeDetail}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleResolve('rejected')}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <ButtonSpinner /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </button>
                  <button
                    onClick={() => handleResolve('approved')}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <ButtonSpinner /> : <CheckCircle className="w-4 h-4" />}
                    Approve
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

export default CancellationRequests;
