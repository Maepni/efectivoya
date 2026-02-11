import { AxiosError } from 'axios';
import adminApi from './adminApi.service';
import type { ApiResponse } from '../types';
import type { AdminLoginResponse, AdminUser } from '../types/admin';

export const adminAuthService = {
  async login(email: string, password: string): Promise<ApiResponse<AdminLoginResponse>> {
    try {
      const { data } = await adminApi.post<ApiResponse<AdminLoginResponse>>(
        '/admin/auth/login',
        { email, password }
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al iniciar sesión',
      };
    }
  },

  async getProfile(): Promise<ApiResponse<{ admin: AdminUser }>> {
    try {
      const { data } = await adminApi.get<ApiResponse<{ admin: AdminUser }>>(
        '/admin/auth/profile'
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al obtener perfil',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await adminApi.post('/admin/auth/logout');
    } catch {
      // No bloquear el logout local si el backend falla
    }
  },
};
