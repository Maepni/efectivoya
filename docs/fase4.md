# FASE 4: Sistema de Recargas Completo - EfectivoYa

## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

IMPORTANTE: Las FASES 1, 2 y 3 ya están completadas. Tienes:
- Backend base con Prisma + PostgreSQL ✅
- Sistema de autenticación completo con JWT ✅
- Gestión de bancos del usuario ✅

## OBJETIVO DE ESTA FASE
Implementar el sistema completo de recargas:
- Solicitud de recarga por usuario (con subida de boucher a Cloudinary)
- Cálculo automático de comisión
- Configuración dinámica desde base de datos
- Videos instructivos por banco
- Aprobación/rechazo por administrador
- Generación automática de comprobantes PDF
- Sistema de referidos (bonos automáticos en primera recarga)
- Envío de emails con comprobantes
- Alertas de seguridad automáticas
- Historial completo de recargas

## ESTRUCTURA A CREAR
efectivoya-backend/src/
├── controllers/
│   ├── recargas.controller.ts
│   └── adminRecargas.controller.ts
├── routes/
│   ├── recargas.routes.ts
│   └── adminRecargas.routes.ts
├── services/
│   ├── cloudinary.service.ts
│   ├── pdf.service.ts
│   ├── referidos.service.ts
│   └── alertas.service.ts
├── middleware/
│   ├── upload.middleware.ts
│   └── adminAuth.middleware.ts
└── utils/
└── formatters.util.ts

## INSTRUCCIONES DETALLADAS

### 1. INSTALAR DEPENDENCIAS
```bash
npm install multer cloudinary pdfkit
npm install --save-dev @types/multer @types/pdfkit
```

### 2. ACTUALIZAR .ENV.EXAMPLE

Agrega estas variables:
```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# URLs base
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:8081
```

### 3. UTILIDAD DE FORMATEO (src/utils/formatters.util.ts)
```typescript
export class Formatters {
  /**
   * Formatea un número a formato de moneda peruana
   * Ejemplo: 1234.56 → "S/. 1,234.56"
   */
  static formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `S/. ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Formatea una fecha a formato legible
   * Ejemplo: 2026-02-04T10:30:00.000Z → "04/02/2026 10:30"
   */
  static formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  /**
   * Genera número de operación único
   * Formato: REC-20260204-ABC123
   */
  static generateNumeroOperacion(tipo: 'REC' | 'RET'): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${tipo}-${timestamp}-${random}`;
  }
}
```

### 4. SERVICIO DE CLOUDINARY (src/services/cloudinary.service.ts)
```typescript
import { v2 as cloudinary } from 'cloudinary';
import { Logger } from '../utils/logger.util';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export class CloudinaryService {
  /**
   * Subir boucher (imagen) a Cloudinary
   */
  static async uploadBoucher(file: Express.Multer.File): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'efectivoya/bouchers',
            resource_type: 'auto',
            format: 'jpg',
            transformation: [
              { width: 1200, height: 1600, crop: 'limit' },
              { quality: 'auto:good' }
            ]
          },
          (error, result) => {
            if (error) {
              Logger.error('Error al subir boucher a Cloudinary:', error);
              reject(new Error('Error al subir imagen'));
            } else if (result) {
              Logger.info(`Boucher subido: ${result.secure_url}`);
              resolve(result.secure_url);
            }
          }
        );

        uploadStream.end(file.buffer);
      });
    } catch (error) {
      Logger.error('Error en uploadBoucher:', error);
      throw new Error('No se pudo subir el boucher');
    }
  }

  /**
   * Subir comprobante PDF a Cloudinary
   */
  static async uploadComprobantePDF(pdfBuffer: Buffer, numeroOperacion: string): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'efectivoya/comprobantes',
            resource_type: 'raw',
            public_id: `comprobante-${numeroOperacion}`,
            format: 'pdf'
          },
          (error, result) => {
            if (error) {
              Logger.error('Error al subir PDF a Cloudinary:', error);
              reject(new Error('Error al subir PDF'));
            } else if (result) {
              Logger.info(`PDF subido: ${result.secure_url}`);
              resolve(result.secure_url);
            }
          }
        );

        uploadStream.end(pdfBuffer);
      });
    } catch (error) {
      Logger.error('Error en uploadComprobantePDF:', error);
      throw new Error('No se pudo subir el comprobante');
    }
  }

  /**
   * Eliminar archivo de Cloudinary
   */
  static async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      Logger.info(`Archivo eliminado de Cloudinary: ${publicId}`);
    } catch (error) {
      Logger.error('Error al eliminar archivo de Cloudinary:', error);
    }
  }
}
```

### 5. SERVICIO DE PDFs (src/services/pdf.service.ts)
```typescript
import PDFDocument from 'pdfkit';
import { Formatters } from '../utils/formatters.util';
import { Logger } from '../utils/logger.util';

interface RecargaPDFData {
  numero_operacion: string;
  fecha: Date;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  banco_origen: string;
  monto_depositado: number;
  porcentaje_comision: number;
  comision_calculada: number;
  monto_neto: number;
  nuevo_saldo: number;
}

export class PDFService {
  /**
   * Generar comprobante de recarga en PDF
   */
  static async generateRecargaComprobante(data: RecargaPDFData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header con logo (texto por ahora)
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
          .text('COMPROBANTE DE RECARGA', 50, 130, { align: 'center' });

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

        // Detalles de la recarga
        doc
          .fontSize(12)
          .fillColor('#1f1f1f')
          .font('Helvetica-Bold')
          .text('DETALLES DE LA RECARGA', 50, clienteY + 90);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#1f1f1f');

        const detallesY = clienteY + 115;
        doc.text(`Banco origen:`, 50, detallesY);
        doc.text(data.banco_origen, 200, detallesY);

        doc.text(`Monto depositado:`, 50, detallesY + 25);
        doc.text(Formatters.formatCurrency(data.monto_depositado), 200, detallesY + 25);

        doc.text(`Comisión (${data.porcentaje_comision}%):`, 50, detallesY + 50);
        doc.fillColor('#e83733').text(Formatters.formatCurrency(data.comision_calculada), 200, detallesY + 50);

        // Monto neto (destacado)
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#1f1f1f');

        doc.text(`Monto neto recibido:`, 50, detallesY + 80);
        doc.fillColor('#10B981').text(Formatters.formatCurrency(data.monto_neto), 200, detallesY + 80);

        // Nuevo saldo
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#1f1f1f');

        doc.text(`Nuevo saldo:`, 50, detallesY + 105);
        doc.fillColor('#dc993c').text(Formatters.formatCurrency(data.nuevo_saldo), 200, detallesY + 105);

        // Línea separadora
        doc
          .moveTo(50, detallesY + 135)
          .lineTo(550, detallesY + 135)
          .strokeColor('#acacae')
          .lineWidth(1)
          .stroke();

        // Nota informativa
        doc
          .fontSize(9)
          .fillColor('#acacae')
          .text(
            'Este comprobante es válido para fines informativos. Conserve este documento para sus registros.',
            50,
            detallesY + 155,
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
        Logger.error('Error al generar PDF de recarga:', error);
        reject(new Error('Error al generar comprobante PDF'));
      }
    });
  }
}
```

### 6. SERVICIO DE REFERIDOS (src/services/referidos.service.ts)
```typescript
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class ReferidosService {
  /**
   * Verificar y otorgar bonos de referido en primera recarga
   */
  static async procesarBonoReferido(userId: string, recargaId: string): Promise<void> {
    try {
      // Buscar si este usuario fue referido
      const referido = await prisma.referido.findFirst({
        where: {
          referred_id: userId,
          bono_otorgado: false
        },
        include: {
          referrer: true
        }
      });

      if (!referido) {
        Logger.debug(`Usuario ${userId} no tiene referido pendiente`);
        return;
      }

      // Verificar que es la primera recarga aprobada
      const recargasAnteriores = await prisma.recarga.count({
        where: {
          user_id: userId,
          estado: 'aprobado',
          id: { not: recargaId }
        }
      });

      if (recargasAnteriores > 0) {
        Logger.debug(`Usuario ${userId} ya tiene recargas anteriores`);
        return;
      }

      // Obtener configuración de bono
      const config = await prisma.configuracion.findUnique({
        where: { id: 1 }
      });

      if (!config) {
        Logger.error('No se encontró configuración');
        return;
      }

      const bonoPorPersona = config.bono_referido;

      // Verificar límite de referidos del referrer
      const cantidadReferidos = await prisma.referido.count({
        where: {
          referrer_id: referido.referrer_id,
          bono_otorgado: true
        }
      });

      if (cantidadReferidos >= config.max_referidos_por_usuario) {
        Logger.warn(`Referrer ${referido.referrer_id} alcanzó límite de referidos`);
        return;
      }

      // Otorgar bono a ambos usuarios
      await prisma.$transaction(async (tx) => {
        // Bono al referrer (quien refirió)
        await tx.user.update({
          where: { id: referido.referrer_id },
          data: {
            saldo_actual: {
              increment: bonoPorPersona
            }
          }
        });

        // Bono al referred (quien fue referido)
        await tx.user.update({
          where: { id: userId },
          data: {
            saldo_actual: {
              increment: bonoPorPersona
            }
          }
        });

        // Marcar bono como otorgado
        await tx.referido.update({
          where: { id: referido.id },
          data: {
            bono_otorgado: true,
            fecha_primera_recarga: new Date()
          }
        });
      });

      Logger.info(`Bonos de referido otorgados: Referrer ${referido.referrer_id} y Referred ${userId} - ${bonoPorPersona} c/u`);

      // TODO: Enviar emails de notificación a ambos usuarios
    } catch (error) {
      Logger.error('Error en procesarBonoReferido:', error);
      // No lanzar error para no interrumpir flujo principal
    }
  }
}
```

### 7. SERVICIO DE ALERTAS (src/services/alertas.service.ts)
```typescript
import { PrismaClient, TipoAlerta } from '@prisma/client';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class AlertasService {
  /**
   * Crear alerta de múltiples recargas
   */
  static async verificarMultiplesRecargas(userId: string): Promise<void> {
    try {
      const unaHoraAtras = new Date();
      unaHoraAtras.setHours(unaHoraAtras.getHours() - 1);

      const recargasEnUltimaHora = await prisma.recarga.count({
        where: {
          user_id: userId,
          created_at: {
            gte: unaHoraAtras
          }
        }
      });

      if (recargasEnUltimaHora > 3) {
        await prisma.alertaSeguridad.create({
          data: {
            user_id: userId,
            tipo: 'multiples_recargas' as TipoAlerta,
            descripcion: `Usuario solicitó ${recargasEnUltimaHora} recargas en la última hora`,
            detalles: {
              cantidad_recargas: recargasEnUltimaHora,
              periodo: '1 hora'
            }
          }
        });

        Logger.warn(`Alerta: Usuario ${userId} tiene ${recargasEnUltimaHora} recargas en 1 hora`);
      }
    } catch (error) {
      Logger.error('Error en verificarMultiplesRecargas:', error);
    }
  }
}
```

### 8. MIDDLEWARE DE UPLOAD (src/middleware/upload.middleware.ts)
```typescript
import multer from 'multer';
import { Request } from 'express';

// Configurar multer para almacenar en memoria
const storage = multer.memoryStorage();

// Filtro de archivos: solo imágenes y PDFs
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no permitido. Solo JPG, PNG o PDF'));
  }
};

// Límite de tamaño: 5MB
export const uploadBoucher = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});
```

### 9. MIDDLEWARE DE ADMIN AUTH (src/middleware/adminAuth.middleware.ts)
```typescript
import { Response, NextFunction } from 'express';
import { AdminRequest } from '../types';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const adminAuthMiddleware = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = JWTUtil.verifyAccessToken(token);
      
      // Verificar que es un admin
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId }
      });

      if (!admin) {
        return res.status(403).json({
          success: false,
          message: 'Acceso solo para administradores'
        });
      }

      if (!admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Cuenta de administrador desactivada'
        });
      }

      req.adminId = admin.id;
      req.adminEmail = admin.email;
      req.adminRol = admin.rol;
      
      next();
    } catch (error) {
      Logger.error('Token inválido:', error);
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    Logger.error('Error en adminAuthMiddleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error de autenticación'
    });
  }
};
```

### 10. ACTUALIZAR TIPOS (src/types/index.d.ts)

Agrega el tipo AdminRequest si no existe:
```typescript
export interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminRol?: 'super_admin' | 'admin';
}
```

### 11. CONTROLADOR DE RECARGAS - USUARIO (src/controllers/recargas.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { Formatters } from '../utils/formatters.util';
import { CloudinaryService } from '../services/cloudinary.service';
import { AuditLogService } from '../services/auditLog.service';
import { AlertasService } from '../services/alertas.service';

const prisma = new PrismaClient();

export class RecargasController {
  /**
   * 1. OBTENER CONFIGURACIÓN DE RECARGA
   * GET /api/recargas/config
   */
  static async getConfig(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const config = await prisma.configuracion.findUnique({
        where: { id: 1 }
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      return res.json({
        success: true,
        data: {
          porcentaje_comision: config.porcentaje_comision.toNumber(),
          monto_minimo_recarga: config.monto_minimo_recarga.toNumber(),
          monto_maximo_recarga: config.monto_maximo_recarga.toNumber(),
          cuenta_recaudadora: {
            numero: config.cuenta_recaudadora_numero,
            banco: config.cuenta_recaudadora_banco,
            titular: config.cuenta_recaudadora_titular
          }
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
   * 2. OBTENER VIDEO INSTRUCTIVO
   * GET /api/recargas/video/:banco
   */
  static async getVideo(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { banco } = req.params;

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
          youtube_url: video.youtube_url,
          titulo: video.titulo
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
   * 3. SOLICITAR RECARGA
   * POST /api/recargas
   */
  static async solicitarRecarga(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { banco_origen, monto_depositado } = req.body;
      const file = req.file;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'El boucher es requerido'
        });
      }

      // Obtener configuración
      const config = await prisma.configuracion.findUnique({
        where: { id: 1 }
      });

      if (!config) {
        return res.status(500).json({
          success: false,
          message: 'Error de configuración'
        });
      }

      const monto = parseFloat(monto_depositado);
      const minimo = config.monto_minimo_recarga.toNumber();
      const maximo = config.monto_maximo_recarga.toNumber();

      // Validar monto
      if (monto < minimo || monto > maximo) {
        return res.status(400).json({
          success: false,
          message: `El monto debe estar entre ${Formatters.formatCurrency(minimo)} y ${Formatters.formatCurrency(maximo)}`
        });
      }

      // Subir boucher a Cloudinary
      const boucher_url = await CloudinaryService.uploadBoucher(file);

      // Calcular comisión
      const porcentaje_comision = config.porcentaje_comision.toNumber();
      const comision_calculada = (monto * porcentaje_comision) / 100;
      const monto_neto = monto - comision_calculada;

      // Generar número de operación
      const numero_operacion = Formatters.generateNumeroOperacion('REC');

      // Crear recarga
      const recarga = await prisma.recarga.create({
        data: {
          numero_operacion,
          user_id: userId,
          banco_origen: banco_origen as any,
          monto_depositado: monto,
          porcentaje_comision,
          comision_calculada,
          monto_neto,
          boucher_url,
          estado: 'pendiente'
        }
      });

      // Audit log
      await AuditLogService.log('recarga_solicitada', req, userId, undefined, {
        recarga_id: recarga.id,
        numero_operacion,
        monto_depositado: monto,
        banco_origen
      });

      // Verificar múltiples recargas
      await AlertasService.verificarMultiplesRecargas(userId);

      Logger.info(`Recarga solicitada: ${numero_operacion} - Usuario: ${userId} - Monto: ${monto}`);

      // TODO: Notificación push a admins

      return res.status(201).json({
        success: true,
        message: 'Solicitud de recarga enviada. Un administrador la revisará pronto.',
        data: {
          recarga: {
            id: recarga.id,
            numero_operacion: recarga.numero_operacion,
            banco_origen: recarga.banco_origen,
            monto_depositado: recarga.monto_depositado,
            comision_calculada: recarga.comision_calculada,
            monto_neto: recarga.monto_neto,
            estado: recarga.estado,
            created_at: recarga.created_at
          }
        }
      });
    } catch (error) {
      Logger.error('Error en solicitarRecarga:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al solicitar recarga'
      });
    }
  }

  /**
   * 4. HISTORIAL DE RECARGAS DEL USUARIO
   * GET /api/recargas/historial
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

      const [recargas, total] = await Promise.all([
        prisma.recarga.findMany({
          where,
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.recarga.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          recargas,
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
   * 5. DESCARGAR COMPROBANTE
   * GET /api/recargas/:id/comprobante
   */
  static async getComprobante(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const recarga = await prisma.recarga.findFirst({
        where: {
          id,
          user_id: userId
        },
        include: {
          user: true
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
          message: 'Solo puedes descargar comprobantes de recargas aprobadas'
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
          comprobante_url: recarga.comprobante_pdf_url
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

### 12. CONTROLADOR DE RECARGAS - ADMIN (src/controllers/adminRecargas.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { PDFService } from '../services/pdf.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { EmailService } from '../services/email.service';
import { AuditLogService } from '../services/auditLog.service';
import { ReferidosService } from '../services/referidos.service';
import { Formatters } from '../utils/formatters.util';

const prisma = new PrismaClient();

export class AdminRecargasController {
  /**
   * 1. LISTAR RECARGAS PENDIENTES
   * GET /api/admin/recargas/pendientes
   */
  static async getPendientes(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const recargas = await prisma.recarga.findMany({
        where: { estado: 'pendiente' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nombres: true,
              apellidos: true,
              dni: true,
              whatsapp: true
            }
          }
        },
        orderBy: { created_at: 'asc' } // Más antiguas primero
      });

      return res.json({
        success: true,
        data: {
          recargas,
          total: recargas.length
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
   * 2. OBTENER DETALLE DE RECARGA
   * GET /api/admin/recargas/:id
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
              created_at: true
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

      return res.json({
        success: true,
        data: { recarga }
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
   * 3. APROBAR RECARGA
   * POST /api/admin/recargas/:id/aprobar
   */
  static async aprobar(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Buscar recarga
      const recarga = await prisma.recarga.findUnique({
        where: { id },
        include: {
          user: true
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

      // Usar transacción para garantizar atomicidad
      const recargaAprobada = await prisma.$transaction(async (tx) => {
        // Actualizar saldo del usuario
        const userActualizado = await tx.user.update({
          where: { id: recarga.user_id },
          data: {
            saldo_actual: {
              increment: recarga.monto_neto
            }
          }
        });

        // Actualizar recarga
        const recargaActualizada = await tx.recarga.update({
          where: { id },
          data: {
            estado: 'aprobado',
            admin_id: adminId,
            processed_at: new Date()
          }
        });

        return { recargaActualizada, userActualizado };
      });

      // Generar comprobante PDF
      const pdfData = {
        numero_operacion: recarga.numero_operacion,
        fecha: new Date(),
        nombres: recarga.user.nombres,
        apellidos: recarga.user.apellidos,
        dni: recarga.user.dni,
        email: recarga.user.email,
        banco_origen: recarga.banco_origen,
        monto_depositado: recarga.monto_depositado.toNumber(),
        porcentaje_comision: recarga.porcentaje_comision.toNumber(),
        comision_calculada: recarga.comision_calculada.toNumber(),
        monto_neto: recarga.monto_neto.toNumber(),
        nuevo_saldo: recargaAprobada.userActualizado.saldo_actual.toNumber()
      };

      const pdfBuffer = await PDFService.generateRecargaComprobante(pdfData);
      const comprobante_pdf_url = await CloudinaryService.uploadComprobantePDF(
        pdfBuffer,
        recarga.numero_operacion
      );

      // Actualizar URL del comprobante
      await prisma.recarga.update({
        where: { id },
        data: { comprobante_pdf_url }
      });

      // Audit log
      await AuditLogService.log('recarga_aprobada', req, recarga.user_id, adminId, {
        recarga_id: id,
        numero_operacion: recarga.numero_operacion,
        monto_neto: recarga.monto_neto.toNumber()
      });

      // Procesar bono de referido si corresponde
      await ReferidosService.procesarBonoReferido(recarga.user_id, id);

      Logger.info(`Recarga aprobada: ${recarga.numero_operacion} - Admin: ${adminId}`);

      // TODO: Enviar email con comprobante adjunto
      // TODO: Enviar notificación push

      return res.json({
        success: true,
        message: 'Recarga aprobada exitosamente',
        data: {
          recarga: recargaAprobada.recargaActualizada,
          nuevo_saldo_usuario: recargaAprobada.userActualizado.saldo_actual,
          comprobante_url: comprobante_pdf_url
        }
      });
    } catch (error) {
      Logger.error('Error en aprobar:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al aprobar recarga'
      });
    }
  }

  /**
   * 4. RECHAZAR RECARGA
   * POST /api/admin/recargas/:id/rechazar
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

      // Buscar recarga
      const recarga = await prisma.recarga.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              email: true,
              nombres: true
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

      // Actualizar recarga
      const recargaRechazada = await prisma.recarga.update({
        where: { id },
        data: {
          estado: 'rechazado',
          admin_id: adminId,
          motivo_rechazo: motivo_rechazo.trim(),
          processed_at: new Date()
        }
      });

      // Audit log
      await AuditLogService.log('recarga_rechazada', req, recarga.user_id, adminId, {
        recarga_id: id,
        numero_operacion: recarga.numero_operacion,
        motivo: motivo_rechazo
      });

      Logger.info(`Recarga rechazada: ${recarga.numero_operacion} - Admin: ${adminId}`);

      // TODO: Enviar email al usuario con motivo
      // TODO: Enviar notificación push

      return res.json({
        success: true,
        message: 'Recarga rechazada',
        data: {
          recarga: recargaRechazada
        }
      });
    } catch (error) {
      Logger.error('Error en rechazar:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al rechazar recarga'
      });
    }
  }

  /**
   * 5. OBTENER TODAS LAS RECARGAS (con filtros)
   * GET /api/admin/recargas
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

      const [recargas, total] = await Promise.all([
        prisma.recarga.findMany({
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
        prisma.recarga.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          recargas,
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
        message: 'Error al obtener recargas'
      });
    }
  }

  /**
   * 6. ESTADÍSTICAS DE RECARGAS
   * GET /api/admin/recargas/stats
   */
  static async getStats(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const [
        totalRecargas,
        pendientes,
        aprobadas,
        rechazadas,
        montoTotalAprobado
      ] = await Promise.all([
        prisma.recarga.count(),
        prisma.recarga.count({ where: { estado: 'pendiente' } }),
        prisma.recarga.count({ where: { estado: 'aprobado' } }),
        prisma.recarga.count({ where: { estado: 'rechazado' } }),
        prisma.recarga.aggregate({
          where: { estado: 'aprobado' },
          _sum: { monto_neto: true }
        })
      ]);

      return res.json({
        success: true,
        data: {
          stats: {
            total_recargas: totalRecargas,
            pendientes,
            aprobadas,
            rechazadas,
            monto_total_aprobado: montoTotalAprobado._sum.monto_neto || 0
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
```

### 13. RUTAS DE RECARGAS - USUARIO (src/routes/recargas.routes.ts)
```typescript
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { RecargasController } from '../controllers/recargas.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadBoucher } from '../middleware/upload.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// 1. Obtener configuración
router.get('/config', RecargasController.getConfig);

// 2. Obtener video instructivo
router.get(
  '/video/:banco',
  [
    param('banco').isIn(['BCP', 'Interbank', 'Scotiabank', 'BBVA'])
  ],
  validateRequest,
  RecargasController.getVideo
);

// 3. Solicitar recarga
router.post(
  '/',
  uploadBoucher.single('boucher'),
  [
    body('banco_origen')
      .isIn(['BCP', 'Interbank', 'Scotiabank', 'BBVA'])
      .withMessage('Banco debe ser: BCP, Interbank, Scotiabank o BBVA'),
    body('monto_depositado')
      .isNumeric()
      .withMessage('El monto debe ser un número')
  ],
  validateRequest,
  RecargasController.solicitarRecarga
);

// 4. Historial de recargas
router.get(
  '/historial',
  [
    query('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  RecargasController.getHistorial
);

// 5. Descargar comprobante
router.get(
  '/:id/comprobante',
  [param('id').isUUID()],
  validateRequest,
  RecargasController.getComprobante
);

export default router;
```

### 14. RUTAS DE RECARGAS - ADMIN (src/routes/adminRecargas.routes.ts)
```typescript
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminRecargasController } from '../controllers/adminRecargas.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Listar recargas pendientes
router.get('/pendientes', AdminRecargasController.getPendientes);

// 2. Estadísticas
router.get('/stats', AdminRecargasController.getStats);

// 3. Obtener todas las recargas (con filtros)
router.get(
  '/',
  [
    query('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado']),
    query('user_id').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminRecargasController.getAll
);

// 4. Detalle de recarga
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminRecargasController.getDetalle
);

// 5. Aprobar recarga
router.post(
  '/:id/aprobar',
  [param('id').isUUID()],
  validateRequest,
  AdminRecargasController.aprobar
);

// 6. Rechazar recarga
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
  AdminRecargasController.rechazar
);

export default router;
```

### 15. ACTUALIZAR APP.TS

Agrega las importaciones y rutas:
```typescript
// ... imports existentes ...
import authRoutes from './routes/auth.routes';
import userBanksRoutes from './routes/userBanks.routes';
import recargasRoutes from './routes/recargas.routes';
import adminRecargasRoutes from './routes/adminRecargas.routes';

// ... middlewares existentes ...

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/user-banks', userBanksRoutes);
app.use('/api/recargas', recargasRoutes);  // ← AGREGAR
app.use('/api/admin/recargas', adminRecargasRoutes);  // ← AGREGAR

// ... error handlers ...
```

### 16. CREAR SEED INICIAL (prisma/seed.ts)
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // 1. Crear configuración inicial
  const config = await prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      porcentaje_comision: 5.0,
      monto_minimo_recarga: 1000,
      monto_maximo_recarga: 100000,
      cuenta_recaudadora_numero: '1234567890123456',
      cuenta_recaudadora_banco: 'BCP',
      cuenta_recaudadora_titular: 'EFECTIVOYA SAC',
      mantenimiento_activo: false,
      version_minima_android: '1.0.0',
      version_minima_ios: '1.0.0',
      forzar_actualizacion: false,
      bono_referido: 10.0,
      max_referidos_por_usuario: 10
    }
  });

  console.log('✅ Configuración creada:', config);

  // 2. Crear admin inicial
  const adminPassword = await bcrypt.hash('Admin123!@#', 10);
  
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@efectivoya.com' },
    update: {},
    create: {
      email: 'admin@efectivoya.com',
      password_hash: adminPassword,
      nombre: 'Administrador Principal',
      rol: 'super_admin',
      is_active: true
    }
  });

  console.log('✅ Admin creado:', admin.email);

  // 3. Crear videos instructivos
  const videos = [
    {
      banco: 'BCP',
      youtube_url: 'https://www.youtube.com/watch?v=ejemplo-bcp',
      titulo: 'Cómo realizar una transferencia desde BCP'
    },
    {
      banco: 'Interbank',
      youtube_url: 'https://www.youtube.com/watch?v=ejemplo-interbank',
      titulo: 'Cómo realizar una transferencia desde Interbank'
    },
    {
      banco: 'Scotiabank',
      youtube_url: 'https://www.youtube.com/watch?v=ejemplo-scotiabank',
      titulo: 'Cómo realizar una transferencia desde Scotiabank'
    },
    {
      banco: 'BBVA',
      youtube_url: 'https://www.youtube.com/watch?v=ejemplo-bbva',
      titulo: 'Cómo realizar una transferencia desde BBVA'
    }
  ];

  for (const video of videos) {
    await prisma.videoInstructivo.upsert({
      where: { banco: video.banco as any },
      update: {},
      create: video as any
    });
  }

  console.log('✅ Videos instructivos creados');

  // 4. Crear términos y políticas iniciales
  await prisma.terminosCondiciones.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      contenido: '<h1>Términos y Condiciones de EfectivoYa</h1><p>Contenido placeholder. Actualizar desde el panel admin.</p>',
      version: '1.0'
    }
  });

  await prisma.politicasPrivacidad.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      contenido: '<h1>Política de Privacidad de EfectivoYa</h1><p>Contenido placeholder. Actualizar desde el panel admin.</p>',
      version: '1.0'
    }
  });

  console.log('✅ Términos y políticas creados');

  // 5. Crear FAQs iniciales
  const faqs = [
    {
      pregunta: '¿Cuánto tiempo demora en procesarse una recarga?',
      respuesta: 'Las recargas son procesadas manualmente por nuestro equipo. Normalmente toman entre 15 minutos y 2 horas hábiles.',
      orden: 1
    },
    {
      pregunta: '¿Cuál es la comisión por recarga?',
      respuesta: 'Actualmente cobramos una comisión del 5% sobre el monto que deposites.',
      orden: 2
    },
    {
      pregunta: '¿Cuál es el monto mínimo y máximo para recargar?',
      respuesta: 'El monto mínimo es S/. 1,000 y el máximo es S/. 100,000 por transacción.',
      orden: 3
    },
    {
      pregunta: '¿Puedo retirar mi dinero cuando quiera?',
      respuesta: 'Sí, puedes solicitar retiros en cualquier momento a tus cuentas bancarias registradas sin comisión.',
      orden: 4
    }
  ];

  for (const faq of faqs) {
    await prisma.fAQ.create({
      data: faq
    });
  }

  console.log('✅ FAQs creadas');

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 17. ACTUALIZAR PACKAGE.JSON

Agrega el script de seed:
```json
{
  "scripts": {
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

## CONFIGURACIÓN DE CLOUDINARY

1. Crea cuenta en https://cloudinary.com (gratis)
2. Obtén tus credenciales del dashboard
3. Agrega a tu .env:
```env
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

## EJECUTAR SEED
```bash
npm run prisma:seed
```

## PRUEBAS MANUALES

### 1. Login como Admin (para aprobar recargas)
```bash
# Primero crear el admin con el seed
npm run prisma:seed

# Login de admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@efectivoya.com",
    "password": "Admin123!@#"
  }'

# Guardar el accessToken del admin
```

### 2. Login como Usuario
```bash
# Login de usuario regular (creado en fase 2)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test123!@#"
  }'

# Guardar el accessToken del usuario
```

### 3. Obtener Configuración
```bash
curl -X GET http://localhost:3000/api/recargas/config \
  -H "Authorization: Bearer USER_ACCESS_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "porcentaje_comision": 5,
    "monto_minimo_recarga": 1000,
    "monto_maximo_recarga": 100000,
    "cuenta_recaudadora": {
      "numero": "1234567890123456",
      "banco": "BCP",
      "titular": "EFECTIVOYA SAC"
    }
  }
}
```

### 4. Obtener Video Instructivo
```bash
curl -X GET http://localhost:3000/api/recargas/video/BCP \
  -H "Authorization: Bearer USER_ACCESS_TOKEN"
```

### 5. Solicitar Recarga (con archivo)

**Usando Postman o herramienta similar:**
POST http://localhost:3000/api/recargas
Headers:
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: multipart/form-data
Body (form-data):
banco_origen: BCP
monto_depositado: 2000
boucher: [seleccionar archivo de imagen]

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Solicitud de recarga enviada...",
  "data": {
    "recarga": {
      "id": "uuid...",
      "numero_operacion": "REC-20260204-ABC123",
      "banco_origen": "BCP",
      "monto_depositado": 2000,
      "comision_calculada": 100,
      "monto_neto": 1900,
      "estado": "pendiente",
      "created_at": "2026-02-04T..."
    }
  }
}
```

### 6. Listar Recargas Pendientes (como Admin)
```bash
curl -X GET http://localhost:3000/api/admin/recargas/pendientes \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 7. Aprobar Recarga (como Admin)
```bash
curl -X POST http://localhost:3000/api/admin/recargas/UUID_DE_RECARGA/aprobar \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Recarga aprobada exitosamente",
  "data": {
    "recarga": {...},
    "nuevo_saldo_usuario": 1900,
    "comprobante_url": "https://res.cloudinary.com/..."
  }
}
```

### 8. Verificar Saldo Actualizado
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer USER_ACCESS_TOKEN"
```

Debe mostrar `saldo_actual: 1900`

### 9. Descargar Comprobante
```bash
curl -X GET http://localhost:3000/api/recargas/UUID_DE_RECARGA/comprobante \
  -H "Authorization: Bearer USER_ACCESS_TOKEN"
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

### 10. Rechazar Recarga (como Admin)
```bash
curl -X POST http://localhost:3000/api/admin/recargas/UUID_DE_RECARGA/rechazar \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "motivo_rechazo": "El boucher no es legible"
  }'
```

### 11. Historial del Usuario
```bash
curl -X GET http://localhost:3000/api/recargas/historial?page=1&limit=10 \
  -H "Authorization: Bearer USER_ACCESS_TOKEN"
```

### 12. Estadísticas de Recargas (Admin)
```bash
curl -X GET http://localhost:3000/api/admin/recargas/stats \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

## RESULTADO ESPERADO

Al finalizar esta fase tendrás:
✅ Sistema completo de recargas con upload a Cloudinary
✅ Cálculo automático de comisión desde configuración
✅ Videos instructivos por banco
✅ Aprobación/rechazo por admin
✅ Generación automática de comprobantes PDF
✅ Sistema de referidos funcionando (bonos en primera recarga)
✅ Alertas de seguridad automáticas
✅ Logs de auditoría completos
✅ Historial de recargas con paginación
✅ Seed inicial con admin, config, videos y FAQs
✅ Middleware de upload con validaciones
✅ Admin middleware para rutas protegidas

## NOTAS IMPORTANTES

- Cloudinary sube bouchers a carpeta "efectivoya/bouchers"
- PDFs se suben a "efectivoya/comprobantes"
- Admin creado por seed: admin@efectivoya.com / Admin123!@#
- Comisión default: 5%
- Límites: min S/. 1,000 | max S/. 100,000
- Bouchers: máx 5MB, formatos: JPG, PNG, PDF
- Números de operación formato: REC-YYYYMMDD-RANDOM
- Bonos de referido: S/. 10 por persona en primera recarga
- Máximo 10 referidos por usuario