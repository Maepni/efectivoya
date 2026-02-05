import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class AuditLogService {
  static async log(
    accion: string,
    req: Request,
    userId?: string,
    adminId?: string,
    detalles?: any
  ): Promise<void> {
    try {
      const ip_address = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const user_agent = req.headers['user-agent'] || 'unknown';

      await prisma.auditLog.create({
        data: {
          user_id: userId || null,
          admin_id: adminId || null,
          accion,
          ip_address,
          user_agent,
          detalles: detalles || null
        }
      });

      Logger.debug(`Audit log creado: ${accion} - User: ${userId} - Admin: ${adminId}`);
    } catch (error) {
      Logger.error('Error al crear audit log:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }
}
