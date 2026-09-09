import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Employee } from '../types';

interface AuthContextType {
  employee: Employee | null;
  token: string | null;
  login: (token: string, employee: Employee) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('token');
    const storedEmployee = localStorage.getItem('employee');
    if (storedToken && storedEmployee) {
      setToken(storedToken);
      setEmployee(JSON.parse(storedEmployee));
    }
  }, []);

  const login = (newToken: string, newEmployee: Employee) => {
    setToken(newToken);
    setEmployee(newEmployee);
    localStorage.setItem('token', newToken);
    localStorage.setItem('employee', JSON.stringify(newEmployee));
  };

  const logout = () => {
    setToken(null);
    setEmployee(null);
    localStorage.removeItem('token');
    localStorage.removeItem('employee');
  };

  const isAuthenticated = !!token && !!employee;

  return (
    <AuthContext.Provider value={{ employee, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
