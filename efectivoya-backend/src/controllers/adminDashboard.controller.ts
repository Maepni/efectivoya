import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class AdminDashboardController {
  /**
   * Metricas generales del sistema
   * GET /api/admin/dashboard/metrics
   */
  static async getMetrics(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const [
        totalUsuarios,
        usuariosActivos,
        totalRecargas,
        recargasPendientes,
        totalRetiros,
        retirosPendientes,
        alertasPendientes,
        saldoTotalPlataforma,
        recargasHoy,
        retirosHoy
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { is_active: true } }),
        prisma.recarga.count(),
        prisma.recarga.count({ where: { estado: 'pendiente' } }),
        prisma.retiro.count(),
        prisma.retiro.count({ where: { estado: 'pendiente' } }),
        prisma.alertaSeguridad.count({ where: { revisada: false } }),
        prisma.user.aggregate({
          _sum: { saldo_actual: true }
        }),
        prisma.recarga.count({
          where: {
            created_at: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.retiro.count({
          where: {
            created_at: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]);

      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [recargasMes, retirosMes] = await Promise.all([
        prisma.recarga.aggregate({
          where: {
            estado: 'aprobado',
            processed_at: { gte: inicioMes }
          },
          _sum: {
            monto_depositado: true,
            comision_calculada: true,
            monto_neto: true
          }
        }),
        prisma.retiro.aggregate({
          where: {
            estado: 'aprobado',
            processed_at: { gte: inicioMes }
          },
          _sum: { monto: true }
        })
      ]);

      return res.json({
        success: true,
        data: {
          usuarios: {
            total: totalUsuarios,
            activos: usuariosActivos,
            inactivos: totalUsuarios - usuariosActivos
          },
          operaciones: {
            recargas: {
              total: totalRecargas,
              pendientes: recargasPendientes,
              hoy: recargasHoy
            },
            retiros: {
              total: totalRetiros,
              pendientes: retirosPendientes,
              hoy: retirosHoy
            }
          },
          alertas: {
            pendientes: alertasPendientes
          },
          financiero: {
            saldo_total_plataforma: saldoTotalPlataforma._sum.saldo_actual?.toNumber() || 0,
            este_mes: {
              total_depositado: recargasMes._sum.monto_depositado?.toNumber() || 0,
              comisiones_generadas: recargasMes._sum.comision_calculada?.toNumber() || 0,
              neto_recargado: recargasMes._sum.monto_neto?.toNumber() || 0,
              total_retirado: retirosMes._sum.monto?.toNumber() || 0
            }
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getMetrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener métricas'
      });
    }
  }

  /**
   * Actividad reciente del sistema
   * GET /api/admin/dashboard/recent-activity
   */
  static async getRecentActivity(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { limit = '10' } = req.query;
      const limitNum = parseInt(limit as string);

      const [
        recargasRecientes,
        retirosRecientes,
        usuariosNuevos
      ] = await Promise.all([
        prisma.recarga.findMany({
          take: limitNum,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true
              }
            }
          }
        }),
        prisma.retiro.findMany({
          take: limitNum,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true
              }
            }
          }
        }),
        prisma.user.findMany({
          take: limitNum,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            email: true,
            nombres: true,
            apellidos: true,
            created_at: true,
            email_verificado: true
          }
        })
      ]);

      return res.json({
        success: true,
        data: {
          recargas_recientes: recargasRecientes,
          retiros_recientes: retirosRecientes,
          usuarios_nuevos: usuariosNuevos
        }
      });
    } catch (error) {
      Logger.error('Error en getRecentActivity:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener actividad reciente'
      });
    }
  }

  /**
   * Tendencias de los ultimos 7 dias
   * GET /api/admin/dashboard/trends
   */
  static async getTrends(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      hace7Dias.setHours(0, 0, 0, 0);

      const recargasPorDia = await prisma.$queryRaw`
        SELECT
          DATE(created_at) as fecha,
          COUNT(*) as cantidad,
          SUM(monto_neto) as monto_total
        FROM recargas
        WHERE created_at >= ${hace7Dias}
          AND estado = 'aprobado'
        GROUP BY DATE(created_at)
        ORDER BY fecha ASC
      `;

      const retirosPorDia = await prisma.$queryRaw`
        SELECT
          DATE(created_at) as fecha,
          COUNT(*) as cantidad,
          SUM(monto) as monto_total
        FROM retiros
        WHERE created_at >= ${hace7Dias}
          AND estado = 'aprobado'
        GROUP BY DATE(created_at)
        ORDER BY fecha ASC
      `;

      const usuariosPorDia = await prisma.$queryRaw`
        SELECT
          DATE(created_at) as fecha,
          COUNT(*) as cantidad
        FROM users
        WHERE created_at >= ${hace7Dias}
        GROUP BY DATE(created_at)
        ORDER BY fecha ASC
      `;

      const serialize = (rows: any[]) =>
        rows.map((r) => ({
          fecha: r.fecha,
          cantidad: Number(r.cantidad),
          ...(r.monto_total !== undefined && { monto: Number(r.monto_total) }),
        }));

      return res.json({
        success: true,
        data: {
          recargas_por_dia: serialize(recargasPorDia as any[]),
          retiros_por_dia: serialize(retirosPorDia as any[]),
          usuarios_por_dia: serialize(usuariosPorDia as any[])
        }
      });
    } catch (error) {
      Logger.error('Error en getTrends:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener tendencias'
      });
    }
  }
}
