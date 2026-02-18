import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '../config/api';
import { authService, LoginResult } from '../services/auth.service';
import { socketService } from '../services/socket.service';
import type { RegisterData, User } from '../types';

const BIO_TOKEN_KEY = 'bio_refresh_token';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (data: RegisterData) => Promise<{ success: boolean; userId?: string; email?: string; message?: string }>;
  verifyOTP: (userId: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuth: () => Promise<void>;
  saveBiometricToken: () => Promise<void>;
  loginWithBiometric: () => Promise<{ success: boolean; message?: string }>;
  hasBiometricToken: () => Promise<boolean>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const [accessToken, userStr] = await AsyncStorage.multiGet([
        'accessToken',
        'user',
      ]);

      if (accessToken[1] && userStr[1]) {
        const user = JSON.parse(userStr[1]) as User;
        set({ user, isAuthenticated: true });

        // Refresh user data (el interceptor de Axios renueva el accessToken si expiró)
        // Luego reconectar socket con el token fresco
        get().refreshUser().then(() => {
          socketService.reconnect();
        });
      }
    } catch {
      await get().clearAuth();
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await authService.login(email, password);

      if (result.type === 'success') {
        const { accessToken, refreshToken, user } = result.data;
        await AsyncStorage.multiSet([
          ['accessToken', accessToken],
          ['refreshToken', refreshToken],
          ['user', JSON.stringify(user)],
        ]);
        set({ user, isAuthenticated: true });
        socketService.connect();
        // Guardar token para biometría (silencioso — no bloquea el login)
        try { await SecureStore.setItemAsync(BIO_TOKEN_KEY, refreshToken); } catch { /* ignorar */ }
        // Refrescar perfil completo en background (incluye email_verificado, is_active)
        get().refreshUser();
      }

      return result;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authService.register(data);
      if (response.success && response.data) {
        return {
          success: true,
          userId: response.data.userId,
          email: response.data.email,
        };
      }
      return { success: false, message: response.message };
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOTP: async (userId, otp) => {
    set({ isLoading: true });
    try {
      const response = await authService.verifyOTP({ userId, otp });
      if (response.success && response.data) {
        const { accessToken, refreshToken, user } = response.data;
        await AsyncStorage.multiSet([
          ['accessToken', accessToken],
          ['refreshToken', refreshToken],
          ['user', JSON.stringify(user)],
        ]);
        set({ user, isAuthenticated: true });
        socketService.connect();
        return { success: true };
      }
      return { success: false, message: response.message };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await authService.logout();
      socketService.disconnect();
    } finally {
      await get().clearAuth();
    }
  },

  refreshUser: async () => {
    try {
      const response = await authService.getProfile();
      if (response.success && response.data) {
        const userData = (response.data as any).user ?? response.data;
        set({ user: userData });
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      } else {
        await get().clearAuth();
      }
    } catch {
      await get().clearAuth();
    }
  },

  clearAuth: async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    } catch {
      // No bloquear el clear de estado si AsyncStorage falla
    }
    try { await SecureStore.deleteItemAsync(BIO_TOKEN_KEY); } catch { /* ignorar */ }
    set({ user: null, isAuthenticated: false });
  },

  saveBiometricToken: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await SecureStore.setItemAsync(BIO_TOKEN_KEY, refreshToken);
      }
    } catch { /* ignorar */ }
  },

  hasBiometricToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(BIO_TOKEN_KEY);
      return !!token;
    } catch {
      return false;
    }
  },

  loginWithBiometric: async () => {
    set({ isLoading: true });
    try {
      const bioToken = await SecureStore.getItemAsync(BIO_TOKEN_KEY);
      if (!bioToken) {
        return { success: false, message: 'No hay sesión guardada para biometría' };
      }

      const { data } = await axios.post(
        `${API_URL}/api/auth/refresh`,
        { refreshToken: bioToken },
        { timeout: 10000 }
      );

      if (!data?.data?.accessToken) {
        await SecureStore.deleteItemAsync(BIO_TOKEN_KEY);
        return { success: false, message: 'Sesión expirada. Ingresa con tu contraseña.' };
      }

      const { accessToken, refreshToken } = data.data;
      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken || bioToken],
      ]);
      if (refreshToken) {
        await SecureStore.setItemAsync(BIO_TOKEN_KEY, refreshToken);
      }

      // Cargar perfil completo
      const response = await authService.getProfile();
      if (response.success && response.data) {
        const userData = (response.data as any).user ?? response.data;
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        set({ user: userData, isAuthenticated: true });
        socketService.connect();
        return { success: true };
      }

      return { success: false, message: 'Error al cargar el perfil' };
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Error de conexión';
      return { success: false, message: msg };
    } finally {
      set({ isLoading: false });
    }
  },
}));
