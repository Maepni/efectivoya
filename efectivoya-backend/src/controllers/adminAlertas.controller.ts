import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class AdminAlertasController {
  /**
   * Listar alertas con paginacion y filtros
   * GET /api/admin/alertas
   */
  static async listAlertas(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { tipo, revisada, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (tipo) {
        where.tipo = tipo;
      }

      if (revisada !== undefined) {
        where.revisada = revisada === 'true';
      }

      const [alertas, total] = await Promise.all([
        prisma.alertaSeguridad.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.alertaSeguridad.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          alertas,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      Logger.error('Error en listAlertas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar alertas'
      });
    }
  }

  /**
   * Marcar una alerta como revisada
   * PATCH /api/admin/alertas/:id/revisar
   */
  static async marcarRevisada(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const alerta = await prisma.alertaSeguridad.update({
        where: { id },
        data: {
          revisada: true,
          admin_id: adminId,
          reviewed_at: new Date()
        }
      });

      await AuditLogService.log('alerta_revisada', req, alerta.user_id, adminId, {
        alerta_id: id,
        tipo: alerta.tipo
      });

      return res.json({
        success: true,
        message: 'Alerta marcada como revisada',
        data: { alerta }
      });
    } catch (error) {
      Logger.error('Error en marcarRevisada:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al marcar alerta como revisada'
      });
    }
  }

  /**
   * Marcar todas las alertas pendientes como revisadas
   * PATCH /api/admin/alertas/revisar-todas
   */
  static async marcarTodasRevisadas(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const resultado = await prisma.alertaSeguridad.updateMany({
        where: { revisada: false },
        data: {
          revisada: true,
          admin_id: adminId,
          reviewed_at: new Date()
        }
      });

      await AuditLogService.log('alertas_masivas_revisadas', req, undefined, adminId, {
        cantidad: resultado.count
      });

      Logger.info(`${resultado.count} alertas marcadas como revisadas por admin ${adminId}`);

      return res.json({
        success: true,
        message: `${resultado.count} alertas marcadas como revisadas`,
        data: {
          cantidad_actualizada: resultado.count
        }
      });
    } catch (error) {
      Logger.error('Error en marcarTodasRevisadas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al marcar alertas como revisadas'
      });
    }
  }

  /**
   * Estadisticas de alertas
   * GET /api/admin/alertas/stats
   */
  static async getStats(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const [
        totalAlertas,
        pendientes,
        revisadas,
        porTipo
      ] = await Promise.all([
        prisma.alertaSeguridad.count(),
        prisma.alertaSeguridad.count({ where: { revisada: false } }),
        prisma.alertaSeguridad.count({ where: { revisada: true } }),
        prisma.alertaSeguridad.groupBy({
          by: ['tipo'],
          _count: true
        })
      ]);

      return res.json({
        success: true,
        data: {
          total: totalAlertas,
          pendientes,
          revisadas,
          por_tipo: porTipo.map(item => ({
            tipo: item.tipo,
            cantidad: item._count
          }))
        }
      });
    } catch (error) {
      Logger.error('Error en getStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas'
      });
    }
  }
}
