import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AuthRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { Formatters } from '../utils/formatters.util';
import { CloudinaryService } from '../services/cloudinary.service';
import { AlertasService } from '../services/alertas.service';
import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class RecargasController {
  /**
   * GET /api/recargas/config
   * Obtiene la configuración pública para recargas
   */
  static async getConfig(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const config = await prisma.configuracion.findFirst({
        select: {
          porcentaje_comision: true,
          monto_minimo_recarga: true,
          monto_maximo_recarga: true,
          cuenta_recaudadora_numero: true,
          cuenta_recaudadora_banco: true,
          cuenta_recaudadora_titular: true
        }
      });

      if (!config) {
        return res.status(500).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      return res.json({
        success: true,
        data: {
          comision: {
            porcentaje: Number(config.porcentaje_comision),
            descripcion: `Se aplicará una comisión del ${config.porcentaje_comision}% al monto depositado`
          },
          limites: {
            minimo: Number(config.monto_minimo_recarga),
            maximo: Number(config.monto_maximo_recarga),
            minimoFormateado: Formatters.formatCurrency(config.monto_minimo_recarga),
            maximoFormateado: Formatters.formatCurrency(config.monto_maximo_recarga)
          },
          cuentaRecaudadora: {
            banco: config.cuenta_recaudadora_banco,
            numero: config.cuenta_recaudadora_numero,
            titular: config.cuenta_recaudadora_titular
          },
          bancosPermitidos: ['BCP', 'Interbank', 'Scotiabank', 'BBVA']
        }
      });
    } catch (error) {
      Logger.error('Error en getConfig:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener configuración'
      });
    }
  }

  /**
   * GET /api/recargas/video/:banco
   * Obtiene el video instructivo para un banco específico
   */
  static async getVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { banco } = req.params;

      const bancosValidos = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'];
      if (!bancosValidos.includes(banco)) {
        return res.status(400).json({
          success: false,
          message: 'Banco no válido'
        });
      }

      const video = await prisma.videoInstructivo.findUnique({
        where: { banco: banco as any }
      });

      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video no encontrado para este banco'
        });
      }

      return res.json({
        success: true,
        data: {
          banco: video.banco,
          titulo: video.titulo,
          youtubeUrl: video.youtube_url
        }
      });
    } catch (error) {
      Logger.error('Error en getVideo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener video'
      });
    }
  }

  /**
   * POST /api/recargas
   * Solicita una nueva recarga con boucher
   */
  static async solicitarRecarga(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId!;
      const { banco_origen, monto_depositado } = req.body;
      const file = req.file;

      // Validar que se subió un archivo
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'Debes subir una imagen del boucher'
        });
      }

      // Validar banco
      const bancosValidos = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'];
      if (!banco_origen || !bancosValidos.includes(banco_origen)) {
        return res.status(400).json({
          success: false,
          message: 'Banco de origen no válido'
        });
      }

      // Validar monto
      const monto = parseFloat(monto_depositado);
      if (isNaN(monto) || monto <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Monto depositado no válido'
        });
      }

      // Obtener configuración
      const config = await prisma.configuracion.findFirst();
      if (!config) {
        return res.status(500).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      // Validar límites
      const montoMinimo = Number(config.monto_minimo_recarga);
      const montoMaximo = Number(config.monto_maximo_recarga);

      if (monto < montoMinimo) {
        return res.status(400).json({
          success: false,
          message: `El monto mínimo de recarga es ${Formatters.formatCurrency(montoMinimo)}`
        });
      }

      if (monto > montoMaximo) {
        return res.status(400).json({
          success: false,
          message: `El monto máximo de recarga es ${Formatters.formatCurrency(montoMaximo)}`
        });
      }

      // Verificar que el usuario existe y está activo
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, is_active: true, email: true }
      });

      if (!user || !user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Usuario no encontrado o inactivo'
        });
      }

      // Calcular comisión
      const porcentajeComision = Number(config.porcentaje_comision);
      const comisionCalculada = monto * (porcentajeComision / 100);
      const montoNeto = monto - comisionCalculada;

      // Subir boucher a Cloudinary
      const uploadResult = await CloudinaryService.uploadBoucher(file.buffer, userId);

      // Generar número de operación único
      let numeroOperacion = Formatters.generateNumeroOperacion('REC');
      let operacionExists = await prisma.recarga.findUnique({ where: { numero_operacion: numeroOperacion } });
      while (operacionExists) {
        numeroOperacion = Formatters.generateNumeroOperacion('REC');
        operacionExists = await prisma.recarga.findUnique({ where: { numero_operacion: numeroOperacion } });
      }

      // Crear recarga
      const recarga = await prisma.recarga.create({
        data: {
          numero_operacion: numeroOperacion,
          user_id: userId,
          banco_origen: banco_origen as any,
          monto_depositado: new Decimal(monto),
          porcentaje_comision: new Decimal(porcentajeComision),
          comision_calculada: new Decimal(comisionCalculada),
          monto_neto: new Decimal(montoNeto),
          boucher_url: uploadResult.url,
          estado: 'pendiente'
        }
      });

      // Verificar alertas de seguridad
      await AlertasService.verificarMultiplesRecargas(userId);

      // Audit log
      await AuditLogService.log('recarga_solicitada', req, userId, undefined, {
        numero_operacion: numeroOperacion,
        monto_depositado: monto,
        banco_origen,
        comision: comisionCalculada,
        monto_neto: montoNeto
      });

      Logger.info(`Recarga solicitada: ${numeroOperacion} por ${user.email}`);

      return res.status(201).json({
        success: true,
        message: 'Recarga solicitada correctamente. Será procesada en breve.',
        data: {
          id: recarga.id,
          numeroOperacion: recarga.numero_operacion,
          bancoOrigen: recarga.banco_origen,
          montoDepositado: Formatters.formatCurrency(monto),
          comision: Formatters.formatCurrency(comisionCalculada),
          montoARecibir: Formatters.formatCurrency(montoNeto),
          estado: 'pendiente',
          fecha: Formatters.formatDate(recarga.created_at)
        }
      });
    } catch (error) {
      Logger.error('Error en solicitarRecarga:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud de recarga'
      });
    }
  }

  /**
   * GET /api/recargas/historial
   * Obtiene el historial de recargas del usuario (paginado)
   */
  static async getHistorial(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId!;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const estado = req.query.estado as string;

      const skip = (page - 1) * limit;

      // Construir filtro
      const where: any = { user_id: userId };
      if (estado && ['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
        where.estado = estado;
      }

      // Obtener recargas y total
      const [recargas, total] = await Promise.all([
        prisma.recarga.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            numero_operacion: true,
            banco_origen: true,
            monto_depositado: true,
            comision_calculada: true,
            monto_neto: true,
            estado: true,
            motivo_rechazo: true,
            comprobante_pdf_url: true,
            created_at: true,
            processed_at: true
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
            comision: Formatters.formatCurrency(r.comision_calculada),
            montoNeto: Formatters.formatCurrency(r.monto_neto),
            estado: r.estado,
            motivoRechazo: r.motivo_rechazo,
            tieneComprobante: !!r.comprobante_pdf_url,
            fecha: Formatters.formatDate(r.created_at),
            fechaProcesado: r.processed_at ? Formatters.formatDate(r.processed_at) : null
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
      Logger.error('Error en getHistorial:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener historial de recargas'
      });
    }
  }

  /**
   * GET /api/recargas/:id/comprobante
   * Obtiene la URL del comprobante PDF de una recarga aprobada
   */
  static async getComprobante(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const recarga = await prisma.recarga.findFirst({
        where: {
          id,
          user_id: userId
        },
        select: {
          id: true,
          numero_operacion: true,
          estado: true,
          comprobante_pdf_url: true
        }
      });

      if (!recarga) {
        return res.status(404).json({
          success: false,
          message: 'Recarga no encontrada'
        });
      }

      if (recarga.estado !== 'aprobado') {
        return res.status(400).json({
          success: false,
          message: 'El comprobante solo está disponible para recargas aprobadas'
        });
      }

      if (!recarga.comprobante_pdf_url) {
        return res.status(404).json({
          success: false,
          message: 'Comprobante no disponible'
        });
      }

      return res.json({
        success: true,
        data: {
          numeroOperacion: recarga.numero_operacion,
          comprobanteUrl: recarga.comprobante_pdf_url
        }
      });
    } catch (error) {
      Logger.error('Error en getComprobante:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener comprobante'
      });
    }
  }
}
