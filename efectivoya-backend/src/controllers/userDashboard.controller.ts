import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class UserDashboardController {
  /**
   * 1. DASHBOARD COMPLETO DEL USUARIO
   * GET /api/user/dashboard
   */
  static async getDashboard(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Obtener usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          saldo_actual: true,
          codigo_referido: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Fechas para filtrar este mes
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const finMes = new Date();
      finMes.setMonth(finMes.getMonth() + 1);
      finMes.setDate(0);
      finMes.setHours(23, 59, 59, 999);

      // Estadisticas del mes
      const [recargasMes, retirosMes] = await Promise.all([
        prisma.recarga.aggregate({
          where: {
            user_id: userId,
            estado: 'aprobado',
            processed_at: {
              gte: inicioMes,
              lte: finMes
            }
          },
          _sum: { monto_neto: true },
          _count: true
        }),
        prisma.retiro.aggregate({
          where: {
            user_id: userId,
            estado: 'aprobado',
            processed_at: {
              gte: inicioMes,
              lte: finMes
            }
          },
          _sum: { monto: true },
          _count: true
        })
      ]);

      // Ultimas 5 operaciones combinadas
      const [ultimasRecargas, ultimosRetiros] = await Promise.all([
        prisma.recarga.findMany({
          where: { user_id: userId },
          select: {
            id: true,
            numero_operacion: true,
            banco_origen: true,
            monto_neto: true,
            estado: true,
            created_at: true
          },
          orderBy: { created_at: 'desc' },
          take: 5
        }),
        prisma.retiro.findMany({
          where: { user_id: userId },
          select: {
            id: true,
            numero_operacion: true,
            monto: true,
            estado: true,
            created_at: true,
            banco: {
              select: {
                banco: true,
                alias: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 5
        })
      ]);

      // Combinar y ordenar operaciones
      const operacionesCombinadas = [
        ...ultimasRecargas.map(r => ({
          tipo: 'recarga' as const,
          id: r.id,
          numero_operacion: r.numero_operacion,
          banco: r.banco_origen,
          monto: r.monto_neto.toNumber(),
          estado: r.estado,
          created_at: r.created_at
        })),
        ...ultimosRetiros.map(r => ({
          tipo: 'retiro' as const,
          id: r.id,
          numero_operacion: r.numero_operacion,
          banco: r.banco?.banco,
          alias: r.banco?.alias,
          monto: r.monto.toNumber(),
          estado: r.estado,
          created_at: r.created_at
        }))
      ].sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, 5);

      // Informacion de referidos
      const cantidadReferidos = await prisma.referido.count({
        where: {
          referrer_id: userId,
          bono_otorgado: true
        }
      });

      const config = await prisma.configuracion.findUnique({
        where: { id: 1 },
        select: {
          bono_referido: true,
          max_referidos_por_usuario: true
        }
      });

      const totalBonosGanados = cantidadReferidos * (config?.bono_referido.toNumber() || 0);

      return res.json({
        success: true,
        data: {
          saldo_disponible: user.saldo_actual.toNumber(),
          este_mes: {
            total_recargado: recargasMes._sum.monto_neto?.toNumber() || 0,
            total_retirado: retirosMes._sum.monto?.toNumber() || 0,
            cantidad_recargas: recargasMes._count,
            cantidad_retiros: retirosMes._count
          },
          ultimas_operaciones: operacionesCombinadas,
          referidos: {
            codigo_propio: user.codigo_referido,
            cantidad_referidos: cantidadReferidos,
            max_referidos: config?.max_referidos_por_usuario || 10,
            bonos_ganados: totalBonosGanados
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getDashboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener dashboard'
      });
    }
  }

  /**
   * 2. OBTENER CODIGO DE REFERIDO
   * GET /api/user/referido
   */
  static async getReferido(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          codigo_referido: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const cantidadReferidos = await prisma.referido.count({
        where: {
          referrer_id: userId,
          bono_otorgado: true
        }
      });

      const config = await prisma.configuracion.findUnique({
        where: { id: 1 },
        select: {
          max_referidos_por_usuario: true,
          bono_referido: true
        }
      });

      return res.json({
        success: true,
        data: {
          codigo_referido: user.codigo_referido,
          cantidad_referidos: cantidadReferidos,
          max_referidos: config?.max_referidos_por_usuario || 10,
          bono_por_referido: config?.bono_referido.toNumber() || 0,
          puede_referir_mas: cantidadReferidos < (config?.max_referidos_por_usuario || 10)
        }
      });
    } catch (error) {
      Logger.error('Error en getReferido:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener informacion de referidos'
      });
    }
  }

  /**
   * 3. OBTENER LISTA DE REFERIDOS
   * GET /api/user/referidos/lista
   */
  static async getListaReferidos(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const referidos = await prisma.referido.findMany({
        where: { referrer_id: userId },
        include: {
          referred: {
            select: {
              nombres: true,
              apellidos: true,
              email: true,
              created_at: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const referidosFormateados = referidos.map(r => ({
        id: r.id,
        usuario: `${r.referred.nombres} ${r.referred.apellidos}`,
        email: r.referred.email,
        fecha_registro: r.referred.created_at,
        bono_otorgado: r.bono_otorgado,
        fecha_primera_recarga: r.fecha_primera_recarga,
        created_at: r.created_at
      }));

      return res.json({
        success: true,
        data: {
          referidos: referidosFormateados,
          total: referidos.length
        }
      });
    } catch (error) {
      Logger.error('Error en getListaReferidos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener lista de referidos'
      });
    }
  }
}
