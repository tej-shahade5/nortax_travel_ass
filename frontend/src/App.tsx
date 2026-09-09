import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TravelRequestList from './pages/TravelRequestList';
import TravelRequestForm from './pages/TravelRequestForm';
import TravelRequestDetail from './pages/TravelRequestDetail';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTravelRequests from './pages/admin/AdminTravelRequests';
import AdminClaims from './pages/admin/AdminClaims';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminApprovals from './pages/admin/AdminApprovals';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { employee } = useAuth();

  const getHomeRoute = () => {
    if (!employee) return '/login';
    return employee.role === 'Admin' ? '/admin' : '/dashboard';
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={getHomeRoute()} replace />} />

        {/* Employee Routes */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="travel-requests" element={<TravelRequestList />} />
        <Route path="travel-requests/new" element={<TravelRequestForm />} />
        <Route path="travel-requests/:id" element={<TravelRequestDetail />} />

        {/* Admin Routes */}
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/travel-requests" element={<AdminTravelRequests />} />
        <Route path="admin/claims" element={<AdminClaims />} />
        <Route path="admin/employees" element={<AdminEmployees />} />
        <Route path="admin/approvals" element={<AdminApprovals />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
