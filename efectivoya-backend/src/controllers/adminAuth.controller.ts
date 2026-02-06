import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class AdminAuthController {
  /**
   * Login de administrador
   * POST /api/admin/login
   */
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      // Validar campos requeridos
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      // Buscar admin por email
      const admin = await prisma.admin.findUnique({
        where: { email }
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, admin.password_hash);
      if (!validPassword) {
        // Audit log de intento fallido
        await AuditLogService.log('admin_login_fallido', req, undefined, admin.id, {
          email: admin.email,
          motivo: 'contraseña incorrecta'
        });

        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar que el admin esté activo
      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta de administrador ha sido desactivada'
        });
      }

      // Generar JWT con datos del admin
      const accessToken = JWTUtil.generateAccessToken(admin.id, admin.email);

      // Audit log de login exitoso
      await AuditLogService.log('admin_login', req, undefined, admin.id);

      Logger.info(`Admin login exitoso: ${admin.email}`);

      return res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          accessToken,
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
}
