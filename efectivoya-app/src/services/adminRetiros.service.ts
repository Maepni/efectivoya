import { AdminApiService } from './adminApi.service';
import type { ApiResponse } from '../types';
import type {
  AdminRetiroListItem,
  AdminRetiroDetalle,
  AdminRetiroStats,
  AdminPagination,
} from '../types/admin';

interface RetirosFilters {
  page?: number;
  limit?: number;
  estado?: string;
  user_id?: string;
}

export const adminRetirosService = {
  async getPendientes(): Promise<ApiResponse<{
    retiros: AdminRetiroListItem[];
    total: number;
  }>> {
    try {
      return await AdminApiService.get('/admin/retiros/pendientes');
    } catch {
      return { success: false, message: 'Error al obtener retiros pendientes' };
    }
  },

  async getAll(filters: RetirosFilters = {}): Promise<ApiResponse<{
    retiros: AdminRetiroListItem[];
    pagination: AdminPagination;
  }>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.estado) params.estado = filters.estado;
      if (filters.user_id) params.user_id = filters.user_id;

      return await AdminApiService.get('/admin/retiros', params);
    } catch {
      return { success: false, message: 'Error al obtener retiros' };
    }
  },

  async getDetalle(id: string): Promise<ApiResponse<AdminRetiroDetalle>> {
    try {
      return await AdminApiService.get(`/admin/retiros/${id}`);
    } catch {
      return { success: false, message: 'Error al obtener detalle de retiro' };
    }
  },

  async getStats(): Promise<ApiResponse<AdminRetiroStats>> {
    try {
      return await AdminApiService.get('/admin/retiros/stats');
    } catch {
      return { success: false, message: 'Error al obtener stats de retiros' };
    }
  },

  async aprobar(id: string): Promise<ApiResponse> {
    try {
      return await AdminApiService.post(`/admin/retiros/${id}/aprobar`);
    } catch {
      return { success: false, message: 'Error al aprobar retiro' };
    }
  },

  async rechazar(id: string, motivo_rechazo: string): Promise<ApiResponse> {
    try {
      return await AdminApiService.post(`/admin/retiros/${id}/rechazar`, { motivo_rechazo });
    } catch {
      return { success: false, message: 'Error al rechazar retiro' };
    }
  },
};
