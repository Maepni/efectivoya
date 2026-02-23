import { AxiosError } from 'axios';
import api from './api.service';
import type {
  ApiResponse,
  LoginResponse,
  RegisterData,
  User,
  VerifyOTPData,
} from '../types';

interface LoginError403 {
  userId: string;
  email: string;
}

export type LoginResult =
  | { type: 'success'; data: LoginResponse }
  | { type: 'unverified'; userId: string; email: string }
  | { type: 'error'; message: string };

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
        email,
        password,
      });
      if (data.success && data.data) {
        return { type: 'success', data: data.data };
      }
      return { type: 'error', message: data.message || 'Error al iniciar sesión' };
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse<LoginError403>>;
      if (axiosError.response?.status === 403 && axiosError.response.data?.data) {
        const { userId, email: userEmail } = axiosError.response.data.data;
        return { type: 'unverified', userId, email: userEmail };
      }
      const message =
        axiosError.response?.data?.message || 'Error de conexión. Intenta de nuevo.';
      return { type: 'error', message };
    }
  },

  async register(userData: RegisterData): Promise<ApiResponse<{ userId: string; email: string }>> {
    try {
      const { data } = await api.post<ApiResponse<{ userId: string; email: string }>>(
        '/auth/register',
        userData
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al registrarse',
      };
    }
  },

  async verifyOTP(otpData: VerifyOTPData): Promise<ApiResponse<LoginResponse>> {
    try {
      const { data } = await api.post<ApiResponse<LoginResponse>>(
        '/auth/verify-email',
        otpData
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Código OTP inválido',
      };
    }
  },

  async resendOTP(userId: string): Promise<ApiResponse> {
    try {
      const { data } = await api.post<ApiResponse>('/auth/resend-otp', { userId });
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al reenviar código',
      };
    }
  },

  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const { data } = await api.get<ApiResponse<User>>('/auth/profile');
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al obtener perfil',
      };
    }
  },

  async getDashboard(): Promise<ApiResponse> {
    try {
      const { data } = await api.get<ApiResponse>('/user/dashboard');
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al obtener dashboard',
      };
    }
  },

  async updateProfile(data: {
    nombres: string;
    apellidos: string;
    whatsapp?: string;
    direccion?: string;
    distrito?: string;
    departamento?: string;
  }): Promise<ApiResponse<{ user: User }>> {
    try {
      const { data: res } = await api.put<ApiResponse<{ user: User }>>('/auth/profile', data);
      return res;
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      return {
        success: false,
        message: axiosError.response?.data?.message || 'Error al actualizar perfil',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // No bloquear el logout local si el backend falla
    }
  },
};
