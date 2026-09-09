import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { travelRequestApi } from '../services/travelRequest';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Badge, getStatusVariant } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Plus, Filter } from 'lucide-react';

const TravelRequestList = () => {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: travelRequests, isLoading } = useQuery({
    queryKey: ['travelRequests', statusFilter],
    queryFn: () => travelRequestApi.list(statusFilter || undefined),
  });

  if (isLoading) {
    return <TableSkeleton rows={5} cols={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Travel Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your travel requests and track approvals
          </p>
        </div>
        <Link
          to="/travel-requests/new"
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select w-auto min-w-[180px]"
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
      </div>

      {/* Travel Requests */}
      {travelRequests?.length === 0 ? (
        <EmptyState
          title="No travel requests found"
          description={statusFilter ? 'Try adjusting your filter' : 'Create your first travel request to get started'}
          action={
            !statusFilter ? (
              <Link to="/travel-requests/new" className="btn-primary text-sm">
                <Plus className="w-4 h-4 mr-1.5" />
                New Request
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Request ID
                    </th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Estimated
                    </th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {travelRequests?.map((tr) => (
                    <tr key={tr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="table-cell">
                        <div className="font-medium text-primary-600 dark:text-primary-400">{tr.travel_request_id}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{tr.employee_name}</div>
                      </td>
                      <td className="table-cell">
                        <div className="text-gray-900 dark:text-gray-100">{tr.destination}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{tr.city_tier}</div>
                      </td>
                      <td className="table-cell text-gray-700 dark:text-gray-300">
                        {tr.start_date} to {tr.end_date}
                      </td>
                      <td className="table-cell font-medium text-gray-900 dark:text-gray-100">
                        ₹{tr.estimated_amount.toLocaleString()}
                      </td>
                      <td className="table-cell">
                        <Badge variant={getStatusVariant(tr.status)}>
                          {tr.status}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Link
                          to={`/travel-requests/${tr.id}`}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 text-sm font-medium transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {travelRequests?.map((tr) => (
              <Link
                key={tr.id}
                to={`/travel-requests/${tr.id}`}
                className="block card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {tr.travel_request_id}
                      </p>
                      <Badge variant={getStatusVariant(tr.status)}>
                        {tr.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{tr.destination}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {tr.start_date} to {tr.end_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      ₹{tr.estimated_amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TravelRequestList;
