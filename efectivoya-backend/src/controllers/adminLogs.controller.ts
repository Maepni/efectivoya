import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class AdminLogsController {
  /**
   * Listar logs de auditoria con paginacion y filtros
   * GET /api/admin/logs
   */
  static async listLogs(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { accion, user_id, admin_id, page = '1', limit = '50' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (accion) {
        where.accion = { contains: accion as string, mode: 'insensitive' };
      }

      if (user_id) {
        where.user_id = user_id;
      }

      if (admin_id) {
        where.admin_id = admin_id;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true
              }
            },
            admin: {
              select: {
                email: true,
                nombre: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.auditLog.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          logs,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      Logger.error('Error en listLogs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar logs'
      });
    }
  }

  /**
   * Obtener un log por ID
   * GET /api/admin/logs/:id
   */
  static async getLogById(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const log = await prisma.auditLog.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              email: true,
              nombres: true,
              apellidos: true
            }
          },
          admin: {
            select: {
              email: true,
              nombre: true
            }
          }
        }
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Log no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { log }
      });
    } catch (error) {
      Logger.error('Error en getLogById:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener log'
      });
    }
  }

  /**
   * Estadisticas de logs
   * GET /api/admin/logs/stats
   */
  static async getStats(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const hace24h = new Date();
      hace24h.setHours(hace24h.getHours() - 24);

      const [
        totalLogs,
        logsHoy,
        accionesMasComunes
      ] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({
          where: {
            created_at: { gte: hace24h }
          }
        }),
        prisma.auditLog.groupBy({
          by: ['accion'],
          _count: true,
          orderBy: {
            _count: {
              accion: 'desc'
            }
          },
          take: 10
        })
      ]);

      return res.json({
        success: true,
        data: {
          total_logs: totalLogs,
          logs_ultimas_24h: logsHoy,
          acciones_mas_comunes: accionesMasComunes.map(item => ({
            accion: item.accion,
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
