import { AdminApiService } from './adminApi.service';
import type { ApiResponse } from '../types';
import type { AdminDashboardMetrics, AdminRecentActivity, AdminTrends } from '../types/admin';

export const adminDashboardService = {
  async getMetrics(): Promise<ApiResponse<AdminDashboardMetrics>> {
    try {
      return await AdminApiService.get<ApiResponse<AdminDashboardMetrics>>(
        '/admin/dashboard/metrics'
      );
    } catch {
      return { success: false, message: 'Error al obtener métricas' };
    }
  },

  async getRecentActivity(limit = 10): Promise<ApiResponse<AdminRecentActivity>> {
    try {
      return await AdminApiService.get<ApiResponse<AdminRecentActivity>>(
        '/admin/dashboard/recent-activity',
        { limit }
      );
    } catch {
      return { success: false, message: 'Error al obtener actividad reciente' };
    }
  },

  async getTrends(): Promise<ApiResponse<AdminTrends>> {
    try {
      return await AdminApiService.get<ApiResponse<AdminTrends>>(
        '/admin/dashboard/trends'
      );
    } catch {
      return { success: false, message: 'Error al obtener tendencias' };
    }
  },
};
