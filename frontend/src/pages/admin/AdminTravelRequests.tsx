import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/admin';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Badge, getStatusVariant } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Filter } from 'lucide-react';

const AdminTravelRequests = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin', 'travel-requests', statusFilter],
    queryFn: () => adminApi.getTravelRequests(statusFilter || undefined),
  });

  if (isLoading) return <TableSkeleton rows={8} cols={6} />;

  const filtered = requests?.filter((tr) =>
    !searchTerm ||
    tr.travel_request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tr.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tr.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Admin', to: '/admin' },
        { label: 'Travel Requests' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Travel Requests</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and manage all travel requests across the organization
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select w-auto min-w-[160px]"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="returned">Returned</option>
              <option value="advance_disbursed">Advance Disbursed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Search by ID, employee, or destination..."
            className="input flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {!filtered?.length ? (
        <EmptyState title="No travel requests found" description="Try adjusting your filters" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Request ID</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Employee</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Dept</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Destination</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Dates</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Receipts</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((tr) => (
                  <tr key={tr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell">
                      <Link to={`/travel-requests/${tr.id}`} className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                        {tr.travel_request_id}
                      </Link>
                    </td>
                    <td className="table-cell">
                      <div className="text-gray-900 dark:text-gray-100">{tr.employee_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{tr.employee_id}</div>
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">{tr.employee_department}</td>
                    <td className="table-cell">
                      <div className="text-gray-900 dark:text-gray-100">{tr.destination}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{tr.city_tier}</div>
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">
                      {tr.start_date} to {tr.end_date}
                    </td>
                    <td className="table-cell font-medium text-gray-900 dark:text-gray-100">
                      ₹{tr.estimated_amount.toLocaleString()}
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">{tr.receipt_count}</td>
                    <td className="table-cell">
                      <Badge variant={getStatusVariant(tr.status)}>{tr.status}</Badge>
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

export default AdminTravelRequests;
