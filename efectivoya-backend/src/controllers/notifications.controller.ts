import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class NotificationsController {
  /**
   * POST /api/notifications/register-token
   * Registrar push token del usuario
   */
  static async registerToken(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { push_token } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (!push_token) {
        return res.status(400).json({
          success: false,
          message: 'Push token es requerido'
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { push_token }
      });

      Logger.info(`Push token registrado para usuario ${userId}`);

      return res.json({
        success: true,
        message: 'Token registrado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en registerToken:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al registrar token'
      });
    }
  }

  /**
   * POST /api/notifications/admin/register-token
   * Registrar push token del admin
   */
  static async registerAdminToken(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { push_token } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (!push_token) {
        return res.status(400).json({
          success: false,
          message: 'Push token es requerido'
        });
      }

      await prisma.admin.update({
        where: { id: adminId },
        data: { push_token }
      });

      Logger.info(`Push token registrado para admin ${adminId}`);

      return res.json({
        success: true,
        message: 'Token registrado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en registerAdminToken:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al registrar token'
      });
    }
  }

  /**
   * DELETE /api/notifications/token
   * Eliminar push token del usuario
   */
  static async deleteToken(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { push_token: null }
      });

      Logger.info(`Push token eliminado para usuario ${userId}`);

      return res.json({
        success: true,
        message: 'Token eliminado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en deleteToken:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar token'
      });
    }
  }
}
