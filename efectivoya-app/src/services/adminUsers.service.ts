import { AdminApiService } from './adminApi.service';
import type { ApiResponse } from '../types';
import type {
  AdminUserListItem,
  AdminUserDetail,
  AdminUserStats,
  AdminPagination,
} from '../types/admin';

interface UsersFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export const adminUsersService = {
  async getAll(filters: UsersFilters = {}): Promise<ApiResponse<{
    users: AdminUserListItem[];
    pagination: AdminPagination;
  }>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.search) params.search = filters.search;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;

      return await AdminApiService.get('/admin/users', params);
    } catch {
      return { success: false, message: 'Error al obtener usuarios' };
    }
  },

  async getDetail(id: string): Promise<ApiResponse<AdminUserDetail>> {
    try {
      return await AdminApiService.get(`/admin/users/${id}`);
    } catch {
      return { success: false, message: 'Error al obtener detalle del usuario' };
    }
  },

  async getStats(): Promise<ApiResponse<AdminUserStats>> {
    try {
      return await AdminApiService.get('/admin/users/stats');
    } catch {
      return { success: false, message: 'Error al obtener stats de usuarios' };
    }
  },

  async toggleStatus(id: string, motivo?: string): Promise<ApiResponse<{ user: { id: string; email: string; is_active: boolean } }>> {
    try {
      return await AdminApiService.patch(`/admin/users/${id}/toggle-status`, motivo ? { motivo } : {});
    } catch {
      return { success: false, message: 'Error al cambiar estado del usuario' };
    }
  },
};
