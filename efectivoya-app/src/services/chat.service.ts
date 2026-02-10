import { ApiService } from './api.service';
import type { ApiResponse, Chat, ChatMessage } from '../types';

class ChatService {
  async getOrCreateChat(): Promise<ApiResponse<{
    chat: Chat;
    mensajes: ChatMessage[];
    mensajes_no_leidos: number;
  }>> {
    return await ApiService.get('/chat');
  }
}

export default new ChatService();
