import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

/**
 * Middleware de autenticación para administradores
 * Verifica el token JWT y que el usuario sea un admin activo
 */
export const adminAuthMiddleware = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token de administrador no proporcionado'
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      // Verificar el token (usa el mismo JWT secret por simplicidad)
      const decoded = JWTUtil.verifyAccessToken(token);

      // Buscar el admin en la base de datos
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          rol: true,
          is_active: true
        }
      });

      if (!admin) {
        res.status(401).json({
          success: false,
          message: 'Administrador no encontrado'
        });
        return;
      }

      if (!admin.is_active) {
        res.status(403).json({
          success: false,
          message: 'Cuenta de administrador desactivada'
        });
        return;
      }

      // Inyectar datos del admin en el request
      req.adminId = admin.id;
      req.adminEmail = admin.email;
      req.adminRol = admin.rol;

      next();
    } catch (error) {
      Logger.error('Token de admin inválido:', error);
      res.status(401).json({
        success: false,
        message: 'Token de administrador inválido o expirado'
      });
    }
  } catch (error) {
    Logger.error('Error en adminAuthMiddleware:', error);
    res.status(500).json({
      success: false,
      message: 'Error de autenticación'
    });
  }
};

/**
 * Middleware para verificar rol de super_admin
 * Debe usarse después de adminAuthMiddleware
 */
export const superAdminMiddleware = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.adminRol !== 'super_admin') {
    res.status(403).json({
      success: false,
      message: 'Se requieren permisos de super administrador'
    });
    return;
  }
  next();
};
