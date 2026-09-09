import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/admin';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Filter } from 'lucide-react';

const AdminClaims = () => {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: claims, isLoading } = useQuery({
    queryKey: ['admin', 'claims', statusFilter],
    queryFn: () => adminApi.getClaims(statusFilter || undefined),
  });

  if (isLoading) return <TableSkeleton rows={8} cols={7} />;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Admin', to: '/admin' },
        { label: 'Claims' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Claims</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and manage all expense claims across the organization
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select w-auto min-w-[180px]"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="finance_verified">Finance Verified</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {!claims?.length ? (
        <EmptyState title="No claims found" description="Try adjusting your filters" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Claim ID</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Travel Request</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Claimed</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Advance</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Net Payable</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Payment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell text-primary-600 dark:text-primary-400 font-medium">
                      {claim.id.slice(0, 8)}...
                    </td>
                    <td className="table-cell">
                      <div className="text-gray-900 dark:text-gray-100">{claim.employee_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{claim.employee_id}</div>
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">{claim.travel_request_id}</td>
                    <td className="table-cell font-medium text-gray-900 dark:text-gray-100">₹{claim.total_claimed.toLocaleString()}</td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">₹{claim.advance_adjusted.toLocaleString()}</td>
                    <td className="table-cell font-semibold text-primary-600 dark:text-primary-400">₹{claim.net_payable.toLocaleString()}</td>
                    <td className="table-cell">
                      <Badge variant={getStatusVariant(claim.status)}>{claim.status}</Badge>
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">
                      {claim.payment_run_date || '—'}
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

export default AdminClaims;
