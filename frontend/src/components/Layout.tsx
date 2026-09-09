import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Sun,
  Moon,
  Menu,
  X,
  LayoutDashboard,
  FileText,
  CheckSquare,
  LogOut,
  ChevronRight,
  Shield,
  Users,
  IndianRupee,
} from 'lucide-react';
import clsx from 'clsx';

const Layout = () => {
  const { employee, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = getNavLinks(employee?.role);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700/50 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side */}
            <div className="flex items-center">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-primary-600 dark:text-primary-400 transition-colors">
                  Nortex Expenses
                </Link>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden md:ml-6 md:flex md:space-x-1" aria-label="Main navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      isActive(location.pathname, link.to)
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* User info - Desktop */}
              <div className="hidden md:flex md:items-center md:gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium text-gray-900 dark:text-white">{employee?.name}</span>
                  <span className="ml-1 text-gray-500 dark:text-gray-400">({employee?.role})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-primary"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Logout
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                    isActive(location.pathname, link.to)
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                <span className="font-medium text-gray-900 dark:text-white">{employee?.name}</span>
                <span className="ml-1 text-gray-500 dark:text-gray-400">({employee?.role})</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full btn-primary justify-center"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Breadcrumbs */}
      {location.pathname !== '/' && !location.pathname.startsWith('/dashboard') && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <nav aria-label="Breadcrumb" className="text-sm">
            <ol className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
              <li>
                <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  Home
                </Link>
              </li>
              {generateBreadcrumbs(location.pathname).map((crumb, i) => (
                <li key={i} className="flex items-center">
                  <ChevronRight className="w-4 h-4 mx-1" />
                  {crumb.to ? (
                    <Link to={crumb.to} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-900 dark:text-gray-100 font-medium">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

// Helper functions
function getNavLinks(role?: string) {
  if (!role) return [];

  if (role === 'Admin') {
    return [
      { to: '/admin', label: 'Admin Dashboard', icon: <Shield className="w-4 h-4" /> },
      { to: '/admin/travel-requests', label: 'All Requests', icon: <FileText className="w-4 h-4" /> },
      { to: '/admin/claims', label: 'All Claims', icon: <IndianRupee className="w-4 h-4" /> },
      { to: '/admin/employees', label: 'Employees', icon: <Users className="w-4 h-4" /> },
      { to: '/admin/approvals', label: 'Approvals', icon: <CheckSquare className="w-4 h-4" /> },
    ];
  }

  // Employee
  return [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/travel-requests', label: 'My Requests', icon: <FileText className="w-4 h-4" /> },
  ];
}

function isActive(pathname: string, to: string): boolean {
  if (to === '/dashboard') {
    return pathname === '/dashboard';
  }
  if (to === '/admin') {
    return pathname === '/admin';
  }
  return pathname === to || pathname.startsWith(to + '/');
}

function generateBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; to?: string }[] = [];

  let currentPath = '';
  for (let i = 0; i < parts.length; i++) {
    currentPath += '/' + parts[i];
    const label = parts[i]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    if (i < parts.length - 1) {
      breadcrumbs.push({ label, to: currentPath });
    } else {
      breadcrumbs.push({ label });
    }
  }

  return breadcrumbs;
}

export default Layout;
