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
   * Verificar retiro inmediato después de recarga
   * Si retira más del 80% del saldo dentro de 24h de haber recargado, crea alerta
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
        return;
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
