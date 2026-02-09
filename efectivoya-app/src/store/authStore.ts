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
    socketService.disconnect();
    await get().clearAuth();
  },

  refreshUser: async () => {
    try {
      const response = await authService.getProfile();
      if (response.success && response.data) {
        set({ user: response.data });
        await AsyncStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch {
      // Silently fail - user data will be stale but not critical
    }
  },

  clearAuth: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    set({ user: null, isAuthenticated: false });
  },
}));
