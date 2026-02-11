import { AdminApiService } from './adminApi.service';
import type { ApiResponse } from '../types';
import type {
  AdminRecargaListItem,
  AdminRecargaDetalle,
  AdminRecargaStats,
  AdminPagination,
} from '../types/admin';

interface RecargasFilters {
  page?: number;
  limit?: number;
  estado?: string;
  banco?: string;
  busqueda?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export const adminRecargasService = {
  async getPendientes(page = 1, limit = 20): Promise<ApiResponse<{
    recargas: AdminRecargaListItem[];
    pagination: AdminPagination;
  }>> {
    try {
      return await AdminApiService.get('/admin/recargas/pendientes', { page, limit });
    } catch {
      return { success: false, message: 'Error al obtener recargas pendientes' };
    }
  },

  async getAll(filters: RecargasFilters = {}): Promise<ApiResponse<{
    recargas: AdminRecargaListItem[];
    pagination: AdminPagination;
  }>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.estado) params.estado = filters.estado;
      if (filters.banco) params.banco = filters.banco;
      if (filters.busqueda) params.busqueda = filters.busqueda;
      if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;

      return await AdminApiService.get('/admin/recargas', params);
    } catch {
      return { success: false, message: 'Error al obtener recargas' };
    }
  },

  async getDetalle(id: string): Promise<ApiResponse<AdminRecargaDetalle>> {
    try {
      return await AdminApiService.get(`/admin/recargas/${id}`);
    } catch {
      return { success: false, message: 'Error al obtener detalle de recarga' };
    }
  },

  async getStats(): Promise<ApiResponse<AdminRecargaStats>> {
    try {
      return await AdminApiService.get('/admin/recargas/stats');
    } catch {
      return { success: false, message: 'Error al obtener stats de recargas' };
    }
  },

  async aprobar(id: string): Promise<ApiResponse> {
    try {
      return await AdminApiService.post(`/admin/recargas/${id}/aprobar`);
    } catch {
      return { success: false, message: 'Error al aprobar recarga' };
    }
  },

  async rechazar(id: string, motivo: string): Promise<ApiResponse> {
    try {
      return await AdminApiService.post(`/admin/recargas/${id}/rechazar`, { motivo });
    } catch {
      return { success: false, message: 'Error al rechazar recarga' };
    }
  },
};
