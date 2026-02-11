import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminAuthService } from '../services/adminAuth.service';
import type { AdminUser } from '../types/admin';

interface AdminAuthState {
  admin: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

interface AdminAuthActions {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
  clearAuth: () => Promise<void>;
}

type AdminAuthStore = AdminAuthState & AdminAuthActions;

export const useAdminAuthStore = create<AdminAuthStore>((set, get) => ({
  admin: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const [accessToken, adminStr] = await AsyncStorage.multiGet([
        'adminAccessToken',
        'adminUser',
      ]);

      if (accessToken[1] && adminStr[1]) {
        const admin = JSON.parse(adminStr[1]) as AdminUser;
        set({ admin, isAuthenticated: true });
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
      const response = await adminAuthService.login(email, password);

      if (response.success && response.data) {
        const { accessToken, refreshToken, admin } = response.data;
        await AsyncStorage.multiSet([
          ['adminAccessToken', accessToken],
          ['adminRefreshToken', refreshToken],
          ['adminUser', JSON.stringify(admin)],
        ]);
        set({ admin, isAuthenticated: true });
        return { success: true };
      }

      return { success: false, message: response.message };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await adminAuthService.logout();
    } finally {
      await get().clearAuth();
    }
  },

  refreshAdmin: async () => {
    try {
      const response = await adminAuthService.getProfile();
      if (response.success && response.data) {
        const adminData = response.data.admin;
        set({ admin: adminData });
        await AsyncStorage.setItem('adminUser', JSON.stringify(adminData));
      } else {
        await get().clearAuth();
      }
    } catch {
      await get().clearAuth();
    }
  },

  clearAuth: async () => {
    try {
      await AsyncStorage.multiRemove(['adminAccessToken', 'adminRefreshToken', 'adminUser']);
    } catch {
      // No bloquear el clear de estado si AsyncStorage falla
    }
    set({ admin: null, isAuthenticated: false });
  },
}));
