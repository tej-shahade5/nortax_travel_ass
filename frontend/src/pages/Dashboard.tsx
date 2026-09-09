import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { dashboardApi } from '../services/dashboard';
import { Link } from 'react-router-dom';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge, getStatusVariant } from '../components/ui/Badge';
import {
  FileText,
  Clock,
  IndianRupee,
  ArrowRight,
  Plus,
  Wallet,
} from 'lucide-react';

const Dashboard = () => {
  const { employee } = useAuth();

  const { data: employeeData, isLoading } = useQuery({
    queryKey: ['dashboard', 'employee'],
    queryFn: dashboardApi.getEmployeeDashboard,
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {employee?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Here's an overview of your travel expenses
        </p>
      </div>

      {employeeData && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
              label="Total Requests"
              value={employeeData.stats.total_requests}
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
              label="Pending Approvals"
              value={employeeData.stats.pending_approvals}
            />
            <StatCard
              icon={<IndianRupee className="w-5 h-5 text-green-600 dark:text-green-400" />}
              label="Total Claimed"
              value={`₹${employeeData.stats.total_claimed.toLocaleString()}`}
            />
            <StatCard
              icon={<Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
              label="Total Advance"
              value={`₹${employeeData.stats.total_advance.toLocaleString()}`}
            />
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/travel-requests/new" className="btn-primary">
                <Plus className="w-4 h-4 mr-1.5" />
                New Travel Request
              </Link>
              <Link to="/travel-requests" className="btn-secondary">
                View All Requests
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </div>
          </div>

          {/* Recent Travel Requests */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Travel Requests</h3>
            </div>
            {employeeData.travel_requests.length === 0 ? (
              <EmptyState
                title="No travel requests yet"
                description="Create your first travel request to get started"
                action={
                  <Link to="/travel-requests/new" className="btn-primary text-sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Request
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {employeeData.travel_requests.slice(0, 5).map((tr) => (
                  <li key={tr.id}>
                    <Link
                      to={`/travel-requests/${tr.id}`}
                      className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <p className="text-sm font-medium text-primary-600 dark:text-primary-400 truncate">
                              {tr.travel_request_id}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{tr.destination}</p>
                          </div>
                          <Badge variant={getStatusVariant(tr.status)}>
                            {tr.status}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>{tr.start_date} to {tr.end_date}</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            ₹{tr.estimated_amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
