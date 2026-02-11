import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

const adminApi = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem('adminAccessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      // No intentar refresh en la ruta de refresh ni login
      const url = originalRequest.url || '';
      if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
        await AsyncStorage.multiRemove(['adminAccessToken', 'adminRefreshToken', 'adminUser']);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(adminApi(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('adminRefreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/api/admin/auth/refresh`, { refreshToken });

        if (data.success && data.data?.accessToken) {
          const newToken = data.data.accessToken;
          await AsyncStorage.setItem('adminAccessToken', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return adminApi(originalRequest);
        }

        throw new Error('Refresh failed');
      } catch (refreshError) {
        processQueue(refreshError, null);
        await AsyncStorage.multiRemove(['adminAccessToken', 'adminRefreshToken', 'adminUser']);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

class AdminApiServiceClass {
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await adminApi.get(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await adminApi.post(url, data);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await adminApi.patch(url, data);
    return response.data;
  }

  async patchFormData<T = any>(url: string, formData: FormData): Promise<T> {
    const response = await adminApi.patch(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  }
}

export const AdminApiService = new AdminApiServiceClass();
export default adminApi;
