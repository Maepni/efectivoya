# FASE 5: Sistema de Retiros + Dashboard Usuario - EfectivoYa

## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

IMPORTANTE: Las FASES 1, 2, 3 y 4 ya están completadas. Tienes:
- Backend base con Prisma + PostgreSQL ✅
- Sistema de autenticación completo ✅
- Gestión de bancos del usuario ✅
- Sistema de recargas completo con Cloudinary y PDFs ✅

## OBJETIVO DE ESTA FASE
Implementar el sistema completo de retiros y dashboard del usuario:
- Solicitud de retiros a bancos propios registrados
- Validación de saldo disponible
- Aprobación/rechazo por administrador
- Generación automática de comprobantes PDF de retiro
- Dashboard del usuario con estadísticas mensuales
- Últimas operaciones (recargas + retiros)
- Sistema de referidos (ver código y cantidad)
- Alertas de seguridad automáticas (retiro inmediato post-recarga)
- Historial completo de retiros con paginación

## ESTRUCTURA A CREAR
efectivoya-backend/src/
├── controllers/
│   ├── retiros.controller.ts
│   ├── adminRetiros.controller.ts
│   └── userDashboard.controller.ts
├── routes/
│   ├── retiros.routes.ts
│   ├── adminRetiros.routes.ts
│   └── user.routes.ts
└── services/
└── (actualizar alertas.service.ts)

## INSTRUCCIONES DETALLADAS

### 1. ACTUALIZAR SERVICIO DE ALERTAS (src/services/alertas.service.ts)

Agrega este método al servicio existente:
```typescript
// ... imports existentes ...

export class AlertasService {
  // ... método verificarMultiplesRecargas existente ...

  /**
   * Verificar retiro inmediato después de recarga
   */
  static async verificarRetiroInmediato(userId: string, montoRetiro: number): Promise<void> {
    try {
      const hace24Horas = new Date();
      hace24Horas.setHours(hace24Horas.getHours() - 24);

      // Buscar recargas aprobadas en últimas 24 horas
      const recargasRecientes = await prisma.recarga.findMany({
        where: {
          user_id: userId,
          estado: 'aprobado',
          processed_at: {
            gte: hace24Horas
          }
        }
      });

      if (recargasRecientes.length === 0) {
        return; // No hay recargas recientes
      }

      // Obtener saldo actual del usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { saldo_actual: true }
      });

      if (!user) return;

      const saldoActual = user.saldo_actual.toNumber();
      const porcentajeRetiro = (montoRetiro / (saldoActual + montoRetiro)) * 100;

      // Si retira más del 80% del saldo dentro de 24h de haber recargado
      if (porcentajeRetiro > 80) {
        const montoRecargasRecientes = recargasRecientes.reduce(
          (sum, r) => sum + r.monto_neto.toNumber(),
          0
        );

        await prisma.alertaSeguridad.create({
          data: {
            user_id: userId,
            tipo: 'retiro_inmediato',
            descripcion: `Usuario retiró ${porcentajeRetiro.toFixed(1)}% del saldo dentro de 24h de recargar`,
            detalles: {
              monto_retiro: montoRetiro,
              porcentaje_retiro: porcentajeRetiro,
              recargas_recientes: recargasRecientes.length,
              monto_recargado: montoRecargasRecientes,
              horas_desde_ultima_recarga: Math.round(
                (new Date().getTime() - recargasRecientes[0].processed_at!.getTime()) / (1000 * 60 * 60)
              )
            }
          }
        });

        Logger.warn(
          `Alerta: Usuario ${userId} retira ${porcentajeRetiro.toFixed(1)}% dentro de 24h de recargar`
        );
      }
    } catch (error) {
      Logger.error('Error en verificarRetiroInmediato:', error);
    }
  }
}
```

### 2. ACTUALIZAR SERVICIO DE PDFs (src/services/pdf.service.ts)

Agrega esta interfaz y método al servicio existente:
```typescript
// ... imports y RecargaPDFData existentes ...

interface RetiroPDFData {
  numero_operacion: string;
  fecha: Date;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  banco_destino: string;
  alias: string | null;
  numero_cuenta: string;
  cci: string;
  monto: number;
  saldo_anterior: number;
  nuevo_saldo: number;
}

export class PDFService {
  // ... método generateRecargaComprobante existente ...

  /**
   * Generar comprobante de retiro en PDF
   */
  static async generateRetiroComprobante(data: RetiroPDFData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header con logo
        doc
          .fontSize(28)
          .fillColor('#1f1f1f')
          .text('Efectivo', 50, 50, { continued: true })
          .fillColor('#e83733')
          .text('Ya');

        doc
          .fontSize(10)
          .fillColor('#acacae')
          .text('Tu Dinero Al Instante', 50, 80);

        // Línea separadora
        doc
          .moveTo(50, 110)
          .lineTo(550, 110)
          .strokeColor('#dc993c')
          .lineWidth(2)
          .stroke();

        // Título
        doc
          .fontSize(20)
          .fillColor('#1f1f1f')
          .text('COMPROBANTE DE RETIRO', 50, 130, { align: 'center' });

        // Número de operación
        doc
          .fontSize(12)
          .fillColor('#acacae')
          .text(`N° de Operación: ${data.numero_operacion}`, 50, 170, { align: 'center' });

        // Fecha
        doc
          .fontSize(10)
          .text(`Fecha: ${Formatters.formatDate(data.fecha)}`, 50, 190, { align: 'center' });

        // Estado
        doc
          .fontSize(14)
          .fillColor('#10B981')
          .font('Helvetica-Bold')
          .text('APROBADO', 50, 210, { align: 'center' })
          .font('Helvetica');

        // Información del cliente
        doc
          .fontSize(12)
          .fillColor('#1f1f1f')
          .font('Helvetica-Bold')
          .text('INFORMACIÓN DEL CLIENTE', 50, 250);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#1f1f1f');

        const clienteY = 275;
        doc.text(`Cliente:`, 50, clienteY);
        doc.text(`${data.nombres} ${data.apellidos}`, 150, clienteY);

        doc.text(`DNI:`, 50, clienteY + 20);
        doc.text(data.dni, 150, clienteY + 20);

        doc.text(`Email:`, 50, clienteY + 40);
        doc.text(data.email, 150, clienteY + 40);

        // Línea separadora
        doc
          .moveTo(50, clienteY + 70)
          .lineTo(550, clienteY + 70)
          .strokeColor('#acacae')
          .lineWidth(1)
          .stroke();

        // Detalles del retiro
        doc
          .fontSize(12)
          .fillColor('#1f1f1f')
          .font('Helvetica-Bold')
          .text('DETALLES DEL RETIRO', 50, clienteY + 90);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#1f1f1f');

        const detallesY = clienteY + 115;
        doc.text(`Banco destino:`, 50, detallesY);
        doc.text(data.banco_destino, 200, detallesY);

        if (data.alias) {
          doc.text(`Alias:`, 50, detallesY + 25);
          doc.text(data.alias, 200, detallesY + 25);
        }

        const offsetAlias = data.alias ? 25 : 0;

        doc.text(`Número de cuenta:`, 50, detallesY + 25 + offsetAlias);
        doc.text(data.numero_cuenta, 200, detallesY + 25 + offsetAlias);

        doc.text(`CCI:`, 50, detallesY + 50 + offsetAlias);
        doc.text(data.cci, 200, detallesY + 50 + offsetAlias);

        // Monto retirado (destacado)
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#1f1f1f');

        doc.text(`Monto retirado:`, 50, detallesY + 80 + offsetAlias);
        doc.fillColor('#e83733').text(Formatters.formatCurrency(data.monto), 200, detallesY + 80 + offsetAlias);

        // Saldos
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#1f1f1f');

        doc.text(`Saldo anterior:`, 50, detallesY + 105 + offsetAlias);
        doc.text(Formatters.formatCurrency(data.saldo_anterior), 200, detallesY + 105 + offsetAlias);

        doc.text(`Nuevo saldo:`, 50, detallesY + 130 + offsetAlias);
        doc.fillColor('#dc993c').text(Formatters.formatCurrency(data.nuevo_saldo), 200, detallesY + 130 + offsetAlias);

        // Línea separadora
        doc
          .moveTo(50, detallesY + 160 + offsetAlias)
          .lineTo(550, detallesY + 160 + offsetAlias)
          .strokeColor('#acacae')
          .lineWidth(1)
          .stroke();

        // Nota informativa
        doc
          .fontSize(9)
          .fillColor('#acacae')
          .text(
            'Este comprobante es válido para fines informativos. El dinero será transferido a la cuenta indicada.',
            50,
            detallesY + 180 + offsetAlias,
            { align: 'center', width: 500 }
          );

        // Footer
        doc
          .fontSize(8)
          .fillColor('#acacae')
          .text(
            '© 2026 EfectivoYa. Todos los derechos reservados.',
            50,
            750,
            { align: 'center' }
          );

        doc.end();
      } catch (error) {
        Logger.error('Error al generar PDF de retiro:', error);
        reject(new Error('Error al generar comprobante PDF'));
      }
    });
  }
}
```

### 3. CONTROLADOR DE RETIROS - USUARIO (src/controllers/retiros.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { Formatters } from '../utils/formatters.util';
import { AuditLogService } from '../services/auditLog.service';
import { AlertasService } from '../services/alertas.service';

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

      // Generar número de operación
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

      // Verificar patrón de retiro inmediato
      await AlertasService.verificarRetiroInmediato(userId, montoNumber);

      Logger.info(`Retiro solicitado: ${numero_operacion} - Usuario: ${userId} - Monto: ${montoNumber}`);

      // TODO: Notificación push a admins

      return res.status(201).json({
        success: true,
        message: 'Solicitud de retiro enviada. Un administrador la procesará pronto.',
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
   * 3. DESCARGAR COMPROBANTE
   * GET /api/retiros/:id/comprobante
   */
  static async getComprobante(req: AuthRequest, res: Response): Promise<Response> {
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

      if (!retiro.comprobante_pdf_url) {
        return res.status(404).json({
          success: false,
          message: 'Comprobante no disponible'
        });
      }

      return res.json({
        success: true,
        data: {
          comprobante_url: retiro.comprobante_pdf_url
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
```

### 4. CONTROLADOR DE RETIROS - ADMIN (src/controllers/adminRetiros.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { PDFService } from '../services/pdf.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class AdminRetirosController {
  /**
   * 1. LISTAR RETIROS PENDIENTES
   * GET /api/admin/retiros/pendientes
   */
  static async getPendientes(req: AdminRequest, res: Response): Promise<Response> {
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
        data: { retiro }
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

      // Verificar saldo nuevamente (por si cambió)
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

      // Usar transacción para garantizar atomicidad
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
            processed_at: new Date()
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
        nuevo_saldo: nuevoSaldo
      };

      const pdfBuffer = await PDFService.generateRetiroComprobante(pdfData);
      const comprobante_pdf_url = await CloudinaryService.uploadComprobantePDF(
        pdfBuffer,
        retiro.numero_operacion
      );

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

      // TODO: Enviar email con comprobante
      // TODO: Enviar notificación push

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

      // Buscar retiro
      const retiro = await prisma.retiro.findUnique({
        where: { id }
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

      // TODO: Enviar email con motivo
      // TODO: Enviar notificación push

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

      const [retiros, total] = await Promise.all([
        prisma.retiro.findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                nombres: true,
                apellidos: true,
                dni: true
              }
            },
            banco: {
              select: {
                banco: true,
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
   * 6. ESTADÍSTICAS DE RETIROS
   * GET /api/admin/retiros/stats
   */
  static async getStats(req: AdminRequest, res: Response): Promise<Response> {
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
        message: 'Error al obtener estadísticas'
      });
    }
  }
}
### 5. CONTROLADOR DE DASHBOARD - USUARIO (src/controllers/userDashboard.controller.ts)
```typescript
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

      // Estadísticas del mes
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

      // Últimas 5 operaciones combinadas
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
          banco: r.banco.banco,
          alias: r.banco.alias,
          monto: r.monto.toNumber(),
          estado: r.estado,
          created_at: r.created_at
        }))
      ].sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).slice(0, 5);

      // Información de referidos
      const [cantidadReferidos, bonosGanados] = await Promise.all([
        prisma.referido.count({
          where: {
            referrer_id: userId,
            bono_otorgado: true
          }
        }),
        prisma.referido.findMany({
          where: {
            referrer_id: userId,
            bono_otorgado: true
          }
        })
      ]);

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
   * 2. OBTENER CÓDIGO DE REFERIDO
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
        message: 'Error al obtener información de referidos'
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
```

### 6. RUTAS DE RETIROS - USUARIO (src/routes/retiros.routes.ts)
```typescript
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { RetirosController } from '../controllers/retiros.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// 1. Solicitar retiro
router.post(
  '/',
  [
    body('user_bank_id')
      .isUUID()
      .withMessage('ID de banco inválido'),
    body('monto')
      .isNumeric()
      .withMessage('El monto debe ser un número')
      .custom((value) => parseFloat(value) > 0)
      .withMessage('El monto debe ser mayor a 0')
  ],
  validateRequest,
  RetirosController.solicitarRetiro
);

// 2. Historial de retiros
router.get(
  '/historial',
  [
    query('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  RetirosController.getHistorial
);

// 3. Descargar comprobante
router.get(
  '/:id/comprobante',
  [param('id').isUUID()],
  validateRequest,
  RetirosController.getComprobante
);

export default router;
```

### 7. RUTAS DE RETIROS - ADMIN (src/routes/adminRetiros.routes.ts)
```typescript
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminRetirosController } from '../controllers/adminRetiros.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Listar retiros pendientes
router.get('/pendientes', AdminRetirosController.getPendientes);

// 2. Estadísticas
router.get('/stats', AdminRetirosController.getStats);

// 3. Obtener todos los retiros (con filtros)
router.get(
  '/',
  [
    query('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado']),
    query('user_id').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminRetirosController.getAll
);

// 4. Detalle de retiro
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminRetirosController.getDetalle
);

// 5. Aprobar retiro
router.post(
  '/:id/aprobar',
  [param('id').isUUID()],
  validateRequest,
  AdminRetirosController.aprobar
);

// 6. Rechazar retiro
router.post(
  '/:id/rechazar',
  [
    param('id').isUUID(),
    body('motivo_rechazo')
      .isString()
      .notEmpty()
      .withMessage('El motivo de rechazo es requerido')
  ],
  validateRequest,
  AdminRetirosController.rechazar
);

export default router;
```

### 8. RUTAS DE USUARIO (src/routes/user.routes.ts)
```typescript
import { Router } from 'express';
import { UserDashboardController } from '../controllers/userDashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// 1. Dashboard completo
router.get('/dashboard', UserDashboardController.getDashboard);

// 2. Información de referido
router.get('/referido', UserDashboardController.getReferido);

// 3. Lista de referidos
router.get('/referidos/lista', UserDashboardController.getListaReferidos);

export default router;
```

### 9. ACTUALIZAR APP.TS

Agrega las importaciones y rutas:
```typescript
// ... imports existentes ...
import authRoutes from './routes/auth.routes';
import userBanksRoutes from './routes/userBanks.routes';
import recargasRoutes from './routes/recargas.routes';
import adminRecargasRoutes from './routes/adminRecargas.routes';
import retirosRoutes from './routes/retiros.routes';  // ← NUEVO
import adminRetirosRoutes from './routes/adminRetiros.routes';  // ← NUEVO
import userRoutes from './routes/user.routes';  // ← NUEVO

// ... middlewares existentes ...

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/user-banks', userBanksRoutes);
app.use('/api/recargas', recargasRoutes);
app.use('/api/admin/recargas', adminRecargasRoutes);
app.use('/api/retiros', retirosRoutes);  // ← AGREGAR
app.use('/api/admin/retiros', adminRetirosRoutes);  // ← AGREGAR
app.use('/api/user', userRoutes);  // ← AGREGAR

// ... error handlers ...
```

## PRUEBAS MANUALES COMPLETAS

### PREPARACIÓN
```bash
# 1. Asegúrate de tener el servidor corriendo
npm run dev

# 2. Login como usuario
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test123!@#"
  }'

# Guardar USER_TOKEN

# 3. Login como admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@efectivoya.com",
    "password": "Admin123!@#"
  }'

# Guardar ADMIN_TOKEN
```

### FLUJO COMPLETO DE RETIRO

#### 1. Verificar que el usuario tiene saldo
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer USER_TOKEN"
```

**Si no tiene saldo, primero hacer una recarga y aprobarla (ver Fase 4)**

#### 2. Verificar que el usuario tiene bancos registrados
```bash
curl -X GET http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer USER_TOKEN"
```

**Si no tiene bancos, registrar uno:**
```bash
curl -X POST http://localhost:3000/api/user-banks \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "banco": "BCP",
    "numero_cuenta": "1234567890123",
    "cci": "12345678901234567890",
    "alias": "Mi cuenta BCP"
  }'
```

**Guardar el ID del banco**

#### 3. Solicitar retiro
```bash
curl -X POST http://localhost:3000/api/retiros \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_bank_id": "UUID_DEL_BANCO",
    "monto": 500
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Solicitud de retiro enviada...",
  "data": {
    "retiro": {
      "id": "uuid...",
      "numero_operacion": "RET-20260204-XYZ789",
      "monto": 500,
      "banco": "BCP",
      "alias": "Mi cuenta BCP",
      "estado": "pendiente",
      "created_at": "2026-02-04T..."
    }
  }
}
```

#### 4. Verificar que el saldo NO se descontó aún (retiro pendiente)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer USER_TOKEN"
```

El saldo debe seguir igual.

#### 5. Ver retiros pendientes como admin
```bash
curl -X GET http://localhost:3000/api/admin/retiros/pendientes \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Guardar el ID del retiro pendiente**

#### 6. Aprobar retiro como admin
```bash
curl -X POST http://localhost:3000/api/admin/retiros/UUID_DEL_RETIRO/aprobar \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Retiro aprobado exitosamente. Recuerda transferir el dinero...",
  "data": {
    "retiro": {...},
    "nuevo_saldo_usuario": 1400,
    "comprobante_url": "https://res.cloudinary.com/...",
    "datos_transferencia": {
      "banco": "BCP",
      "numero_cuenta": "1234567890123",
      "cci": "12345678901234567890",
      "monto": 500
    }
  }
}
```

#### 7. Verificar que el saldo SÍ se descontó
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer USER_TOKEN"
```

Debe mostrar `saldo_actual: 1400` (si tenía 1900 antes)

#### 8. Descargar comprobante de retiro
```bash
curl -X GET http://localhost:3000/api/retiros/UUID_DEL_RETIRO/comprobante \
  -H "Authorization: Bearer USER_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "comprobante_url": "https://res.cloudinary.com/..."
  }
}
```

Visitar la URL para ver el PDF.

#### 9. Ver historial de retiros
```bash
curl -X GET http://localhost:3000/api/retiros/historial \
  -H "Authorization: Bearer USER_TOKEN"
```

### DASHBOARD DEL USUARIO

#### 1. Obtener dashboard completo
```bash
curl -X GET http://localhost:3000/api/user/dashboard \
  -H "Authorization: Bearer USER_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "saldo_disponible": 1400,
    "este_mes": {
      "total_recargado": 1900,
      "total_retirado": 500,
      "cantidad_recargas": 1,
      "cantidad_retiros": 1
    },
    "ultimas_operaciones": [
      {
        "tipo": "retiro",
        "numero_operacion": "RET-20260204-XYZ789",
        "banco": "BCP",
        "alias": "Mi cuenta BCP",
        "monto": 500,
        "estado": "aprobado",
        "created_at": "2026-02-04T..."
      },
      {
        "tipo": "recarga",
        "numero_operacion": "REC-20260204-ABC123",
        "banco": "BCP",
        "monto": 1900,
        "estado": "aprobado",
        "created_at": "2026-02-04T..."
      }
    ],
    "referidos": {
      "codigo_propio": "EFECTIVO-ABC123",
      "cantidad_referidos": 0,
      "max_referidos": 10,
      "bonos_ganados": 0
    }
  }
}
```

#### 2. Obtener información de referido
```bash
curl -X GET http://localhost:3000/api/user/referido \
  -H "Authorization: Bearer USER_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "codigo_referido": "EFECTIVO-ABC123",
    "cantidad_referidos": 0,
    "max_referidos": 10,
    "bono_por_referido": 10,
    "puede_referir_mas": true
  }
}
```

#### 3. Obtener lista de referidos
```bash
curl -X GET http://localhost:3000/api/user/referidos/lista \
  -H "Authorization: Bearer USER_TOKEN"
```

### PRUEBAS DE VALIDACIÓN

#### 1. Intentar retirar más del saldo disponible
```bash
curl -X POST http://localhost:3000/api/retiros \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_bank_id": "UUID_DEL_BANCO",
    "monto": 999999
  }'
```

**Respuesta esperada:**
```json
{
  "success": false,
  "message": "Saldo insuficiente. Tu saldo actual es S/. 1,400.00"
}
```

#### 2. Intentar retirar a banco que no es tuyo
```bash
# Obtener ID de banco de otro usuario (si tienes)
curl -X POST http://localhost:3000/api/retiros \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_bank_id": "UUID_DE_BANCO_DE_OTRO_USUARIO",
    "monto": 100
  }'
```

**Respuesta esperada:**
```json
{
  "success": false,
  "message": "Banco no encontrado o no te pertenece"
}
```

#### 3. Intentar aprobar retiro que ya fue procesado
```bash
# Aprobar el mismo retiro dos veces
curl -X POST http://localhost:3000/api/admin/retiros/UUID_DEL_RETIRO/aprobar \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": false,
  "message": "Este retiro ya fue aprobado"
}
```

### PRUEBAS DE ALERTAS DE SEGURIDAD

#### 1. Verificar alerta de retiro inmediato

**Escenario:** Usuario hace recarga, inmediatamente retira más del 80%
```bash
# Paso 1: Hacer recarga y aprobarla (ver Fase 4)
# Paso 2: Inmediatamente solicitar retiro de >80% del saldo
curl -X POST http://localhost:3000/api/retiros \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_bank_id": "UUID_DEL_BANCO",
    "monto": 1700
  }'
```

**Verificar en base de datos:**
```sql
SELECT * FROM alertas_seguridad 
WHERE user_id = 'UUID_DEL_USUARIO' 
AND tipo = 'retiro_inmediato';
```

Debe existir una alerta.

### ESTADÍSTICAS ADMIN

#### 1. Estadísticas de retiros
```bash
curl -X GET http://localhost:3000/api/admin/retiros/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total_retiros": 1,
      "pendientes": 0,
      "aprobados": 1,
      "rechazados": 0,
      "monto_total_aprobado": 500
    }
  }
}
```

#### 2. Todos los retiros con filtros
```bash
# Solo aprobados
curl -X GET "http://localhost:3000/api/admin/retiros?estado=aprobado&page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# De un usuario específico
curl -X GET "http://localhost:3000/api/admin/retiros?user_id=UUID_DEL_USUARIO" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### RECHAZAR RETIRO
```bash
curl -X POST http://localhost:3000/api/admin/retiros/UUID_DEL_RETIRO/rechazar \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "motivo_rechazo": "Datos bancarios incorrectos"
  }'
```

## RESULTADO ESPERADO

Al finalizar esta fase tendrás:
✅ Sistema completo de retiros con validación de saldo
✅ Aprobación/rechazo por admin sin afectar saldo hasta aprobación
✅ Generación automática de comprobantes PDF de retiro
✅ Dashboard del usuario con estadísticas mensuales
✅ Últimas 5 operaciones combinadas (recargas + retiros)
✅ Sistema de referidos visible en dashboard
✅ Alertas de seguridad automáticas (retiro inmediato >80%)
✅ Historial completo de retiros con paginación
✅ Estadísticas de retiros para admin
✅ Logs de auditoría completos
✅ Comprobantes descargables

## NOTAS IMPORTANTES

- Los retiros NO descuentan saldo hasta ser aprobados
- Admin debe hacer la transferencia bancaria externa manualmente
- Los comprobantes incluyen datos completos de la cuenta destino
- Alertas se crean si retira >80% dentro de 24h de recargar
- No hay límites de monto para retiros (solo validar saldo)
- Números de operación formato: RET-YYYYMMDD-RANDOM
- Dashboard muestra stats del mes actual (desde día 1)
- Últimas operaciones ordenadas por fecha descendente
- Sistema de referidos muestra código propio y cantidad de bonos ganados

## VERIFICACIONES FINALES

### En Base de Datos
```sql
-- Ver retiros
SELECT * FROM retiros ORDER BY created_at DESC LIMIT 5;

-- Ver alertas de seguridad
SELECT * FROM alertas_seguridad WHERE tipo = 'retiro_inmediato';

-- Ver logs de auditoría
SELECT * FROM audit_logs 
WHERE accion IN ('retiro_solicitado', 'retiro_aprobado', 'retiro_rechazado')
ORDER BY created_at DESC LIMIT 10;

-- Ver saldo actualizado
SELECT email, saldo_actual FROM users WHERE email = 'test@test.com';
```

### Flujo Completo Exitoso

1. ✅ Usuario tiene saldo (de recarga aprobada)
2. ✅ Usuario tiene banco registrado
3. ✅ Usuario solicita retiro
4. ✅ Retiro queda pendiente
5. ✅ Saldo NO se descuenta aún
6. ✅ Admin ve retiro pendiente
7. ✅ Admin aprueba retiro
8. ✅ Saldo SÍ se descuenta
9. ✅ PDF generado y subido a Cloudinary
10. ✅ Usuario puede descargar comprobante
11. ✅ Datos de transferencia mostrados a admin
12. ✅ Dashboard muestra operación
13. ✅ Alerta creada si corresponde