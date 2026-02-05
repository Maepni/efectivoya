import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = JWTUtil.verifyAccessToken(token);
      req.userId = decoded.userId;
      req.email = decoded.email;
      next();
    } catch (error) {
      Logger.error('Token inválido:', error);
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    Logger.error('Error en authMiddleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error de autenticación'
    });
  }
};
