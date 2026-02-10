import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, LoginResult } from '../services/auth.service';
import { socketService } from '../services/socket.service';
import type { RegisterData, User } from '../types';

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

        // Refresh user data in background
        get().refreshUser();
        socketService.connect();
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
    set({ user: null, isAuthenticated: false });
  },
}));
