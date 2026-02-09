import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';
import { SocketAuthData } from '../types';
import { FCMService } from './fcm.service';

const prisma = new PrismaClient();

class SocketService {
  private io: SocketServer | null = null;
  private userSockets: Map<string, string> = new Map(); // userId/adminId -> socketId
  private socketUsers: Map<string, SocketAuthData> = new Map(); // socketId -> userData

  initialize(server: HttpServer): void {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    Logger.info('Socket.io inicializado correctamente');
  }

  private setupMiddleware(): void {
    this.io?.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Token no proporcionado'));
        }

        const decoded = JWTUtil.verifyAccessToken(token);

        // Verificar si es usuario
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
            tipo: 'usuario'
          } as SocketAuthData;

          return next();
        }

        // Verificar si es admin
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
      } catch (_error) {
        Logger.error('Error en autenticación socket:', _error);
        return next(new Error('Autenticación fallida'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io?.on('connection', (socket: Socket) => {
      const authData: SocketAuthData = socket.data.auth;
      const entityId = authData.tipo === 'usuario' ? authData.userId : authData.adminId;

      if (entityId) {
        this.userSockets.set(entityId, socket.id);
        this.socketUsers.set(socket.id, authData);
      }

      Logger.info(`Cliente conectado: ${authData.email} (${authData.tipo})`);

      // Unirse a sala personal
      if (authData.tipo === 'usuario' && authData.userId) {
        socket.join(`user_${authData.userId}`);
      } else if (authData.tipo === 'admin') {
        socket.join('admins');
      }

      // Evento: Enviar mensaje
      socket.on('send_message', async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Evento: Marcar como leído
      socket.on('mark_as_read', async (chatId: string) => {
        await this.handleMarkAsRead(socket, chatId);
      });

      // Evento: Obtener historial
      socket.on('get_chat_history', async (chatId: string, callback) => {
        await this.handleGetChatHistory(socket, chatId, callback);
      });

      // Desconexión
      socket.on('disconnect', () => {
        if (entityId) {
          this.userSockets.delete(entityId);
        }
        this.socketUsers.delete(socket.id);
        Logger.info(`Cliente desconectado: ${authData.email}`);
      });
    });
  }

  private async handleSendMessage(socket: Socket, data: { chat_id?: string; mensaje?: string }): Promise<void> {
    try {
      const authData: SocketAuthData = socket.data.auth;
      const { chat_id, mensaje } = data;

      if (!mensaje || mensaje.trim().length === 0) {
        socket.emit('error', { message: 'Mensaje vacío' });
        return;
      }

      // Obtener o crear chat
      let chat = chat_id
        ? await prisma.chatSoporte.findUnique({
            where: { id: chat_id },
            include: { user: true }
          })
        : null;

      if (!chat && authData.tipo === 'usuario' && authData.userId) {
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
      if (authData.tipo === 'usuario' && chat.user_id !== authData.userId) {
        socket.emit('error', { message: 'No autorizado' });
        return;
      }

      const remitente_id = authData.tipo === 'usuario' ? authData.userId! : authData.adminId!;

      // Crear mensaje
      const nuevoMensaje = await prisma.chatMensaje.create({
        data: {
          chat_id: chat.id,
          remitente_tipo: authData.tipo,
          remitente_id,
          mensaje: mensaje.trim(),
          leido: false
        }
      });

      const messagePayload = {
        id: nuevoMensaje.id,
        chat_id: nuevoMensaje.chat_id,
        remitente_tipo: nuevoMensaje.remitente_tipo,
        remitente_id: nuevoMensaje.remitente_id,
        mensaje: nuevoMensaje.mensaje,
        leido: nuevoMensaje.leido,
        created_at: nuevoMensaje.created_at
      };

      // Enviar al remitente
      socket.emit('message_sent', messagePayload);

      // Enviar al destinatario
      if (authData.tipo === 'usuario') {
        this.io?.to('admins').emit('new_message', {
          ...messagePayload,
          user: {
            nombres: chat.user.nombres,
            apellidos: chat.user.apellidos,
            email: chat.user.email
          }
        });
      } else {
        this.io?.to(`user_${chat.user_id}`).emit('new_message', messagePayload);

        // Push al usuario si tiene token
        if (chat.user.push_token) {
          await FCMService.notificarNuevoMensaje(
            chat.user.push_token,
            'Soporte EfectivoYa',
            mensaje.trim()
          );
        }
      }

      Logger.info(`Mensaje enviado en chat ${chat.id} por ${authData.tipo}`);
    } catch (error) {
      Logger.error('Error al enviar mensaje:', error);
      socket.emit('error', { message: 'Error al enviar mensaje' });
    }
  }

  private async handleMarkAsRead(socket: Socket, chatId: string): Promise<void> {
    try {
      const authData: SocketAuthData = socket.data.auth;

      // Marcar como leídos los mensajes del otro tipo
      const remitenteType = authData.tipo === 'usuario' ? 'admin' : 'usuario';

      await prisma.chatMensaje.updateMany({
        where: {
          chat_id: chatId,
          remitente_tipo: remitenteType,
          leido: false
        },
        data: { leido: true }
      });

      socket.emit('messages_marked_read', { chat_id: chatId });
    } catch (error) {
      Logger.error('Error al marcar mensajes como leídos:', error);
    }
  }

  private async handleGetChatHistory(
    socket: Socket,
    chatId: string,
    callback: (data: unknown) => void
  ): Promise<void> {
    try {
      const authData: SocketAuthData = socket.data.auth;

      const chat = await prisma.chatSoporte.findUnique({
        where: { id: chatId },
        include: {
          mensajes: {
            orderBy: { created_at: 'asc' },
            take: 50
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

      if (authData.tipo === 'usuario' && chat.user_id !== authData.userId) {
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

  emitToUser(userId: string, event: string, data: unknown): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io?.to(socketId).emit(event, data);
    }
  }

  emitToAdmins(event: string, data: unknown): void {
    this.io?.to('admins').emit(event, data);
  }

  getIO(): SocketServer | null {
    return this.io;
  }
}

export const socketService = new SocketService();
