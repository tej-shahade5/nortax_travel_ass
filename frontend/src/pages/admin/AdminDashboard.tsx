import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi, type AdminStats, type AdminApproval } from '../../services/admin';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  FileText,
  IndianRupee,
  Clock,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Wallet,
  Loader2,
  XCircle,
  RotateCcw,
} from 'lucide-react';

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedApproval, setSelectedApproval] = useState<AdminApproval | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'return' | 'reject'>('approve');
  const [remarks, setRemarks] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  });

  const { data: travelRequests } = useQuery({
    queryKey: ['admin', 'travel-requests'],
    queryFn: () => adminApi.getTravelRequests(),
  });

  const { data: pendingApprovals } = useQuery<AdminApproval[]>({
    queryKey: ['admin', 'approvals', 'pending'],
    queryFn: () => adminApi.getApprovals('pending'),
  });

  const approveMutation = useMutation({
    mutationFn: adminApi.approveApproval,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Approval submitted!');
      closeActionModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  });

  const returnMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) => adminApi.returnApproval(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Request returned');
      closeActionModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) => adminApi.rejectApproval(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Request rejected');
      closeActionModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Failed'),
  });

  const closeActionModal = () => {
    setSelectedApproval(null);
    setRemarks('');
    setActionType('approve');
  };

  const handleAction = () => {
    if (!selectedApproval) return;
    if ((actionType === 'return' || actionType === 'reject') && !remarks.trim()) {
      toast.error('Remarks are required');
      return;
    }
    switch (actionType) {
      case 'approve': approveMutation.mutate(selectedApproval.id); break;
      case 'return': returnMutation.mutate({ id: selectedApproval.id, remarks }); break;
      case 'reject': rejectMutation.mutate({ id: selectedApproval.id, remarks }); break;
    }
  };

  if (statsLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          System-wide overview and quick actions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />} label="Employees" value={stats?.total_employees || 0} />
        <StatCard icon={<FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />} label="Travel Requests" value={stats?.total_travel_requests || 0} />
        <StatCard icon={<Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />} label="Pending Approvals" value={stats?.pending_approvals || 0} />
        <StatCard icon={<AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />} label="Pending Claims" value={stats?.pending_claims || 0} />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Estimated</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{(stats?.total_estimated || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Claimed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{(stats?.total_claimed || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Paid</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{(stats?.total_paid || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals — Action Required */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <div className="card overflow-hidden border-l-4 border-yellow-400">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Pending Approvals ({pendingApprovals.length})
            </h2>
            <Link to="/admin/approvals" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {approval.travel_request_id}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Requested by {approval.request_employee_name} — Level {approval.level}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedApproval(approval); setActionType('approve'); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setSelectedApproval(approval); setActionType('return'); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-yellow-500 hover:bg-yellow-600 text-white transition-colors"
                  >
                    Return
                  </button>
                  <button
                    onClick={() => { setSelectedApproval(approval); setActionType('reject'); }}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link to="/admin/travel-requests" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <span className="font-medium text-gray-900 dark:text-white">All Requests</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link to="/admin/claims" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <IndianRupee className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-gray-900 dark:text-white">All Claims</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link to="/admin/employees" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-gray-900 dark:text-white">Employees</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link to="/admin/approvals" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-medium text-gray-900 dark:text-white">Approvals</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Recent Requests */}
      {travelRequests && travelRequests.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Travel Requests</h2>
            <Link to="/admin/travel-requests" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Destination</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {travelRequests.slice(0, 5).map((tr: any) => (
                  <tr key={tr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="table-cell">
                      <Link to={`/travel-requests/${tr.id}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                        {tr.travel_request_id}
                      </Link>
                    </td>
                    <td className="table-cell text-gray-900 dark:text-gray-100">{tr.employee_name}</td>
                    <td className="table-cell text-gray-700 dark:text-gray-300">{tr.destination}</td>
                    <td className="table-cell font-medium text-gray-900 dark:text-gray-100">₹{tr.estimated_amount.toLocaleString()}</td>
                    <td className="table-cell"><Badge variant={getStatusVariant(tr.status)}>{tr.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Action Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="flex min-h-full items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity" onClick={closeActionModal} />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {actionType === 'approve' ? 'Approve Request' : actionType === 'return' ? 'Return Request' : 'Reject Request'}
                </h3>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Travel Request</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{selectedApproval.travel_request_id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requested By</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{selectedApproval.request_employee_name}</p>
                  </div>
                </div>

                {/* Action Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'approve' as const, label: 'Approve', icon: <CheckCircle className="w-4 h-4" />, color: 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
                      { value: 'return' as const, label: 'Return', icon: <RotateCcw className="w-4 h-4" />, color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
                      { value: 'reject' as const, label: 'Reject', icon: <XCircle className="w-4 h-4" />, color: 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
                    ].map(({ value, label, icon, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setActionType(value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                          actionType === value ? `${color} ring-2 ring-offset-1 ring-current` : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {icon}
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(actionType === 'return' || actionType === 'reject') && (
                  <div>
                    <label className="label">Remarks {actionType === 'return' && <span className="text-red-500">*</span>}</label>
                    <textarea
                      rows={3}
                      className="input mt-1"
                      placeholder={`Enter reason for ${actionType}ing...`}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button type="button" onClick={closeActionModal} className="btn-secondary">Cancel</button>
                <button
                  type="button"
                  onClick={handleAction}
                  disabled={approveMutation.isPending || returnMutation.isPending || rejectMutation.isPending}
                  className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white disabled:opacity-50 ${
                    actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    actionType === 'return' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {(approveMutation.isPending || returnMutation.isPending || rejectMutation.isPending) ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
                  ) : actionType === 'approve' ? 'Approve' : actionType === 'return' ? 'Return' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
