import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { MaskDataUtil } from '../utils/maskData.util';

const prisma = new PrismaClient();

export class AdminUsersController {
  /**
   * Listar usuarios con paginacion y busqueda
   * GET /api/admin/users
   */
  static async listUsers(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { search, page = '1', limit = '20', is_active } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search as string, mode: 'insensitive' } },
          { nombres: { contains: search as string, mode: 'insensitive' } },
          { apellidos: { contains: search as string, mode: 'insensitive' } },
          { dni: { contains: search as string } }
        ];
      }

      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            nombres: true,
            apellidos: true,
            dni: true,
            whatsapp: true,
            saldo_actual: true,
            is_active: true,
            email_verificado: true,
            created_at: true,
            _count: {
              select: {
                recargas: true,
                retiros: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.user.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          users,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      Logger.error('Error en listUsers:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar usuarios'
      });
    }
  }

  /**
   * Obtener detalle completo de un usuario
   * GET /api/admin/users/:id
   */
  static async getUserDetail(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          bancos: true,
          recargas: {
            orderBy: { created_at: 'desc' },
            take: 10
          },
          retiros: {
            orderBy: { created_at: 'desc' },
            take: 10,
            include: {
              banco: true
            }
          },
          referidos_hechos: {
            include: {
              referred: {
                select: {
                  nombres: true,
                  apellidos: true,
                  email: true
                }
              }
            }
          },
          referidos_recibidos: {
            include: {
              referrer: {
                select: {
                  nombres: true,
                  apellidos: true,
                  codigo_referido: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const [totalRecargado, totalRetirado, alertas] = await Promise.all([
        prisma.recarga.aggregate({
          where: {
            user_id: id,
            estado: 'aprobado'
          },
          _sum: { monto_neto: true }
        }),
        prisma.retiro.aggregate({
          where: {
            user_id: id,
            estado: 'aprobado'
          },
          _sum: { monto: true }
        }),
        prisma.alertaSeguridad.findMany({
          where: { user_id: id },
          orderBy: { created_at: 'desc' },
          take: 5
        })
      ]);

      return res.json({
        success: true,
        data: {
          user: {
            ...user,
            dni: MaskDataUtil.maskDNI(user.dni),
            dni_completo: user.dni
          },
          estadisticas: {
            total_recargado: totalRecargado._sum.monto_neto?.toNumber() || 0,
            total_retirado: totalRetirado._sum.monto?.toNumber() || 0,
            saldo_actual: user.saldo_actual.toNumber()
          },
          alertas_recientes: alertas
        }
      });
    } catch (error) {
      Logger.error('Error en getUserDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalle del usuario'
      });
    }
  }

  /**
   * Suspender o activar un usuario
   * PATCH /api/admin/users/:id/toggle-status
   */
  static async toggleUserStatus(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;
      const { motivo } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { is_active: true, email: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const nuevoEstado = !user.is_active;

      const userActualizado = await prisma.user.update({
        where: { id },
        data: { is_active: nuevoEstado }
      });

      await AuditLogService.log(
        nuevoEstado ? 'usuario_activado' : 'usuario_suspendido',
        req,
        id,
        adminId,
        { motivo: motivo || 'Sin motivo especificado' }
      );

      Logger.info(
        `Usuario ${nuevoEstado ? 'activado' : 'suspendido'}: ${user.email} por admin ${adminId}`
      );

      return res.json({
        success: true,
        message: `Usuario ${nuevoEstado ? 'activado' : 'suspendido'} exitosamente`,
        data: {
          user: {
            id: userActualizado.id,
            email: userActualizado.email,
            is_active: userActualizado.is_active
          }
        }
      });
    } catch (error) {
      Logger.error('Error en toggleUserStatus:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar estado del usuario'
      });
    }
  }

  /**
   * Eliminar usuario y todos sus registros dependientes
   * DELETE /api/admin/users/:id
   */
  static async deleteUser(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, nombres: true, apellidos: true, dni: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Registrar en audit log ANTES de eliminar (con datos del usuario)
      await AuditLogService.log(
        'usuario_eliminado',
        req,
        undefined,
        adminId,
        {
          usuario_eliminado: {
            id: user.id,
            email: user.email,
            nombres: user.nombres,
            apellidos: user.apellidos,
            dni: user.dni
          }
        }
      );

      // Eliminar todo en transacción atómica
      const resultado = await prisma.$transaction(async (tx) => {
        // 1. ChatSoporte (ChatMensaje se borra por cascade)
        const chats = await tx.chatSoporte.deleteMany({ where: { user_id: id } });

        // 2. Referidos (ambas direcciones)
        const referidos = await tx.referido.deleteMany({
          where: { OR: [{ referrer_id: id }, { referred_id: id }] }
        });

        // 3. Alertas de seguridad
        const alertas = await tx.alertaSeguridad.deleteMany({ where: { user_id: id } });

        // 4. Audit logs del usuario
        const logs = await tx.auditLog.deleteMany({ where: { user_id: id } });

        // 5. Retiros (antes de UserBank, ya que Retiro tiene FK a UserBank)
        const retiros = await tx.retiro.deleteMany({ where: { user_id: id } });

        // 6. Recargas
        const recargas = await tx.recarga.deleteMany({ where: { user_id: id } });

        // 7. Limpiar self-referencia: usuarios que fueron referidos por este
        await tx.user.updateMany({
          where: { referido_por: id },
          data: { referido_por: null }
        });

        // 8. Eliminar usuario (UserBank se borra por cascade)
        await tx.user.delete({ where: { id } });

        return {
          chats: chats.count,
          referidos: referidos.count,
          alertas: alertas.count,
          logs: logs.count,
          retiros: retiros.count,
          recargas: recargas.count,
        };
      });

      Logger.info(`Usuario eliminado: ${user.email} (${id}) por admin ${adminId}`);

      return res.json({
        success: true,
        message: `Usuario ${user.email} eliminado exitosamente`,
        data: { registros_eliminados: resultado }
      });
    } catch (error) {
      Logger.error('Error en deleteUser:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar usuario'
      });
    }
  }

  /**
   * Estadisticas generales de usuarios
   * GET /api/admin/users/stats
   */
  static async getUsersStats(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const [
        totalUsuarios,
        verificados,
        activos,
        conSaldo,
        registrosHoy,
        registrosEsteMes
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { email_verificado: true } }),
        prisma.user.count({ where: { is_active: true } }),
        prisma.user.count({
          where: {
            saldo_actual: { gt: 0 }
          }
        }),
        prisma.user.count({
          where: {
            created_at: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.user.count({
          where: {
            created_at: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
          }
        })
      ]);

      return res.json({
        success: true,
        data: {
          total: totalUsuarios,
          verificados,
          activos,
          con_saldo: conSaldo,
          registros_hoy: registrosHoy,
          registros_este_mes: registrosEsteMes
        }
      });
    } catch (error) {
      Logger.error('Error en getUsersStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas'
      });
    }
  }
}
