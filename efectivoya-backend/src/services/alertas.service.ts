import { PrismaClient, TipoAlerta } from '@prisma/client';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export interface AlertaCreada {
  created: boolean;
  alertaId?: string;
  tipo?: TipoAlerta;
}

export class AlertasService {
  /**
   * Verifica si un usuario tiene múltiples recargas en poco tiempo
   * Crea una alerta si tiene más de 3 recargas pendientes o aprobadas en la última hora
   * @param userId - ID del usuario a verificar
   * @returns Información de la alerta creada (si aplica)
   */
  static async verificarMultiplesRecargas(userId: string): Promise<AlertaCreada> {
    try {
      const unaHoraAtras = new Date();
      unaHoraAtras.setHours(unaHoraAtras.getHours() - 1);

      // Contar recargas en la última hora
      const recargasUltimaHora = await prisma.recarga.count({
        where: {
          user_id: userId,
          created_at: { gte: unaHoraAtras },
          estado: { in: ['pendiente', 'aprobado'] }
        }
      });

      // Si hay más de 3 recargas en la última hora, crear alerta
      if (recargasUltimaHora > 3) {
        // Verificar si ya existe una alerta sin revisar de este tipo
        const alertaExistente = await prisma.alertaSeguridad.findFirst({
          where: {
            user_id: userId,
            tipo: 'multiples_recargas',
            revisada: false,
            created_at: { gte: unaHoraAtras }
          }
        });

        if (alertaExistente) {
          Logger.info(`Alerta de múltiples recargas ya existe para usuario ${userId}`);
          return { created: false };
        }

        // Obtener datos del usuario para la alerta
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, dni: true, nombres: true, apellidos: true }
        });

        const alerta = await prisma.alertaSeguridad.create({
          data: {
            user_id: userId,
            tipo: 'multiples_recargas',
            descripcion: `Usuario ${user?.email} ha realizado ${recargasUltimaHora} recargas en la última hora`,
            detalles: {
              cantidad_recargas: recargasUltimaHora,
              periodo: '1 hora',
              usuario: {
                email: user?.email,
                dni: user?.dni,
                nombre: `${user?.nombres} ${user?.apellidos}`
              }
            }
          }
        });

        Logger.warn(`Alerta de seguridad creada: múltiples recargas para usuario ${userId}`);

        return {
          created: true,
          alertaId: alerta.id,
          tipo: 'multiples_recargas'
        };
      }

      return { created: false };
    } catch (error) {
      Logger.error('Error al verificar múltiples recargas:', error);
      return { created: false };
    }
  }

  /**
   * Verifica si un boucher ya fue usado anteriormente
   * @param userId - ID del usuario
   * @param boucherUrl - URL del boucher a verificar
   * @returns Información de la alerta creada (si aplica)
   */
  static async verificarBoucherDuplicado(userId: string, boucherUrl: string): Promise<AlertaCreada> {
    try {
      // Nota: En producción, se podría usar hash del archivo o comparación de imágenes
      // Por ahora, verificamos solo URLs exactas (poco probable pero es una capa básica)
      const boucherExistente = await prisma.recarga.findFirst({
        where: {
          boucher_url: boucherUrl,
          user_id: { not: userId }
        }
      });

      if (boucherExistente) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, dni: true }
        });

        const alerta = await prisma.alertaSeguridad.create({
          data: {
            user_id: userId,
            tipo: 'boucher_duplicado',
            descripcion: `Posible boucher duplicado detectado para usuario ${user?.email}`,
            detalles: {
              boucher_url: boucherUrl,
              recarga_original_id: boucherExistente.id,
              usuario_original_id: boucherExistente.user_id
            }
          }
        });

        Logger.warn(`Alerta de seguridad creada: boucher duplicado para usuario ${userId}`);

        return {
          created: true,
          alertaId: alerta.id,
          tipo: 'boucher_duplicado'
        };
      }

      return { created: false };
    } catch (error) {
      Logger.error('Error al verificar boucher duplicado:', error);
      return { created: false };
    }
  }

  /**
   * Verifica patrones sospechosos de retiro inmediato después de recarga
   * @param userId - ID del usuario
   * @param recargaId - ID de la recarga aprobada
   * @returns Información de la alerta creada (si aplica)
   */
  static async verificarRetiroInmediato(userId: string, recargaId: string): Promise<AlertaCreada> {
    try {
      const diezMinutosAtras = new Date();
      diezMinutosAtras.setMinutes(diezMinutosAtras.getMinutes() - 10);

      // Buscar retiros pendientes creados poco después de la recarga
      const retirosInmediatos = await prisma.retiro.count({
        where: {
          user_id: userId,
          created_at: { gte: diezMinutosAtras },
          estado: 'pendiente'
        }
      });

      if (retirosInmediatos > 0) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });

        const alerta = await prisma.alertaSeguridad.create({
          data: {
            user_id: userId,
            tipo: 'retiro_inmediato',
            descripcion: `Usuario ${user?.email} solicitó retiro inmediatamente después de recargar`,
            detalles: {
              recarga_id: recargaId,
              cantidad_retiros_pendientes: retirosInmediatos,
              periodo: '10 minutos'
            }
          }
        });

        Logger.warn(`Alerta de seguridad creada: retiro inmediato para usuario ${userId}`);

        return {
          created: true,
          alertaId: alerta.id,
          tipo: 'retiro_inmediato'
        };
      }

      return { created: false };
    } catch (error) {
      Logger.error('Error al verificar retiro inmediato:', error);
      return { created: false };
    }
  }
}
