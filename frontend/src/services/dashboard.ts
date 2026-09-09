import api from './api';
import { EmployeeDashboard, ManagerDashboard, FinanceDashboard } from '../types';

export const dashboardApi = {
  getEmployeeDashboard: async (): Promise<EmployeeDashboard> => {
    const response = await api.get<EmployeeDashboard>('/dashboard/employee');
    return response.data;
  },

  getManagerDashboard: async (): Promise<ManagerDashboard> => {
    const response = await api.get<ManagerDashboard>('/dashboard/manager');
    return response.data;
  },

  getFinanceDashboard: async (): Promise<FinanceDashboard> => {
    const response = await api.get<FinanceDashboard>('/dashboard/finance');
    return response.data;
  },
};
