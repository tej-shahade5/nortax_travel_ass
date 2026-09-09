import api from './api';
import { EmployeeLogin, Token, Employee } from '../types';

export const authApi = {
  login: async (credentials: EmployeeLogin): Promise<Token> => {
    const response = await api.post<Token>('/auth/login', credentials);
    return response.data;
  },

  getMe: async (): Promise<Employee> => {
    const response = await api.get<Employee>('/auth/me');
    return response.data;
  },
};
