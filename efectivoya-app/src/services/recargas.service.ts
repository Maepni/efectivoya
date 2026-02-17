import { ApiService } from './api.service';
import type { ApiResponse, PaginatedResponse, Recarga, RecargaConfig } from '../types';

class RecargasService {
  async getConfig(): Promise<ApiResponse<RecargaConfig>> {
    return await ApiService.get('/recargas/config');
  }

  async solicitarRecarga(data: {
    banco_origen: string;
    monto_depositado: number;
    boucher: { uri: string; name: string; type: string };
  }): Promise<ApiResponse> {
    return await ApiService.uploadFile('/recargas', data.boucher, {
      banco_origen: data.banco_origen,
      monto_depositado: data.monto_depositado.toString(),
    });
  }

  async getHistorial(params?: {
    estado?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Recarga>> {
    return await ApiService.get('/recargas/historial', params);
  }

  async getComprobante(id: string): Promise<ApiResponse<{ comprobante_url: string }>> {
    return await ApiService.get(`/recargas/${id}/comprobante`);
  }

  async getVideoInstructivo(banco: string): Promise<ApiResponse<{ video: { titulo: string; banco: string; video_url: string | null } }>> {
    return await ApiService.get(`/recargas/video/${banco}`);
  }
}

export default new RecargasService();
