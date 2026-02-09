import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { Formatters } from '../utils/formatters.util';
import { AuditLogService } from '../services/auditLog.service';
import { AlertasService } from '../services/alertas.service';
import { PDFService } from '../services/pdf.service';
import { FCMService } from '../services/fcm.service';

const prisma = new PrismaClient();

export class RetirosController {
  /**
   * 1. SOLICITAR RETIRO
   * POST /api/retiros
   */
  static async solicitarRetiro(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { user_bank_id, monto } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const montoNumber = parseFloat(monto);

      // Validar monto
      if (montoNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser mayor a 0'
        });
      }

      // Verificar que el banco existe y pertenece al usuario
      const banco = await prisma.userBank.findFirst({
        where: {
          id: user_bank_id,
          user_id: userId
        }
      });

      if (!banco) {
        return res.status(404).json({
          success: false,
          message: 'Banco no encontrado o no te pertenece'
        });
      }

      // Verificar saldo disponible
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { saldo_actual: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const saldoActual = user.saldo_actual.toNumber();

      if (montoNumber > saldoActual) {
        return res.status(400).json({
          success: false,
          message: `Saldo insuficiente. Tu saldo actual es ${Formatters.formatCurrency(saldoActual)}`
        });
      }

      // Generar numero de operacion
      const numero_operacion = Formatters.generateNumeroOperacion('RET');

      // Crear retiro
      const retiro = await prisma.retiro.create({
        data: {
          numero_operacion,
          user_id: userId,
          user_bank_id,
          monto: montoNumber,
          estado: 'pendiente'
        },
        include: {
          banco: true
        }
      });

      // Audit log
      await AuditLogService.log('retiro_solicitado', req, userId, undefined, {
        retiro_id: retiro.id,
        numero_operacion,
        monto: montoNumber,
        banco: banco.banco
      });

      // Verificar patron de retiro inmediato
      await AlertasService.verificarRetiroInmediato(userId, montoNumber);

      // Notificar a admins sobre nuevo retiro pendiente
      FCMService.notificarAdminsPendiente('retiro', numero_operacion).catch(err =>
        Logger.error('Error notificando admins:', err)
      );

      Logger.info(`Retiro solicitado: ${numero_operacion} - Usuario: ${userId} - Monto: ${montoNumber}`);

      return res.status(201).json({
        success: true,
        message: 'Solicitud de retiro enviada. Un administrador la procesara pronto.',
        data: {
          retiro: {
            id: retiro.id,
            numero_operacion: retiro.numero_operacion,
            monto: retiro.monto,
            banco: retiro.banco.banco,
            alias: retiro.banco.alias,
            estado: retiro.estado,
            created_at: retiro.created_at
          }
        }
      });
    } catch (error) {
      Logger.error('Error en solicitarRetiro:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al solicitar retiro'
      });
    }
  }

  /**
   * 2. HISTORIAL DE RETIROS DEL USUARIO
   * GET /api/retiros/historial
   */
  static async getHistorial(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { estado, page = '1', limit = '10' } = req.query;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { user_id: userId };
      if (estado) {
        where.estado = estado;
      }

      const [retiros, total] = await Promise.all([
        prisma.retiro.findMany({
          where,
          include: {
            banco: {
              select: {
                banco: true,
                alias: true,
                numero_cuenta: true,
                cci: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.retiro.count({ where })
      ]);

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
      Logger.error('Error en getHistorial:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener historial'
      });
    }
  }

  /**
   * 3. DESCARGAR COMPROBANTE (genera PDF on-the-fly)
   * GET /api/retiros/:id/comprobante
   */
  static async getComprobante(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const retiro = await prisma.retiro.findFirst({
        where: {
          id,
          user_id: userId
        },
        include: {
          user: {
            select: {
              nombres: true,
              apellidos: true,
              dni: true,
              email: true,
              saldo_actual: true
            }
          },
          banco: true
        }
      });

      if (!retiro) {
        return res.status(404).json({
          success: false,
          message: 'Retiro no encontrado'
        });
      }

      if (retiro.estado !== 'aprobado') {
        return res.status(400).json({
          success: false,
          message: 'Solo puedes descargar comprobantes de retiros aprobados'
        });
      }

      // Generar PDF on-the-fly
      const montoRetiro = retiro.monto.toNumber();
      const nuevoSaldo = retiro.user.saldo_actual.toNumber();
      const saldoAnterior = nuevoSaldo + montoRetiro;

      const pdfBuffer = await PDFService.generateRetiroComprobante({
        numero_operacion: retiro.numero_operacion,
        fecha: retiro.processed_at || retiro.created_at,
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
        nuevo_saldo: nuevoSaldo
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="comprobante-${retiro.numero_operacion}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      Logger.error('Error en getComprobante:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener comprobante'
      });
    }
  }
}
