import * as admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    });
    Logger.info('Firebase Admin inicializado correctamente');
  } catch (error) {
    Logger.warn('Firebase Admin no configurado. Push notifications deshabilitadas.');
  }
}

export class FCMService {
  private static isConfigured(): boolean {
    return admin.apps.length > 0;
  }

  static async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    if (!this.isConfigured()) return;

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
    }
  }

  static async sendToMultipleTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<void> {
    if (!this.isConfigured()) return;

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

  static async notificarAdminsPendiente(
    tipo: 'recarga' | 'retiro',
    numeroOperacion: string
  ): Promise<void> {
    try {
      const admins = await prisma.admin.findMany({
        where: { is_active: true },
        select: { push_token: true }
      });

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
