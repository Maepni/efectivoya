import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { AdminRequest } from '../types';

const prisma = new PrismaClient();

export class AdminAuthController {
  /**
   * Login de administrador
   * POST /api/admin/auth/login
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        await AuditLogService.log('admin_login_fallido', req, undefined, undefined, { email });
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      const validPassword = await bcrypt.compare(password, admin.password_hash);
      if (!validPassword) {
        await AuditLogService.log('admin_login_fallido', req, undefined, admin.id, { email });
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta de administrador ha sido desactivada'
        });
      }

      const accessToken = JWTUtil.generateAccessToken(admin.id, admin.email);
      const tokenId = uuidv4();
      const refreshToken = JWTUtil.generateRefreshToken(admin.id, tokenId);

      await AuditLogService.log('admin_login', req, undefined, admin.id);

      Logger.info(`Admin login exitoso: ${admin.email}`);

      return res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          accessToken,
          refreshToken,
          admin: {
            id: admin.id,
            email: admin.email,
            nombre: admin.nombre,
            rol: admin.rol
          }
        }
      });
    } catch (error) {
      Logger.error('Error en admin login:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión'
      });
    }
  }

  /**
   * Obtener perfil del admin autenticado
   * GET /api/admin/auth/profile
   */
  static async getProfile(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          is_active: true,
          created_at: true
        }
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Administrador no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { admin }
      });
    } catch (error) {
      Logger.error('Error en getProfile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener perfil'
      });
    }
  }

  /**
   * Refresh token de administrador
   * POST /api/admin/auth/refresh
   */
  static async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token es requerido'
        });
      }

      const decoded = JWTUtil.verifyRefreshToken(refreshToken);

      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, is_active: true }
      });

      if (!admin || !admin.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido o admin inactivo'
        });
      }

      const newAccessToken = JWTUtil.generateAccessToken(admin.id, admin.email);

      return res.json({
        success: true,
        data: { accessToken: newAccessToken }
      });
    } catch (error) {
      Logger.error('Error en admin refreshToken:', error);
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido o expirado'
      });
    }
  }

  /**
   * Logout de administrador
   * POST /api/admin/auth/logout
   */
  static async logout(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      await AuditLogService.log('admin_logout', req, undefined, adminId);

      Logger.info(`Admin logout: ${req.adminEmail}`);

      return res.json({
        success: true,
        message: 'Sesión cerrada correctamente'
      });
    } catch (error) {
      Logger.error('Error en logout:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
  }
}
