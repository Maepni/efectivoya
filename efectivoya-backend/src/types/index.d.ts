import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminRol?: 'super_admin' | 'admin';
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface SocketAuthData {
  userId?: string;
  adminId?: string;
  email: string;
  tipo: 'usuario' | 'admin';
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  remitente_tipo: 'usuario' | 'admin';
  remitente_id: string;
  mensaje: string;
  created_at: Date;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}
