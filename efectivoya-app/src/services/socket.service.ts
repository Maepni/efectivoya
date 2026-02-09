import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config/api';

class SocketService {
  private socket: Socket | null = null;

  async connect(): Promise<void> {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      if (__DEV__) console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      if (__DEV__) console.log('Socket disconnected');
    });

    this.socket.on('error', (error: { message: string }) => {
      if (__DEV__) console.error('Socket error:', error.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
