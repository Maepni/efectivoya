import jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-me';

export class JWTUtil {
  static generateAccessToken(userId: string, email: string): string {
    const payload: JWTPayload = { userId, email };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  }

  static generateRefreshToken(userId: string, tokenId: string): string {
    const payload: RefreshTokenPayload = { userId, tokenId };
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  static verifyAccessToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  }
}
