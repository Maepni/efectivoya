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
