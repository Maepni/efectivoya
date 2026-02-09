# FASE 7: Chat en Tiempo Real + Notificaciones Push - EfectivoYa

## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

IMPORTANTE: Las FASES 1-6 ya están completadas. Tienes:
- Backend completo con autenticación ✅
- Sistema de recargas y retiros ✅
- Panel administrativo completo ✅

## OBJETIVO DE ESTA FASE
Implementar sistema completo de comunicación y notificaciones:
- Chat en tiempo real entre usuarios y administradores (Socket.io)
- Sistema de salas de chat (cada usuario tiene su sala privada con admins)
- Notificaciones push (Firebase Cloud Messaging)
- Notificaciones para eventos críticos (recargas, retiros, alertas)
- Templates de email mejorados con todos los eventos
- Historial de mensajes persistente en base de datos
- Estado de conexión en tiempo real
- Indicadores de mensajes no leídos

## ESTRUCTURA A CREAR
efectivoya-backend/src/
├── controllers/
│   ├── chat.controller.ts
│   └── notifications.controller.ts
├── routes/
│   ├── chat.routes.ts
│   └── notifications.routes.ts
├── services/
│   ├── socket.service.ts
│   ├── fcm.service.ts
│   └── (actualizar email.service.ts)
├── middleware/
│   └── socketAuth.middleware.ts
└── types/
└── (actualizar index.d.ts)

## INSTRUCCIONES DETALLADAS

### 1. INSTALAR DEPENDENCIAS
```bash
npm install socket.io firebase-admin
npm install --save-dev @types/socket.io
```

### 2. ACTUALIZAR .ENV.EXAMPLE

Agrega estas variables:
```env
# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-project.iam.gserviceaccount.com
```

### 3. ACTUALIZAR TIPOS (src/types/index.d.ts)

Agrega estas interfaces:
```typescript
import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export interface AdminRequest extends Request {
  adminId?: string;
  adminEmail?: string;
  adminRol?: 'super_admin' | 'admin';
}

// NUEVAS INTERFACES PARA SOCKET ← AGREGAR
export interface SocketAuthData {
  userId?: string;
  adminId?: string;
  email: string;
  tipo: 'user' | 'admin';
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string;
  mensaje: string;
  created_at: Date;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}
```

### 4. SERVICIO DE FCM (src/services/fcm.service.ts)
```typescript
import * as admin from 'firebase-admin';
import { Logger } from '../utils/logger.util';

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  });
}

export class FCMService {
  /**
   * Enviar notificación push a un token específico
   */
  static async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    try {
      const message = {
        token,
        notification: {
          title,
          body
        },
        data: data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'efectivoya_notifications'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      Logger.info(`Notificación enviada exitosamente: ${response}`);
    } catch (error) {
      Logger.error('Error al enviar notificación push:', error);
      // No lanzar error para no interrumpir flujo principal
    }
  }

  /**
   * Enviar notificación a múltiples tokens
   */
  static async sendToMultipleTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    try {
      if (tokens.length === 0) {
        Logger.debug('No hay tokens para enviar notificaciones');
        return;
      }

      const message = {
        notification: {
          title,
          body
        },
        data: data || {},
        tokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      Logger.info(
        `Notificaciones enviadas: ${response.successCount} exitosas, ${response.failureCount} fallidas`
      );

      // Log de tokens inválidos
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            Logger.warn(`Token inválido: ${tokens[idx]} - Error: ${resp.error}`);
          }
        });
      }
    } catch (error) {
      Logger.error('Error al enviar notificaciones múltiples:', error);
    }
  }

  /**
   * Notificar recarga aprobada
   */
  static async notificarRecargaAprobada(
    token: string,
    numeroOperacion: string,
    monto: number
  ): Promise<void> {
    await this.sendToToken(
      token,
      '¡Recarga Aprobada!',
      `Tu recarga de S/. ${monto.toFixed(2)} fue aprobada exitosamente.`,
      {
        type: 'recarga_aprobada',
        numero_operacion: numeroOperacion,
        monto: monto.toString()
      }
    );
  }

  /**
   * Notificar recarga rechazada
   */
  static async notificarRecargaRechazada(
    token: string,
    numeroOperacion: string,
    motivo: string
  ): Promise<void> {
    await this.sendToToken(
      token,
      'Recarga Rechazada',
      `Tu recarga fue rechazada. Motivo: ${motivo}`,
      {
        type: 'recarga_rechazada',
        numero_operacion: numeroOperacion
      }
    );
  }

  /**
   * Notificar retiro aprobado
   */
  static async notificarRetiroAprobado(
    token: string,
    numeroOperacion: string,
    monto: number
  ): Promise<void> {
    await this.sendToToken(
      token,
      '¡Retiro Aprobado!',
      `Tu retiro de S/. ${monto.toFixed(2)} fue aprobado. El dinero será transferido pronto.`,
      {
        type: 'retiro_aprobado',
        numero_operacion: numeroOperacion,
        monto: monto.toString()
      }
    );
  }

  /**
   * Notificar retiro rechazado
   */
  static async notificarRetiroRechazado(
    token: string,
    numeroOperacion: string,
    motivo: string
  ): Promise<void> {
    await this.sendToToken(
      token,
      'Retiro Rechazado',
      `Tu retiro fue rechazado. Motivo: ${motivo}`,
      {
        type: 'retiro_rechazado',
        numero_operacion: numeroOperacion
      }
    );
  }

  /**
   * Notificar nuevo mensaje de chat
   */
  static async notificarNuevoMensaje(
    token: string,
    nombreRemitente: string,
    mensaje: string
  ): Promise<void> {
    await this.sendToToken(
      token,
      `Mensaje de ${nombreRemitente}`,
      mensaje.length > 100 ? mensaje.substring(0, 100) + '...' : mensaje,
      {
        type: 'nuevo_mensaje_chat'
      }
    );
  }

  /**
   * Notificar a todos los admins sobre una nueva operación pendiente
   */
  static async notificarAdminsPendiente(
    tipo: 'recarga' | 'retiro',
    numeroOperacion: string
  ): Promise<void> {
    try {
      // Obtener tokens de todos los admins activos
      const admins = await import('../index').then(m => m.prisma.admin.findMany({
        where: { is_active: true },
        select: { push_token: true }
      }));

      const tokens = admins
        .map(a => a.push_token)
        .filter((token): token is string => token !== null);

      if (tokens.length === 0) {
        Logger.debug('No hay admins con push tokens');
        return;
      }

      await this.sendToMultipleTokens(
        tokens,
        `Nueva ${tipo === 'recarga' ? 'Recarga' : 'Retiro'} Pendiente`,
        `Operación ${numeroOperacion} requiere tu atención.`,
        {
          type: `${tipo}_pendiente`,
          numero_operacion: numeroOperacion
        }
      );
    } catch (error) {
      Logger.error('Error al notificar admins:', error);
    }
  }
}
```

### 5. SERVICIO DE SOCKET (src/services/socket.service.ts)
```typescript
import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';
import { SocketAuthData } from '../types';

const prisma = new PrismaClient();

class SocketService {
  private io: SocketServer | null = null;
  private userSockets: Map<string, string> = new Map(); // userId/adminId -> socketId
  private socketUsers: Map<string, SocketAuthData> = new Map(); // socketId -> userData

  /**
   * Inicializar Socket.io
   */
  initialize(server: HttpServer): void {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:8081',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    Logger.info('Socket.io inicializado correctamente');
  }

  /**
   * Middleware de autenticación
   */
  private setupMiddleware(): void {
    this.io?.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Token no proporcionado'));
        }

        // Verificar token
        const decoded = JWTUtil.verifyAccessToken(token);

        // Determinar si es usuario o admin
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, is_active: true }
        });

        if (user) {
          if (!user.is_active) {
            return next(new Error('Usuario inactivo'));
          }

          socket.data.auth = {
            userId: user.id,
            email: user.email,
            tipo: 'user'
          } as SocketAuthData;

          return next();
        }

        const admin = await prisma.admin.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, is_active: true }
        });

        if (admin) {
          if (!admin.is_active) {
            return next(new Error('Admin inactivo'));
          }

          socket.data.auth = {
            adminId: admin.id,
            email: admin.email,
            tipo: 'admin'
          } as SocketAuthData;

          return next();
        }

        return next(new Error('Usuario no encontrado'));
      } catch (error) {
        Logger.error('Error en autenticación socket:', error);
        return next(new Error('Autenticación fallida'));
      }
    });
  }

  /**
   * Configurar event handlers
   */
  private setupEventHandlers(): void {
    this.io?.on('connection', (socket: Socket) => {
      const authData: SocketAuthData = socket.data.auth;
      const userId = authData.tipo === 'user' ? authData.userId : authData.adminId;

      if (userId) {
        this.userSockets.set(userId, socket.id);
        this.socketUsers.set(socket.id, authData);
      }

      Logger.info(`Cliente conectado: ${authData.email} (${authData.tipo})`);

      // Unirse a sala personal
      if (authData.tipo === 'user' && authData.userId) {
        socket.join(`user_${authData.userId}`);
      } else if (authData.tipo === 'admin') {
        socket.join('admins'); // Todos los admins en una sala
      }

      // Evento: Usuario envía mensaje
      socket.on('send_message', async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Evento: Marcar mensajes como leídos
      socket.on('mark_as_read', async (chatId: string) => {
        await this.handleMarkAsRead(socket, chatId);
      });

      // Evento: Obtener historial de chat
      socket.on('get_chat_history', async (chatId: string, callback) => {
        await this.handleGetChatHistory(socket, chatId, callback);
      });

      // Desconexión
      socket.on('disconnect', () => {
        if (userId) {
          this.userSockets.delete(userId);
        }
        this.socketUsers.delete(socket.id);
        Logger.info(`Cliente desconectado: ${authData.email}`);
      });
    });
  }

  /**
   * Manejar envío de mensaje
   */
  private async handleSendMessage(socket: Socket, data: any): Promise<void> {
    try {
      const authData: SocketAuthData = socket.data.auth;
      const { chat_id, mensaje } = data;

      if (!mensaje || mensaje.trim().length === 0) {
        socket.emit('error', { message: 'Mensaje vacío' });
        return;
      }

      // Obtener o crear chat
      let chat = await prisma.chatSoporte.findUnique({
        where: { id: chat_id },
        include: { user: true }
      });

      if (!chat && authData.tipo === 'user' && authData.userId) {
        // Crear nuevo chat
        chat = await prisma.chatSoporte.create({
          data: {
            user_id: authData.userId,
            estado: 'abierto'
          },
          include: { user: true }
        });
      }

      if (!chat) {
        socket.emit('error', { message: 'Chat no encontrado' });
        return;
      }

      // Validar permisos
      if (authData.tipo === 'user' && chat.user_id !== authData.userId) {
        socket.emit('error', { message: 'No autorizado' });
        return;
      }

      // Crear mensaje
      const nuevoMensaje = await prisma.chatMensaje.create({
        data: {
          chat_id: chat.id,
          sender_type: authData.tipo,
          sender_id: authData.tipo === 'user' ? authData.userId! : authData.adminId!,
          mensaje: mensaje.trim(),
          leido: false
        }
      });

      // Actualizar última actividad del chat
      await prisma.chatSoporte.update({
        where: { id: chat.id },
        data: { updated_at: new Date() }
      });

      // Emitir mensaje
      const messagePayload = {
        id: nuevoMensaje.id,
        chat_id: nuevoMensaje.chat_id,
        sender_type: nuevoMensaje.sender_type,
        sender_id: nuevoMensaje.sender_id,
        mensaje: nuevoMensaje.mensaje,
        leido: nuevoMensaje.leido,
        created_at: nuevoMensaje.created_at
      };

      // Enviar al remitente
      socket.emit('message_sent', messagePayload);

      // Enviar al destinatario
      if (authData.tipo === 'user') {
        // Usuario envía, notificar a admins
        this.io?.to('admins').emit('new_message', {
          ...messagePayload,
          user: {
            nombres: chat.user.nombres,
            apellidos: chat.user.apellidos,
            email: chat.user.email
          }
        });

        // Enviar push a admins
        // TODO: Implementar cuando se integre FCM
      } else {
        // Admin envía, notificar a usuario
        this.io?.to(`user_${chat.user_id}`).emit('new_message', messagePayload);

        // Enviar push al usuario
        if (chat.user.push_token) {
          // TODO: Implementar FCMService.notificarNuevoMensaje
        }
      }

      Logger.info(`Mensaje enviado en chat ${chat.id} por ${authData.tipo}`);
    } catch (error) {
      Logger.error('Error al enviar mensaje:', error);
      socket.emit('error', { message: 'Error al enviar mensaje' });
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  private async handleMarkAsRead(socket: Socket, chatId: string): Promise<void> {
    try {
      const authData: SocketAuthData = socket.data.auth;

      // Actualizar mensajes no leídos del destinatario
      const senderType = authData.tipo === 'user' ? 'admin' : 'user';

      await prisma.chatMensaje.updateMany({
        where: {
          chat_id: chatId,
          sender_type: senderType,
          leido: false
        },
        data: { leido: true }
      });

      socket.emit('messages_marked_read', { chat_id: chatId });
    } catch (error) {
      Logger.error('Error al marcar mensajes como leídos:', error);
    }
  }

  /**
   * Obtener historial de chat
   */
  private async handleGetChatHistory(
    socket: Socket,
    chatId: string,
    callback: Function
  ): Promise<void> {
    try {
      const authData: SocketAuthData = socket.data.auth;

      const chat = await prisma.chatSoporte.findUnique({
        where: { id: chatId },
        include: {
          mensajes: {
            orderBy: { created_at: 'asc' },
            take: 50 // Últimos 50 mensajes
          },
          user: {
            select: {
              nombres: true,
              apellidos: true,
              email: true
            }
          }
        }
      });

      if (!chat) {
        callback({ error: 'Chat no encontrado' });
        return;
      }

      // Validar permisos
      if (authData.tipo === 'user' && chat.user_id !== authData.userId) {
        callback({ error: 'No autorizado' });
        return;
      }

      callback({
        chat: {
          id: chat.id,
          user: chat.user,
          estado: chat.estado,
          created_at: chat.created_at,
          updated_at: chat.updated_at
        },
        mensajes: chat.mensajes
      });
    } catch (error) {
      Logger.error('Error al obtener historial:', error);
      callback({ error: 'Error al obtener historial' });
    }
  }

  /**
   * Emitir evento a un usuario específico
   */
  emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io?.to(socketId).emit(event, data);
    }
  }

  /**
   * Emitir evento a todos los admins
   */
  emitToAdmins(event: string, data: any): void {
    this.io?.to('admins').emit(event, data);
  }

  /**
   * Obtener instancia de Socket.io
   */
  getIO(): SocketServer | null {
    return this.io;
  }
}

export const socketService = new SocketService();
```

### 6. ACTUALIZAR SERVICIO DE EMAIL (src/services/email.service.ts)

Agrega estos métodos al servicio existente:
```typescript
// ... código existente (getVerificationEmailHTML, getPasswordResetEmailHTML, etc.) ...

/**
 * Template de recarga aprobada
 */
static getRecargaAprobadaEmailHTML(
  nombres: string,
  numeroOperacion: string,
  monto: number,
  comision: number,
  montoNeto: number,
  nuevoSaldo: number
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px; }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #1f1f1f; margin: 0; }
        .logo span { color: #e83733; }
        .success-icon { text-align: center; font-size: 60px; color: #10B981; margin: 20px 0; }
        .content { text-align: center; }
        .amount { font-size: 36px; font-weight: bold; color: #10B981; margin: 20px 0; }
        .details { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
        .detail-label { color: #acacae; }
        .detail-value { font-weight: bold; color: #1f1f1f; }
        .footer { text-align: center; margin-top: 30px; color: #acacae; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>Efectivo<span>Ya</span></h1>
          <p style="color: #acacae; margin: 5px 0;">Tu Dinero Al Instante</p>
        </div>
        <div class="success-icon">✓</div>
        <div class="content">
          <h2 style="color: #1f1f1f;">¡Recarga Aprobada!</h2>
          <p style="color: #acacae;">Hola ${nombres}, tu recarga ha sido aprobada exitosamente.</p>
          <div class="amount">S/. ${montoNeto.toFixed(2)}</div>
          <p style="color: #acacae; font-size: 14px;">Monto acreditado a tu cuenta</p>
          
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">N° de Operación:</span>
              <span class="detail-value">${numeroOperacion}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Monto Depositado:</span>
              <span class="detail-value">S/. ${monto.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Comisión:</span>
              <span class="detail-value" style="color: #e83733;">-S/. ${comision.toFixed(2)}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="detail-label">Nuevo Saldo:</span>
              <span class="detail-value" style="color: #dc993c;">S/. ${nuevoSaldo.toFixed(2)}</span>
            </div>
          </div>
          
          <p style="color: #acacae; font-size: 14px;">Tu comprobante está adjunto a este correo.</p>
        </div>
        <div class="footer">
          <p>© 2026 EfectivoYa. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Template de recarga rechazada
 */
static getRecargaRechazadaEmailHTML(
  nombres: string,
  numeroOperacion: string,
  monto: number,
  motivo: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px; }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo h1 { color: #1f1f1f; margin: 0; }
        .logo span { color: #e83733; }
        .error-icon { text-align: center; font-size: 60px; color: #e83733; margin: 20px 0; }
        .content { text-align: center; }
        .motivo-box { background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #acacae; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <h1>Efectivo<span>Ya</span></h1>
          <p style="color: #acacae; margin: 5px 0;">Tu Dinero Al Instante</p>
        </div>
        <div class="error-icon">✗</div>
        <div class="content">
          <h2 style="color: #1f1f1f;">Recarga Rechazada</h2>
          <p style="color: #acacae;">Hola ${nombres}, lamentablemente tu recarga no pudo ser procesada.</p>
          
          <div style="margin: 20px 0;">
            <p style="color: #acacae; margin: 5px 0;">N° de Operación:</p>
            <p style="font-weight: bold; color: #1f1f1f; margin: 5px 0;">${numeroOperacion}</p>
            <p style="color: #acacae; margin: 5px 0;">Monto: S/. ${monto.toFixed(2)}</p>
          </div>
          
          <div class="motivo-box">
            <p style="color: #856404; margin: 0; font-weight: bold;">Motivo del rechazo:</p>
            <p style="color: #856404; margin: 10px 0 0 0;">${motivo}</p>
          </div>
          
          <p style="color: #acacae; font-size: 14px;">Por favor, verifica los datos y vuelve a intentarlo. Si tienes dudas, contáctanos por el chat de soporte.</p>
        </div>
        <div class="footer">
          <p>© 2026 EfectivoYa. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Enviar email de recarga aprobada
 */
static async sendRecargaAprobadaEmail(
  email: string,
  nombres: string,
  numeroOperacion: string,
  monto: number,
  comision: number,
  montoNeto: number,
  nuevoSaldo: number,
  comprobantePdfBuffer?: Buffer
): Promise<void> {
  try {
    const mailOptions: any = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: '¡Recarga Aprobada! - EfectivoYa',
      html: this.getRecargaAprobadaEmailHTML(nombres, numeroOperacion, monto, comision, montoNeto, nuevoSaldo)
    };

    // Adjuntar PDF si existe
    if (comprobantePdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `comprobante-${numeroOperacion}.pdf`,
          content: comprobantePdfBuffer
        }
      ];
    }

    await transporter.sendMail(mailOptions);
    Logger.info(`Email de recarga aprobada enviado a ${email}`);
  } catch (error) {
    Logger.error('Error al enviar email de recarga aprobada:', error);
    throw new Error('No se pudo enviar el email');
  }
}

/**
 * Enviar email de recarga rechazada
 */
static async sendRecargaRechazadaEmail(
  email: string,
  nombres: string,
  numeroOperacion: string,
  monto: number,
  motivo: string
): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: 'Recarga Rechazada - EfectivoYa',
      html: this.getRecargaRechazadaEmailHTML(nombres, numeroOperacion, monto, motivo)
    });

    Logger.info(`Email de recarga rechazada enviado a ${email}`);
  } catch (error) {
    Logger.error('Error al enviar email de recarga rechazada:', error);
    throw new Error('No se pudo enviar el email');
  }
}

// Agregar métodos similares para retiros (getRetiroAprobadoEmailHTML, etc.)
### 7. CONTROLADOR DE CHAT (src/controllers/chat.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class ChatController {
  /**
   * 1. OBTENER O CREAR CHAT DEL USUARIO
   * GET /api/chat
   */
  static async getOrCreateUserChat(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Buscar chat existente
      let chat = await prisma.chatSoporte.findFirst({
        where: { user_id: userId },
        include: {
          mensajes: {
            orderBy: { created_at: 'asc' },
            take: 50
          }
        }
      });

      // Si no existe, crear uno nuevo
      if (!chat) {
        chat = await prisma.chatSoporte.create({
          data: {
            user_id: userId,
            estado: 'abierto'
          },
          include: {
            mensajes: true
          }
        });
      }

      // Contar mensajes no leídos
      const mensajesNoLeidos = await prisma.chatMensaje.count({
        where: {
          chat_id: chat.id,
          sender_type: 'admin',
          leido: false
        }
      });

      return res.json({
        success: true,
        data: {
          chat: {
            id: chat.id,
            estado: chat.estado,
            created_at: chat.created_at,
            updated_at: chat.updated_at
          },
          mensajes: chat.mensajes,
          mensajes_no_leidos: mensajesNoLeidos
        }
      });
    } catch (error) {
      Logger.error('Error en getOrCreateUserChat:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener chat'
      });
    }
  }

  /**
   * 2. LISTAR CHATS (ADMIN)
   * GET /api/admin/chats
   */
  static async listChats(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { estado, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (estado) {
        where.estado = estado;
      }

      const [chats, total] = await Promise.all([
        prisma.chatSoporte.findMany({
          where,
          include: {
            user: {
              select: {
                nombres: true,
                apellidos: true,
                email: true
              }
            },
            mensajes: {
              orderBy: { created_at: 'desc' },
              take: 1
            },
            _count: {
              select: {
                mensajes: true
              }
            }
          },
          orderBy: { updated_at: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.chatSoporte.count({ where })
      ]);

      // Para cada chat, contar mensajes no leídos del usuario
      const chatsConNoLeidos = await Promise.all(
        chats.map(async (chat) => {
          const mensajesNoLeidos = await prisma.chatMensaje.count({
            where: {
              chat_id: chat.id,
              sender_type: 'user',
              leido: false
            }
          });

          return {
            ...chat,
            mensajes_no_leidos: mensajesNoLeidos
          };
        })
      );

      return res.json({
        success: true,
        data: {
          chats: chatsConNoLeidos,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    } catch (error) {
      Logger.error('Error en listChats:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar chats'
      });
    }
  }

  /**
   * 3. OBTENER DETALLE DE CHAT (ADMIN)
   * GET /api/admin/chats/:id
   */
  static async getChatDetail(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const chat = await prisma.chatSoporte.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              nombres: true,
              apellidos: true,
              email: true,
              whatsapp: true,
              saldo_actual: true
            }
          },
          mensajes: {
            orderBy: { created_at: 'asc' }
          }
        }
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat no encontrado'
        });
      }

      return res.json({
        success: true,
        data: { chat }
      });
    } catch (error) {
      Logger.error('Error en getChatDetail:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener detalle del chat'
      });
    }
  }

  /**
   * 4. CERRAR CHAT (ADMIN)
   * PATCH /api/admin/chats/:id/cerrar
   */
  static async cerrarChat(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const chat = await prisma.chatSoporte.update({
        where: { id },
        data: { estado: 'cerrado' }
      });

      Logger.info(`Chat ${id} cerrado por admin ${adminId}`);

      return res.json({
        success: true,
        message: 'Chat cerrado exitosamente',
        data: { chat }
      });
    } catch (error) {
      Logger.error('Error en cerrarChat:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar chat'
      });
    }
  }

  /**
   * 5. REABRIR CHAT (ADMIN)
   * PATCH /api/admin/chats/:id/reabrir
   */
  static async reabrirChat(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const chat = await prisma.chatSoporte.update({
        where: { id },
        data: { estado: 'abierto' }
      });

      Logger.info(`Chat ${id} reabierto por admin ${adminId}`);

      return res.json({
        success: true,
        message: 'Chat reabierto exitosamente',
        data: { chat }
      });
    } catch (error) {
      Logger.error('Error en reabrirChat:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al reabrir chat'
      });
    }
  }
}
```

### 8. CONTROLADOR DE NOTIFICACIONES (src/controllers/notifications.controller.ts)
```typescript
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class NotificationsController {
  /**
   * 1. REGISTRAR PUSH TOKEN
   * POST /api/notifications/register-token
   */
  static async registerToken(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { push_token } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (!push_token) {
        return res.status(400).json({
          success: false,
          message: 'Push token es requerido'
        });
      }

      // Actualizar token del usuario
      await prisma.user.update({
        where: { id: userId },
        data: { push_token }
      });

      Logger.info(`Push token registrado para usuario ${userId}`);

      return res.json({
        success: true,
        message: 'Token registrado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en registerToken:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al registrar token'
      });
    }
  }

  /**
   * 2. REGISTRAR PUSH TOKEN ADMIN
   * POST /api/admin/notifications/register-token
   */
  static async registerAdminToken(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const adminId = (req as any).adminId;
      const { push_token } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (!push_token) {
        return res.status(400).json({
          success: false,
          message: 'Push token es requerido'
        });
      }

      // Actualizar token del admin
      await prisma.admin.update({
        where: { id: adminId },
        data: { push_token }
      });

      Logger.info(`Push token registrado para admin ${adminId}`);

      return res.json({
        success: true,
        message: 'Token registrado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en registerAdminToken:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al registrar token'
      });
    }
  }

  /**
   * 3. ELIMINAR PUSH TOKEN
   * DELETE /api/notifications/token
   */
  static async deleteToken(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { push_token: null }
      });

      Logger.info(`Push token eliminado para usuario ${userId}`);

      return res.json({
        success: true,
        message: 'Token eliminado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en deleteToken:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar token'
      });
    }
  }
}
```

### 9. RUTAS DE CHAT (src/routes/chat.routes.ts)
```typescript
import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Usuario obtiene su chat
router.get('/', authMiddleware, ChatController.getOrCreateUserChat);

export default router;
```

### 10. RUTAS DE CHAT ADMIN (src/routes/adminChat.routes.ts)
```typescript
import { Router } from 'express';
import { param, query } from 'express-validator';
import { ChatController } from '../controllers/chat.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Listar chats
router.get(
  '/',
  [
    query('estado').optional().isIn(['abierto', 'cerrado']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  ChatController.listChats
);

// 2. Detalle de chat
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  ChatController.getChatDetail
);

// 3. Cerrar chat
router.patch(
  '/:id/cerrar',
  [param('id').isUUID()],
  validateRequest,
  ChatController.cerrarChat
);

// 4. Reabrir chat
router.patch(
  '/:id/reabrir',
  [param('id').isUUID()],
  validateRequest,
  ChatController.reabrirChat
);

export default router;
```

### 11. RUTAS DE NOTIFICACIONES (src/routes/notifications.routes.ts)
```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { NotificationsController } from '../controllers/notifications.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Usuario registra token
router.post(
  '/register-token',
  authMiddleware,
  [body('push_token').isString().notEmpty()],
  validateRequest,
  NotificationsController.registerToken
);

// Usuario elimina token
router.delete('/token', authMiddleware, NotificationsController.deleteToken);

// Admin registra token
router.post(
  '/admin/register-token',
  adminAuthMiddleware,
  [body('push_token').isString().notEmpty()],
  validateRequest,
  NotificationsController.registerAdminToken
);

export default router;
```

### 12. ACTUALIZAR INDEX.TS (Configurar Socket.io)

Modifica tu archivo principal (src/index.ts o src/server.ts):
```typescript
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { socketService } from './services/socket.service';
import { Logger } from './utils/logger.util';

// Imports de rutas existentes
import authRoutes from './routes/auth.routes';
import userBanksRoutes from './routes/userBanks.routes';
import recargasRoutes from './routes/recargas.routes';
import adminRecargasRoutes from './routes/adminRecargas.routes';
import retirosRoutes from './routes/retiros.routes';
import adminRetirosRoutes from './routes/adminRetiros.routes';
import userRoutes from './routes/user.routes';
import adminAuthRoutes from './routes/adminAuth.routes';
import adminDashboardRoutes from './routes/adminDashboard.routes';
import adminUsersRoutes from './routes/adminUsers.routes';
import adminConfigRoutes from './routes/adminConfig.routes';
import adminAlertasRoutes from './routes/adminAlertas.routes';
import adminLogsRoutes from './routes/adminLogs.routes';
import adminContenidoRoutes from './routes/adminContenido.routes';
import adminAdminsRoutes from './routes/adminAdmins.routes';

// NUEVAS RUTAS ← AGREGAR
import chatRoutes from './routes/chat.routes';
import adminChatRoutes from './routes/adminChat.routes';
import notificationsRoutes from './routes/notifications.routes';

const app = express();
const server = http.createServer(app);  // ← IMPORTANTE: Crear servidor HTTP
export const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rutas de Usuarios
app.use('/api/auth', authRoutes);
app.use('/api/user-banks', userBanksRoutes);
app.use('/api/recargas', recargasRoutes);
app.use('/api/retiros', retirosRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);  // ← AGREGAR
app.use('/api/notifications', notificationsRoutes);  // ← AGREGAR

// Rutas de Admin
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/config', adminConfigRoutes);
app.use('/api/admin/alertas', adminAlertasRoutes);
app.use('/api/admin/logs', adminLogsRoutes);
app.use('/api/admin/contenido', adminContenidoRoutes);
app.use('/api/admin/admins', adminAdminsRoutes);
app.use('/api/admin/recargas', adminRecargasRoutes);
app.use('/api/admin/retiros', adminRetirosRoutes);
app.use('/api/admin/chats', adminChatRoutes);  // ← AGREGAR

// Error handlers
app.use((err: any, req: any, res: any, next: any) => {
  Logger.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Inicializar Socket.io ← AGREGAR
socketService.initialize(server);

const PORT = process.env.PORT || 3000;

// Usar server.listen en lugar de app.listen ← IMPORTANTE
server.listen(PORT, () => {
  Logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  Logger.info(`📡 Socket.io inicializado`);
});

// Exportar prisma para uso en servicios
export { prisma };
```

### 13. INTEGRAR NOTIFICACIONES EN RECARGAS

Actualiza src/controllers/adminRecargas.controller.ts:
```typescript
// ... imports existentes ...
import { FCMService } from '../services/fcm.service';
import { EmailService } from '../services/email.service';

// En el método aprobar, después de generar el PDF:
export class AdminRecargasController {
  // ... código existente ...

  static async aprobar(req: AdminRequest, res: Response): Promise<Response> {
    // ... código existente hasta generar PDF ...

    // AGREGAR ESTAS LÍNEAS después de generar el PDF:

    // Enviar email con comprobante
    try {
      await EmailService.sendRecargaAprobadaEmail(
        recarga.user.email,
        recarga.user.nombres,
        recarga.numero_operacion,
        recarga.monto_depositado.toNumber(),
        recarga.comision_calculada.toNumber(),
        recarga.monto_neto.toNumber(),
        recargaAprobada.userActualizado.saldo_actual.toNumber(),
        pdfBuffer
      );
    } catch (error) {
      Logger.error('Error al enviar email:', error);
    }

    // Enviar notificación push
    if (recarga.user.push_token) {
      try {
        await FCMService.notificarRecargaAprobada(
          recarga.user.push_token,
          recarga.numero_operacion,
          recarga.monto_neto.toNumber()
        );
      } catch (error) {
        Logger.error('Error al enviar push notification:', error);
      }
    }

    // ... resto del código existente ...
  }

  static async rechazar(req: AdminRequest, res: Response): Promise<Response> {
    // ... código existente ...

    // AGREGAR después de actualizar el retiro:

    // Enviar email
    try {
      await EmailService.sendRecargaRechazadaEmail(
        recarga.user.email,
        recarga.user.nombres,
        recarga.numero_operacion,
        recarga.monto_depositado.toNumber(),
        motivo_rechazo
      );
    } catch (error) {
      Logger.error('Error al enviar email:', error);
    }

    // Enviar notificación push
    if (recarga.user.push_token) {
      try {
        await FCMService.notificarRecargaRechazada(
          recarga.user.push_token,
          recarga.numero_operacion,
          motivo_rechazo
        );
      } catch (error) {
        Logger.error('Error al enviar push notification:', error);
      }
    }

    // ... resto del código existente ...
  }
}
```

### 14. INTEGRAR NOTIFICACIONES EN RETIROS

Actualiza src/controllers/adminRetiros.controller.ts de manera similar:
```typescript
// ... imports existentes ...
import { FCMService } from '../services/fcm.service';

export class AdminRetirosController {
  // ... código existente ...

  static async aprobar(req: AdminRequest, res: Response): Promise<Response> {
    // ... código existente hasta generar PDF ...

    // AGREGAR después de generar el PDF:

    // Enviar notificación push
    if (retiro.user.push_token) {
      try {
        await FCMService.notificarRetiroAprobado(
          retiro.user.push_token,
          retiro.numero_operacion,
          montoRetiro
        );
      } catch (error) {
        Logger.error('Error al enviar push notification:', error);
      }
    }

    // ... resto del código existente ...
  }

  static async rechazar(req: AdminRequest, res: Response): Promise<Response> {
    // ... código existente ...

    // AGREGAR después de actualizar el retiro:

    // Enviar notificación push
    if (retiro.user.push_token) {
      try {
        await FCMService.notificarRetiroRechazado(
          retiro.user.push_token,
          retiro.numero_operacion,
          motivo_rechazo
        );
      } catch (error) {
        Logger.error('Error al enviar push notification:', error);
      }
    }

    // ... resto del código existente ...
  }
}
```

### 15. INTEGRAR NOTIFICACIONES EN SOLICITUDES

Actualiza src/controllers/recargas.controller.ts:
```typescript
// ... imports existentes ...
import { FCMService } from '../services/fcm.service';

export class RecargasController {
  // ... código existente ...

  static async solicitarRecarga(req: AuthRequest, res: Response): Promise<Response> {
    // ... código existente hasta crear la recarga ...

    // AGREGAR después de crear la recarga:

    // Notificar a admins
    await FCMService.notificarAdminsPendiente('recarga', numero_operacion);

    // ... resto del código existente ...
  }
}
```

Actualiza src/controllers/retiros.controller.ts:
```typescript
// ... imports existentes ...
import { FCMService } from '../services/fcm.service';

export class RetirosController {
  // ... código existente ...

  static async solicitarRetiro(req: AuthRequest, res: Response): Promise<Response> {
    // ... código existente hasta crear el retiro ...

    // AGREGAR después de crear el retiro:

    // Notificar a admins
    await FCMService.notificarAdminsPendiente('retiro', numero_operacion);

    // ... resto del código existente ...
  }
}
```

## CONFIGURACIÓN DE FIREBASE

### 1. Crear Proyecto Firebase

1. Ve a https://console.firebase.google.com
2. Crea un nuevo proyecto "EfectivoYa"
3. Activa Cloud Messaging

### 2. Obtener Credenciales

1. Ve a Project Settings > Service Accounts
2. Click en "Generate new private key"
3. Descarga el archivo JSON
4. Extrae estos valores para tu .env:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

### 3. Configurar en .env
```env
FIREBASE_PROJECT_ID=efectivoya-xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADA...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@efectivoya.iam.gserviceaccount.com
```

**IMPORTANTE:** La private key debe incluir los `\n` literales.

## PRUEBAS MANUALES

### PREPARACIÓN
```bash
# 1. Instalar dependencias
npm install socket.io firebase-admin
npm install --save-dev @types/socket.io

# 2. Configurar Firebase en .env

# 3. Reiniciar servidor
npm run dev

# Deberías ver en los logs:
# 🚀 Servidor corriendo en puerto 3000
# 📡 Socket.io inicializado
```

### 1. PROBAR SOCKET.IO CON CLIENTE DE PRUEBA

Crea un archivo de prueba `test-socket.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Socket.io - EfectivoYa</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <h1>Test Socket.io</h1>
  <div id="status">Desconectado</div>
  <div>
    <input type="text" id="token" placeholder="Access Token" style="width: 400px;">
    <button onclick="connect()">Conectar</button>
  </div>
  <div>
    <input type="text" id="chatId" placeholder="Chat ID">
    <input type="text" id="mensaje" placeholder="Mensaje">
    <button onclick="enviarMensaje()">Enviar</button>
  </div>
  <div id="mensajes" style="margin-top: 20px; border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: scroll;"></div>

  <script>
    let socket;

    function connect() {
      const token = document.getElementById('token').value;
      
      socket = io('http://localhost:3000', {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        document.getElementById('status').textContent = 'Conectado';
        console.log('Conectado!');
      });

      socket.on('disconnect', () => {
        document.getElementById('status').textContent = 'Desconectado';
        console.log('Desconectado');
      });

      socket.on('new_message', (data) => {
        console.log('Nuevo mensaje:', data);
        agregarMensaje('Nuevo: ' + JSON.stringify(data));
      });

      socket.on('message_sent', (data) => {
        console.log('Mensaje enviado:', data);
        agregarMensaje('Enviado: ' + data.mensaje);
      });

      socket.on('error', (data) => {
        console.error('Error:', data);
        agregarMensaje('ERROR: ' + data.message);
      });
    }

    function enviarMensaje() {
      const chatId = document.getElementById('chatId').value;
      const mensaje = document.getElementById('mensaje').value;

      socket.emit('send_message', {
        chat_id: chatId,
        mensaje
      });

      document.getElementById('mensaje').value = '';
    }

    function agregarMensaje(texto) {
      const div = document.getElementById('mensajes');
      div.innerHTML += '<div>' + new Date().toLocaleTimeString() + ' - ' + texto + '</div>';
      div.scrollTop = div.scrollHeight;
    }
  </script>
</body>
</html>
```

**Usar:**
1. Login como usuario para obtener token
2. Pegar token en el input
3. Click "Conectar"
4. Obtener chat ID con `GET /api/chat`
5. Enviar mensajes

### 2. PROBAR API DE CHAT

#### Obtener Chat del Usuario
```bash
curl -X GET http://localhost:3000/api/chat \
  -H "Authorization: Bearer USER_TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": "uuid...",
      "estado": "abierto",
      "created_at": "...",
      "updated_at": "..."
    },
    "mensajes": [],
    "mensajes_no_leidos": 0
  }
}
```

#### Listar Chats (Admin)
```bash
curl -X GET http://localhost:3000/api/admin/chats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### Ver Detalle de Chat (Admin)
```bash
curl -X GET http://localhost:3000/api/admin/chats/UUID_DEL_CHAT \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3. PROBAR NOTIFICACIONES PUSH

#### Registrar Push Token (Usuario)
```bash
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  }'
```

#### Registrar Push Token (Admin)
```bash
curl -X POST http://localhost:3000/api/notifications/admin/register-token \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "push_token": "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"
  }'
```

### 4. FLUJO COMPLETO CON NOTIFICACIONES

1. **Usuario solicita recarga:**
   - ✅ Notificación push a todos los admins
   - ✅ Recarga queda pendiente

2. **Admin aprueba recarga:**
   - ✅ Notificación push al usuario
   - ✅ Email al usuario con comprobante adjunto
   - ✅ Saldo actualizado

3. **Usuario envía mensaje en chat:**
   - ✅ Mensaje llega en tiempo real a admins conectados
   - ✅ Notificación push a admins desconectados

4. **Admin responde mensaje:**
   - ✅ Mensaje llega en tiempo real al usuario
   - ✅ Notificación push si usuario desconectado

## RESULTADO ESPERADO

Al finalizar esta fase tendrás:
✅ Chat en tiempo real con Socket.io funcionando
✅ Sistema de salas (cada usuario tiene su sala privada)
✅ Historial de mensajes persistente en BD
✅ Notificaciones push con Firebase Cloud Messaging
✅ Push notifications para recargas aprobadas/rechazadas
✅ Push notifications para retiros aprobados/rechazados
✅ Push notifications para nuevos mensajes de chat
✅ Push notifications a admins cuando hay operaciones pendientes
✅ Emails mejorados con HTML para todos los eventos
✅ Indicadores de mensajes no leídos
✅ Estado de conexión en tiempo real
✅ Admin puede cerrar/reabrir chats
✅ Logs de todas las acciones

## NOTAS IMPORTANTES

- Socket.io requiere http.Server en lugar de app.listen
- Los tokens push se guardan en columna `push_token` (ya existente en schema)
- Firebase necesita credenciales válidas del proyecto
- Los mensajes se persisten en BD incluso con Socket.io
- Admin puede ver todos los chats activos
- Usuario solo ve su propio chat
- Las notificaciones son "fire and forget" (no bloquean el flujo)
- Los emails son asíncronos y no interrumpen la respuesta
- Socket.io usa autenticación JWT en el handshake

## VERIFICACIONES FINALES
```sql
-- Ver chats creados
SELECT * FROM chat_soporte ORDER BY created_at DESC LIMIT 10;

-- Ver mensajes
SELECT * FROM chat_mensajes ORDER BY created_at DESC LIMIT 20;

-- Ver usuarios con push tokens
SELECT id, email, push_token FROM users WHERE push_token IS NOT NULL;

-- Ver admins con push tokens
SELECT id, email, push_token FROM admins WHERE push_token IS NOT NULL;
```

### Endpoints Funcionando

1. ✅ Conexión Socket.io con autenticación
2. ✅ Envío de mensajes en tiempo real
3. ✅ Recepción de mensajes en tiempo real
4. ✅ Obtener chat del usuario
5. ✅ Listar chats (admin)
6. ✅ Registrar push token
7. ✅ Notificaciones push en recargas
8. ✅ Notificaciones push en retiros
9. ✅ Emails con comprobantes adjuntos
10. ✅ Notificar a admins sobre operaciones pendientes