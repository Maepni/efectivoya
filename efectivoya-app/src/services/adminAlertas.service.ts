import { AdminApiService } from './adminApi.service';
import type { ApiResponse } from '../types';
import type {
  AdminAlertaListItem,
  AdminAlertaStats,
  AdminPagination,
} from '../types/admin';

interface AlertasFilters {
  page?: number;
  limit?: number;
  revisada?: string;
  tipo?: string;
}

export const adminAlertasService = {
  async getAll(filters: AlertasFilters = {}): Promise<ApiResponse<{
    alertas: AdminAlertaListItem[];
    pagination: AdminPagination;
  }>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.revisada) params.revisada = filters.revisada;
      if (filters.tipo) params.tipo = filters.tipo;

      return await AdminApiService.get('/admin/alertas', params);
    } catch {
      return { success: false, message: 'Error al obtener alertas' };
    }
  },

  async getStats(): Promise<ApiResponse<AdminAlertaStats>> {
    try {
      return await AdminApiService.get('/admin/alertas/stats');
    } catch {
      return { success: false, message: 'Error al obtener stats de alertas' };
    }
  },

  async marcarRevisada(id: string): Promise<ApiResponse> {
    try {
      return await AdminApiService.patch(`/admin/alertas/${id}/revisar`);
    } catch {
      return { success: false, message: 'Error al marcar alerta como revisada' };
    }
  },

  async marcarTodasRevisadas(): Promise<ApiResponse<{ cantidad_actualizada: number }>> {
    try {
      return await AdminApiService.patch('/admin/alertas/revisar-todas');
    } catch {
      return { success: false, message: 'Error al marcar todas las alertas' };
    }
  },
};
