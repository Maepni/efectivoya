import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { Formatters } from '../utils/formatters.util';
import { PDFService } from '../services/pdf.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { ReferidosService } from '../services/referidos.service';

import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class AdminRecargasController {
  /**
   * GET /api/admin/recargas/pendientes
   * Lista todas las recargas pendientes de aprobar
   */
  static async getPendientes(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const [recargas, total] = await Promise.all([
        prisma.recarga.findMany({
          where: { estado: 'pendiente' },
          orderBy: { created_at: 'asc' }, // Primero las más antiguas
          skip,
          take: limit,
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
            }
          }
        }),
        prisma.recarga.count({ where: { estado: 'pendiente' } })
      ]);

      const totalPages = Math.ceil(total / limit);

      return res.json({
        success: true,
        data: {
          recargas: recargas.map(r => ({
            id: r.id,
            numeroOperacion: r.numero_operacion,
            bancoOrigen: r.banco_origen,
            montoDepositado: Formatters.formatCurrency(r.monto_depositado),
            comision: Formatters.formatCurrency(r.comision_calculada),
            montoNeto: Formatters.formatCurrency(r.monto_neto),
            boucherUrl: r.boucher_url,
            fecha: Formatters.formatDate(r.created_at),
            usuario: {
              id: r.user.id,
              email: r.user.email,
              nombre: `${r.user.nombres} ${r.user.apellidos}`,
              dni: r.user.dni,
              whatsapp: r.user.whatsapp,
              saldoActual: Formatters.formatCurrency(r.user.saldo_actual)
            }
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getPendientes:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener recargas pendientes'
      });
    }
  }

  /**
   * GET /api/admin/recargas/:id
   * Obtiene el detalle completo de una recarga
   */
  static async getDetalle(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const recarga = await prisma.recarga.findUnique({
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
              created_at: true,
              referido_por: true,
              bono_referido_usado: true
            }
          },
          admin: {
            select: {
              id: true,
              email: true,
              nombre: true
            }
          }
        }
      });

      if (!recarga) {
        return res.status(404).json({
          success: false,
          message: 'Recarga no encontrada'
        });
      }

      // Obtener historial de recargas del usuario
      const historialUsuario = await prisma.recarga.count({
        where: { user_id: recarga.user_id }
      });

      const recargasAprobadas = await prisma.recarga.count({
        where: { user_id: recarga.user_id, estado: 'aprobado' }
      });

      // Verificar alertas del usuario
      const alertasActivas = await prisma.alertaSeguridad.count({
        where: { user_id: recarga.user_id, revisada: false }
      });

      return res.json({
        success: true,
        data: {
          recarga: {
            id: recarga.id,
            numeroOperacion: recarga.numero_operacion,
            bancoOrigen: recarga.banco_origen,
            montoDepositado: Number(recarga.monto_depositado),
            montoDepositadoFormateado: Formatters.formatCurrency(recarga.monto_depositado),
            porcentajeComision: Number(recarga.porcentaje_comision),
            comisionCalculada: Number(recarga.comision_calculada),
            comisionFormateada: Formatters.formatCurrency(recarga.comision_calculada),
            montoNeto: Number(recarga.monto_neto),
            montoNetoFormateado: Formatters.formatCurrency(recarga.monto_neto),
            boucherUrl: recarga.boucher_url,
            estado: recarga.estado,
            motivoRechazo: recarga.motivo_rechazo,
            comprobantePdfUrl: recarga.comprobante_pdf_url,
            fecha: Formatters.formatDate(recarga.created_at),
            fechaProcesado: recarga.processed_at ? Formatters.formatDate(recarga.processed_at) : null,
            procesadoPor: recarga.admin ? {
              id: recarga.admin.id,
              email: recarga.admin.email,
              nombre: recarga.admin.nombre
            } : null
          },
          usuario: {
            id: recarga.user.id,
            email: recarga.user.email,
            nombre: `${recarga.user.nombres} ${recarga.user.apellidos}`,
            dni: recarga.user.dni,
            whatsapp: recarga.user.whatsapp,
            saldoActual: Formatters.formatCurrency(recarga.user.saldo_actual),
            fechaRegistro: Formatters.formatDate(recarga.user.created_at),
            esReferido: !!recarga.user.referido_por,
            bonoReferidoUsado: recarga.user.bono_referido_usado,
            estadisticas: {
              totalRecargas: historialUsuario,
              recargasAprobadas,
              alertasActivas
            }
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getDetalle:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalle de recarga'
      });
    }
  }

  /**
   * POST /api/admin/recargas/:id/aprobar
   * Aprueba una recarga pendiente
   */
  static async aprobar(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId!;
      const { id } = req.params;

      // Obtener recarga con datos del usuario
      const recarga = await prisma.recarga.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombres: true,
              apellidos: true,
              dni: true,
              saldo_actual: true
            }
          }
        }
      });

      if (!recarga) {
        return res.status(404).json({
          success: false,
          message: 'Recarga no encontrada'
        });
      }

      if (recarga.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: `Esta recarga ya fue ${recarga.estado}`
        });
      }

      const saldoAnterior = Number(recarga.user.saldo_actual);
      const montoNeto = Number(recarga.monto_neto);
      const saldoNuevo = saldoAnterior + montoNeto;

      // Generar PDF del comprobante
      const pdfBuffer = await PDFService.generateRecargaComprobante({
        numeroOperacion: recarga.numero_operacion,
        fecha: new Date(),
        usuario: {
          nombres: recarga.user.nombres,
          apellidos: recarga.user.apellidos,
          dni: recarga.user.dni,
          email: recarga.user.email
        },
        bancoOrigen: recarga.banco_origen,
        montoDepositado: recarga.monto_depositado,
        porcentajeComision: recarga.porcentaje_comision,
        comisionCalculada: recarga.comision_calculada,
        montoNeto: recarga.monto_neto,
        saldoAnterior,
        saldoNuevo
      });

      // Subir PDF a Cloudinary
      const pdfUpload = await CloudinaryService.uploadComprobantePDF(pdfBuffer, recarga.numero_operacion);

      // Ejecutar transacción
      await prisma.$transaction(async (tx) => {
        // 1. Actualizar saldo del usuario
        await tx.user.update({
          where: { id: recarga.user_id },
          data: {
            saldo_actual: { increment: new Decimal(montoNeto) }
          }
        });

        // 2. Actualizar recarga
        await tx.recarga.update({
          where: { id },
          data: {
            estado: 'aprobado',
            admin_id: adminId,
            comprobante_pdf_url: pdfUpload.url,
            processed_at: new Date()
          }
        });
      });

      // Procesar bonos de referido (fuera de la transacción principal)
      const bonosResult = await ReferidosService.procesarBonoReferido(recarga.user_id, recarga.id);

      // Audit log
      await AuditLogService.log('recarga_aprobada', req, undefined, adminId, {
        recarga_id: recarga.id,
        numero_operacion: recarga.numero_operacion,
        user_id: recarga.user_id,
        monto_neto: montoNeto,
        saldo_anterior: saldoAnterior,
        saldo_nuevo: saldoNuevo,
        bonos_otorgados: bonosResult
      });

      Logger.info(`Recarga aprobada: ${recarga.numero_operacion} por admin ${adminId}`);

      return res.json({
        success: true,
        message: 'Recarga aprobada correctamente',
        data: {
          numeroOperacion: recarga.numero_operacion,
          montoAcreditado: Formatters.formatCurrency(montoNeto),
          saldoAnterior: Formatters.formatCurrency(saldoAnterior),
          saldoNuevo: Formatters.formatCurrency(saldoNuevo),
          comprobanteUrl: pdfUpload.url,
          bonos: bonosResult.bonoOtorgadoReferido ? {
            mensaje: 'Se otorgaron bonos de referido',
            bonoReferido: Formatters.formatCurrency(bonosResult.montoBonoReferido),
            bonoReferente: Formatters.formatCurrency(bonosResult.montoBonoReferente)
          } : null
        }
      });
    } catch (error) {
      Logger.error('Error en aprobar:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al aprobar la recarga'
      });
    }
  }

  /**
   * POST /api/admin/recargas/:id/rechazar
   * Rechaza una recarga pendiente
   */
  static async rechazar(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId!;
      const { id } = req.params;
      const { motivo } = req.body;

      if (!motivo || motivo.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Debes proporcionar un motivo de rechazo (mínimo 10 caracteres)'
        });
      }

      const recarga = await prisma.recarga.findUnique({
        where: { id },
        include: {
          user: {
            select: { email: true }
          }
        }
      });

      if (!recarga) {
        return res.status(404).json({
          success: false,
          message: 'Recarga no encontrada'
        });
      }

      if (recarga.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: `Esta recarga ya fue ${recarga.estado}`
        });
      }

      // Actualizar recarga
      await prisma.recarga.update({
        where: { id },
        data: {
          estado: 'rechazado',
          admin_id: adminId,
          motivo_rechazo: motivo.trim(),
          processed_at: new Date()
        }
      });

      // Audit log
      await AuditLogService.log('recarga_rechazada', req, undefined, adminId, {
        recarga_id: recarga.id,
        numero_operacion: recarga.numero_operacion,
        user_id: recarga.user_id,
        motivo_rechazo: motivo.trim()
      });

      Logger.info(`Recarga rechazada: ${recarga.numero_operacion} por admin ${adminId}`);

      return res.json({
        success: true,
        message: 'Recarga rechazada',
        data: {
          numeroOperacion: recarga.numero_operacion,
          motivo: motivo.trim()
        }
      });
    } catch (error) {
      Logger.error('Error en rechazar:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al rechazar la recarga'
      });
    }
  }

  /**
   * GET /api/admin/recargas
   * Lista todas las recargas con filtros
   */
  static async getAll(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const estado = req.query.estado as string;
      const banco = req.query.banco as string;
      const fechaDesde = req.query.fecha_desde as string;
      const fechaHasta = req.query.fecha_hasta as string;
      const busqueda = req.query.busqueda as string;

      // Construir filtros
      const where: any = {};

      if (estado && ['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        where.estado = estado;
      }

      if (banco && ['BCP', 'Interbank', 'Scotiabank', 'BBVA'].includes(banco)) {
        where.banco_origen = banco;
      }

      if (fechaDesde) {
        where.created_at = { ...where.created_at, gte: new Date(fechaDesde) };
      }

      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        where.created_at = { ...where.created_at, lte: hasta };
      }

      if (busqueda) {
        where.OR = [
          { numero_operacion: { contains: busqueda, mode: 'insensitive' } },
          { user: { email: { contains: busqueda, mode: 'insensitive' } } },
          { user: { dni: { contains: busqueda } } }
        ];
      }

      const [recargas, total] = await Promise.all([
        prisma.recarga.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true,
                dni: true
              }
            },
            admin: {
              select: {
                nombre: true
              }
            }
          }
        }),
        prisma.recarga.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return res.json({
        success: true,
        data: {
          recargas: recargas.map(r => ({
            id: r.id,
            numeroOperacion: r.numero_operacion,
            bancoOrigen: r.banco_origen,
            montoDepositado: Formatters.formatCurrency(r.monto_depositado),
            montoNeto: Formatters.formatCurrency(r.monto_neto),
            estado: r.estado,
            fecha: Formatters.formatDate(r.created_at),
            fechaProcesado: r.processed_at ? Formatters.formatDate(r.processed_at) : null,
            usuario: {
              email: r.user.email,
              nombre: `${r.user.nombres} ${r.user.apellidos}`,
              dni: r.user.dni
            },
            procesadoPor: r.admin?.nombre || null
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages
          }
        }
      });
    } catch (error) {
      Logger.error('Error en getAll:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener recargas'
      });
    }
  }

  /**
   * GET /api/admin/recargas/stats
   * Obtiene estadísticas de recargas
   */
  static async getStats(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      // Obtener estadísticas
      const [
        pendientes,
        aprobadasHoy,
        rechazadasHoy,
        totalMes,
        montoTotalMes
      ] = await Promise.all([
        prisma.recarga.count({ where: { estado: 'pendiente' } }),
        prisma.recarga.count({
          where: {
            estado: 'aprobado',
            processed_at: { gte: hoy }
          }
        }),
        prisma.recarga.count({
          where: {
            estado: 'rechazado',
            processed_at: { gte: hoy }
          }
        }),
        prisma.recarga.count({
          where: {
            estado: 'aprobado',
            processed_at: { gte: inicioMes }
          }
        }),
        prisma.recarga.aggregate({
          where: {
            estado: 'aprobado',
            processed_at: { gte: inicioMes }
          },
          _sum: {
            monto_neto: true
          }
        })
      ]);

      const montoTotal = montoTotalMes._sum.monto_neto ? Number(montoTotalMes._sum.monto_neto) : 0;

      return res.json({
        success: true,
        data: {
          pendientes,
          hoy: {
            aprobadas: aprobadasHoy,
            rechazadas: rechazadasHoy
          },
          mes: {
            totalAprobadas: totalMes,
            montoTotal: Formatters.formatCurrency(montoTotal)
          }
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
