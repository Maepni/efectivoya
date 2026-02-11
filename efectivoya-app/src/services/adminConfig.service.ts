import { AdminApiService } from './adminApi.service';
import type { ApiResponse } from '../types';
import type { AdminConfig } from '../types/admin';

export const adminConfigService = {
  async getConfig(): Promise<ApiResponse<{ config: AdminConfig }>> {
    try {
      return await AdminApiService.get('/admin/config');
    } catch {
      return { success: false, message: 'Error al obtener configuración' };
    }
  },

  async updateConfig(data: Partial<AdminConfig>): Promise<ApiResponse<{ config: AdminConfig }>> {
    try {
      return await AdminApiService.patch('/admin/config', data);
    } catch {
      return { success: false, message: 'Error al actualizar configuración' };
    }
  },

  async toggleMaintenance(activo: boolean, mensaje?: string): Promise<ApiResponse<{ mantenimiento_activo: boolean }>> {
    try {
      return await AdminApiService.patch('/admin/config/maintenance', { activo, mensaje });
    } catch {
      return { success: false, message: 'Error al cambiar modo mantenimiento' };
    }
  },
};
