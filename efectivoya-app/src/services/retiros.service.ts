import { ApiService } from './api.service';
import type { ApiResponse, PaginatedResponse, Retiro } from '../types';

class RetirosService {
  async solicitarRetiro(data: {
    user_bank_id: string;
    monto: number;
  }): Promise<ApiResponse> {
    return await ApiService.post('/retiros', data);
  }

  async getHistorial(params?: {
    estado?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Retiro>> {
    return await ApiService.get('/retiros/historial', params);
  }

  async getComprobante(id: string): Promise<ApiResponse<{ comprobante_url: string }>> {
    return await ApiService.get(`/retiros/${id}/comprobante`);
  }
}

export default new RetirosService();
