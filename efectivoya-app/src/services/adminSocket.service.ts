import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config/api';
import type { ChatMessage } from '../types';

class AdminSocketService {
  private socket: Socket | null = null;

  async connect(): Promise<void> {
    const token = await AsyncStorage.getItem('adminAccessToken');
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      if (__DEV__) console.log('Admin socket connected');
    });

    this.socket.on('disconnect', () => {
      if (__DEV__) console.log('Admin socket disconnected');
    });

    this.socket.on('error', (error: { message: string }) => {
      if (__DEV__) console.error('Admin socket error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  sendMessage(chatId: string, mensaje: string): void {
    this.socket?.emit('send_message', { chat_id: chatId, mensaje });
  }

  onMessage(callback: (msg: ChatMessage) => void): () => void {
    this.socket?.on('new_message', callback);
    this.socket?.on('message_sent', callback);
    return () => {
      this.socket?.off('new_message', callback);
      this.socket?.off('message_sent', callback);
    };
  }

  markAsRead(chatId: string): void {
    this.socket?.emit('mark_as_read', chatId);
  }
}

export const adminSocketService = new AdminSocketService();
