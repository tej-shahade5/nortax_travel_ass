import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/admin';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Breadcrumb } from '../../components/Breadcrumb';
import { Mail, Building2, MapPin } from 'lucide-react';

const AdminEmployees = () => {
  const { data: employees, isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'employees'],
    queryFn: adminApi.getEmployees,
  });

  if (isLoading) return <TableSkeleton rows={10} cols={6} />;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Admin': return 'danger';
      case 'MD': return 'purple';
      case 'Head of Division': return 'info';
      case 'Head of Department': return 'info';
      case 'Reporting Manager': return 'warning';
      case 'Finance': return 'success';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Admin', to: '/admin' },
        { label: 'Employees' },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View all employees and their roles in the organization
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{employees?.length || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {employees?.filter((e: any) => e.role === 'Employee').length || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Employees</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {employees?.filter((e: any) => ['Reporting Manager', 'Head of Department', 'Head of Division', 'MD'].includes(e.role)).length || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Managers</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {employees?.filter((e: any) => e.role === 'Finance').length || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Finance</p>
        </div>
      </div>

      {/* Table */}
      {!employees?.length ? (
        <EmptyState title="No employees found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Code</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Designation</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Department</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">City</th>
                  <th className="table-cell text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {employees.map((emp: any) => (
                  <tr key={emp.emp_code} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                      {emp.emp_code}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                            {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{emp.name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {emp.email}
                      </div>
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">{emp.designation}</td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {emp.department}
                      </div>
                    </td>
                    <td className="table-cell text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {emp.city}
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge variant={getRoleBadgeVariant(emp.role)}>{emp.role}</Badge>
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

export default AdminEmployees;
