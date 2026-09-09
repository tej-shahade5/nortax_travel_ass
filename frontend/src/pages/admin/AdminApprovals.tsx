import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/admin';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Filter } from 'lucide-react';

const AdminApprovals = () => {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['admin', 'approvals', statusFilter],
    queryFn: () => adminApi.getApprovals(statusFilter || undefined),
  });

  if (isLoading) return <TableSkeleton rows={8} cols={6} />;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Admin', to: '/admin' },
        { label: 'Approvals' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Approvals</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View the complete approval history across all travel requests
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select w-auto min-w-[160px]"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="returned">Returned</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {!approvals?.length ? (
        <EmptyState title="No approvals found" description="Try adjusting your filters" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Travel Request</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Requested By</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Approver</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Level</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Remarks</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {approvals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell text-primary-600 dark:text-primary-400 font-medium">
                      {approval.travel_request_id}
                    </td>
                    <td className="table-cell text-sm text-gray-900 dark:text-gray-100">
                      {approval.request_employee_name || '—'}
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">
                      {approval.approver_name}
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">
                      Level {approval.level}
                    </td>
                    <td className="table-cell">
                      <Badge variant={getStatusVariant(approval.status)}>{approval.status}</Badge>
                    </td>
                    <td className="table-cell text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                      {approval.remarks || '—'}
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">
                      {approval.decided_at
                        ? new Date(approval.decided_at).toLocaleDateString()
                        : new Date(approval.created_at).toLocaleDateString()
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
