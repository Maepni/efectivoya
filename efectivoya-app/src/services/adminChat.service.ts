import { AdminApiService } from './adminApi.service';
import type { ApiResponse } from '../types';
import type { AdminChatListItem, AdminPagination } from '../types/admin';

interface ChatFilters {
  page?: number;
  limit?: number;
  estado?: string;
}

interface AdminChatDetailResponse {
  chat: {
    id: string;
    estado: 'abierto' | 'cerrado';
    created_at: string;
    updated_at: string;
    user: {
      nombres: string;
      apellidos: string;
      email: string;
      whatsapp: string;
      saldo_actual: number | string;
    };
    mensajes: Array<{
      id: string;
      chat_id: string;
      remitente_tipo: 'usuario' | 'admin';
      remitente_id: string;
      mensaje: string;
      leido?: boolean;
      created_at: string;
    }>;
  };
}

export const adminChatService = {
  async getAll(filters: ChatFilters = {}): Promise<ApiResponse<{
    chats: AdminChatListItem[];
    pagination: AdminPagination;
  }>> {
    try {
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.estado) params.estado = filters.estado;

      return await AdminApiService.get('/admin/chats', params);
    } catch {
      return { success: false, message: 'Error al obtener chats' };
    }
  },

  async getDetail(id: string): Promise<ApiResponse<AdminChatDetailResponse>> {
    try {
      return await AdminApiService.get(`/admin/chats/${id}`);
    } catch {
      return { success: false, message: 'Error al obtener detalle del chat' };
    }
  },

  async cerrar(id: string): Promise<ApiResponse> {
    try {
      return await AdminApiService.patch(`/admin/chats/${id}/cerrar`);
    } catch {
      return { success: false, message: 'Error al cerrar chat' };
    }
  },

  async reabrir(id: string): Promise<ApiResponse> {
    try {
      return await AdminApiService.patch(`/admin/chats/${id}/reabrir`);
    } catch {
      return { success: false, message: 'Error al reabrir chat' };
    }
  },
};
