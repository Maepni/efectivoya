import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class ChatController {
  /**
   * GET /api/chat
   * Obtener o crear chat del usuario
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

      // Contar mensajes no leídos (de admin)
      const mensajesNoLeidos = await prisma.chatMensaje.count({
        where: {
          chat_id: chat.id,
          remitente_tipo: 'admin',
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
   * GET /api/admin/chats
   * Listar todos los chats (admin)
   */
  static async listChats(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const { estado, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: Record<string, unknown> = {};
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

      // Contar mensajes no leídos del usuario para cada chat
      const chatsConNoLeidos = await Promise.all(
        chats.map(async (chat) => {
          const mensajesNoLeidos = await prisma.chatMensaje.count({
            where: {
              chat_id: chat.id,
              remitente_tipo: 'usuario',
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
   * GET /api/admin/chats/:id
   * Obtener detalle de chat (admin)
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
   * PATCH /api/admin/chats/:id/cerrar
   * Cerrar chat (admin)
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
        data: {
          estado: 'cerrado',
          closed_at: new Date()
        }
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
   * PATCH /api/admin/chats/:id/reabrir
   * Reabrir chat (admin)
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
        data: {
          estado: 'abierto',
          closed_at: null
        }
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
