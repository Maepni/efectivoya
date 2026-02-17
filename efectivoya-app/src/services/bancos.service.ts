import { ApiService } from './api.service';
import type { ApiResponse, UserBank } from '../types';

class BancosService {
  async getBancos(): Promise<ApiResponse<{ bancos: UserBank[] }>> {
    return await ApiService.get('/user-banks');
  }

  async createBanco(data: {
    banco: 'BCP' | 'Interbank' | 'Scotiabank' | 'BBVA';
    tipo_cuenta?: 'ahorros' | 'corriente';
    numero_cuenta: string;
    cci: string;
    alias?: string;
  }): Promise<ApiResponse> {
    return await ApiService.post('/user-banks', data);
  }

  async updateBanco(id: string, data: Partial<{ tipo_cuenta: string; numero_cuenta: string; cci: string; alias: string }>): Promise<ApiResponse> {
    return await ApiService.put(`/user-banks/${id}`, data);
  }

  async deleteBanco(id: string): Promise<ApiResponse> {
    return await ApiService.delete(`/user-banks/${id}`);
  }
}

export default new BancosService();
