import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { PDFService } from '../services/pdf.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { AuditLogService } from '../services/auditLog.service';
import { FCMService } from '../services/fcm.service';

const prisma = new PrismaClient();

export class AdminRetirosController {
  /**
   * 1. LISTAR RETIROS PENDIENTES
   * GET /api/admin/retiros/pendientes
   */
  static async getPendientes(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const retiros = await prisma.retiro.findMany({
        where: { estado: 'pendiente' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombres: true,
              apellidos: true,
              dni: true,
              whatsapp: true,
              saldo_actual: true
            }
          },
          banco: {
            select: {
              banco: true,
              alias: true,
              numero_cuenta: true,
              cci: true
            }
          }
        },
        orderBy: { created_at: 'asc' }
      });

      return res.json({
        success: true,
        data: {
          retiros,
          total: retiros.length
        }
      });
    } catch (error) {
      Logger.error('Error en getPendientes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener retiros pendientes'
      });
    }
  }

  /**
   * 2. OBTENER DETALLE DE RETIRO
   * GET /api/admin/retiros/:id
   */
  static async getDetalle(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const retiro = await prisma.retiro.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombres: true,
              apellidos: true,
              dni: true,
              whatsapp: true,
              saldo_actual: true,
              created_at: true
            }
          },
          banco: true,
          admin: {
            select: {
              id: true,
              email: true,
              nombre: true
            }
          }
        }
      });

      if (!retiro) {
        return res.status(404).json({
          success: false,
          message: 'Retiro no encontrado'
        });
      }

      return res.json({
        success: true,
        data: {
          retiro: {
            id: retiro.id,
            numero_operacion: retiro.numero_operacion,
            monto: Number(retiro.monto),
            estado: retiro.estado,
            motivo_rechazo: retiro.motivo_rechazo,
            referencia_banco: retiro.referencia_banco,
            comprobante_pdf_url: retiro.comprobante_pdf_url,
            created_at: retiro.created_at.toISOString(),
            processed_at: retiro.processed_at ? retiro.processed_at.toISOString() : null,
            usuario: {
              id: retiro.user.id,
              email: retiro.user.email,
              nombres: retiro.user.nombres,
              apellidos: retiro.user.apellidos,
              dni: retiro.user.dni,
              whatsapp: retiro.user.whatsapp,
              saldo_actual: Number(retiro.user.saldo_actual)
            },
            banco: retiro.banco ? {
              banco: retiro.banco.banco,
              numero_cuenta: retiro.banco.numero_cuenta,
              cci: retiro.banco.cci,
              alias: retiro.banco.alias
            } : null,
            admin: retiro.admin ? {
              email: retiro.admin.email,
              nombre: retiro.admin.nombre
            } : null
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getDetalle:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalle'
      });
    }
  }

  /**
   * 3. APROBAR RETIRO
   * POST /api/admin/retiros/:id/aprobar
   */
  static async aprobar(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;
      const { referencia_banco } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Buscar retiro
      const retiro = await prisma.retiro.findUnique({
        where: { id },
        include: {
          user: true,
          banco: true
        }
      });

      if (!retiro) {
        return res.status(404).json({
          success: false,
          message: 'Retiro no encontrado'
        });
      }

      if (retiro.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: `Este retiro ya fue ${retiro.estado}`
        });
      }

      if (!retiro.banco) {
        return res.status(400).json({
          success: false,
          message: 'La cuenta bancaria asociada a este retiro fue eliminada'
        });
      }

      // Verificar saldo nuevamente (por si cambio)
      const saldoActual = retiro.user.saldo_actual.toNumber();
      const montoRetiro = retiro.monto.toNumber();

      if (montoRetiro > saldoActual) {
        return res.status(400).json({
          success: false,
          message: `El usuario no tiene saldo suficiente. Saldo actual: ${saldoActual}`
        });
      }

      const saldoAnterior = saldoActual;
      const nuevoSaldo = saldoActual - montoRetiro;

      // Usar transaccion para garantizar atomicidad
      const retiroAprobado = await prisma.$transaction(async (tx) => {
        // Descontar saldo del usuario
        const userActualizado = await tx.user.update({
          where: { id: retiro.user_id },
          data: {
            saldo_actual: {
              decrement: montoRetiro
            }
          }
        });

        // Actualizar retiro
        const retiroActualizado = await tx.retiro.update({
          where: { id },
          data: {
            estado: 'aprobado',
            admin_id: adminId,
            processed_at: new Date(),
            ...(referencia_banco ? { referencia_banco } : {})
          }
        });

        return { retiroActualizado, userActualizado };
      });

      // Generar comprobante PDF
      const pdfData = {
        numero_operacion: retiro.numero_operacion,
        fecha: new Date(),
        nombres: retiro.user.nombres,
        apellidos: retiro.user.apellidos,
        dni: retiro.user.dni,
        email: retiro.user.email,
        banco_destino: retiro.banco.banco,
        alias: retiro.banco.alias,
        numero_cuenta: retiro.banco.numero_cuenta,
        cci: retiro.banco.cci,
        monto: montoRetiro,
        saldo_anterior: saldoAnterior,
        nuevo_saldo: nuevoSaldo,
        referencia_banco: referencia_banco || undefined
      };

      const pdfBuffer = await PDFService.generateRetiroComprobante(pdfData);
      const uploadResult = await CloudinaryService.uploadComprobantePDF(
        pdfBuffer,
        retiro.numero_operacion
      );
      const comprobante_pdf_url = uploadResult.url;

      // Actualizar URL del comprobante
      await prisma.retiro.update({
        where: { id },
        data: { comprobante_pdf_url }
      });

      // Audit log
      await AuditLogService.log('retiro_aprobado', req, retiro.user_id, adminId, {
        retiro_id: id,
        numero_operacion: retiro.numero_operacion,
        monto: montoRetiro
      });

      Logger.info(`Retiro aprobado: ${retiro.numero_operacion} - Admin: ${adminId}`);

      // Enviar notificación push
      if (retiro.user.push_token) {
        try {
          await FCMService.notificarRetiroAprobado(
            retiro.user.push_token,
            retiro.numero_operacion,
            montoRetiro
          );
        } catch (pushError) {
          Logger.error('Error al enviar push notification:', pushError);
        }
      }

      return res.json({
        success: true,
        message: 'Retiro aprobado exitosamente. Recuerda transferir el dinero a la cuenta del usuario.',
        data: {
          retiro: retiroAprobado.retiroActualizado,
          nuevo_saldo_usuario: retiroAprobado.userActualizado.saldo_actual,
          comprobante_url: comprobante_pdf_url,
          datos_transferencia: {
            banco: retiro.banco.banco,
            numero_cuenta: retiro.banco.numero_cuenta,
            cci: retiro.banco.cci,
            monto: montoRetiro
          }
        }
      });
    } catch (error) {
      Logger.error('Error en aprobar:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al aprobar retiro'
      });
    }
  }

  /**
   * 4. RECHAZAR RETIRO
   * POST /api/admin/retiros/:id/rechazar
   */
  static async rechazar(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;
      const { motivo_rechazo } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (!motivo_rechazo || motivo_rechazo.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'El motivo de rechazo es requerido'
        });
      }

      // Buscar retiro con push_token del usuario
      const retiro = await prisma.retiro.findUnique({
        where: { id },
        include: {
          user: {
            select: { push_token: true }
          }
        }
      });

      if (!retiro) {
        return res.status(404).json({
          success: false,
          message: 'Retiro no encontrado'
        });
      }

      if (retiro.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: `Este retiro ya fue ${retiro.estado}`
        });
      }

      // Actualizar retiro
      const retiroRechazado = await prisma.retiro.update({
        where: { id },
        data: {
          estado: 'rechazado',
          admin_id: adminId,
          motivo_rechazo: motivo_rechazo.trim(),
          processed_at: new Date()
        }
      });

      // Audit log
      await AuditLogService.log('retiro_rechazado', req, retiro.user_id, adminId, {
        retiro_id: id,
        numero_operacion: retiro.numero_operacion,
        motivo: motivo_rechazo
      });

      Logger.info(`Retiro rechazado: ${retiro.numero_operacion} - Admin: ${adminId}`);

      // Enviar notificación push
      if (retiro.user.push_token) {
        try {
          await FCMService.notificarRetiroRechazado(
            retiro.user.push_token,
            retiro.numero_operacion,
            motivo_rechazo.trim()
          );
        } catch (pushError) {
          Logger.error('Error al enviar push notification:', pushError);
        }
      }

      return res.json({
        success: true,
        message: 'Retiro rechazado',
        data: {
          retiro: retiroRechazado
        }
      });
    } catch (error) {
      Logger.error('Error en rechazar:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al rechazar retiro'
      });
    }
  }

  /**
   * 5. OBTENER TODOS LOS RETIROS (con filtros)
   * GET /api/admin/retiros
   */
  static async getAll(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { estado, user_id, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (estado) {
        where.estado = estado;
      }
      if (user_id) {
        where.user_id = user_id;
      }

      const [retirosRaw, total] = await Promise.all([
        prisma.retiro.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nombres: true,
                apellidos: true,
                dni: true
              }
            },
            banco: {
              select: {
                banco: true,
                numero_cuenta: true,
                cci: true,
                alias: true
              }
            },
            admin: {
              select: {
                nombre: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.retiro.count({ where })
      ]);

      const retiros = retirosRaw.map(r => ({
        id: r.id,
        numero_operacion: r.numero_operacion,
        monto: Number(r.monto),
        estado: r.estado,
        created_at: r.created_at.toISOString(),
        processed_at: r.processed_at ? r.processed_at.toISOString() : null,
        motivo_rechazo: r.motivo_rechazo,
        usuario: {
          id: r.user.id,
          email: r.user.email,
          nombres: r.user.nombres,
          apellidos: r.user.apellidos,
          dni: r.user.dni
        },
        banco: r.banco ? {
          banco: r.banco.banco,
          numero_cuenta: r.banco.numero_cuenta,
          cci: r.banco.cci,
          alias: r.banco.alias
        } : null,
        procesadoPor: r.admin?.nombre || null
      }));

      return res.json({
        success: true,
        data: {
          retiros,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getAll:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener retiros'
      });
    }
  }

  /**
   * 6. ESTADISTICAS DE RETIROS
   * GET /api/admin/retiros/stats
   */
  static async getStats(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const [
        totalRetiros,
        pendientes,
        aprobados,
        rechazados,
        montoTotalAprobado
      ] = await Promise.all([
        prisma.retiro.count(),
        prisma.retiro.count({ where: { estado: 'pendiente' } }),
        prisma.retiro.count({ where: { estado: 'aprobado' } }),
        prisma.retiro.count({ where: { estado: 'rechazado' } }),
        prisma.retiro.aggregate({
          where: { estado: 'aprobado' },
          _sum: { monto: true }
        })
      ]);

      return res.json({
        success: true,
        data: {
          stats: {
            total_retiros: totalRetiros,
            pendientes,
            aprobados,
            rechazados,
            monto_total_aprobado: montoTotalAprobado._sum.monto || 0
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener estadisticas'
      });
    }
  }
}
