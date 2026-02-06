import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export interface BonoResult {
  bonoOtorgadoReferido: boolean;
  bonoOtorgadoReferente: boolean;
  montoBonoReferido: number;
  montoBonoReferente: number;
}

export class ReferidosService {
  /**
   * Procesa los bonos de referido cuando un usuario hace su primera recarga
   * @param userId - ID del usuario que hizo la recarga
   * @param _recargaId - ID de la recarga aprobada (reservado para uso futuro)
   * @returns Información sobre los bonos otorgados
   */
  static async procesarBonoReferido(userId: string, _recargaId: string): Promise<BonoResult> {
    const result: BonoResult = {
      bonoOtorgadoReferido: false,
      bonoOtorgadoReferente: false,
      montoBonoReferido: 0,
      montoBonoReferente: 0
    };

    try {
      // Obtener usuario con su referente
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          referido_por: true,
          bono_referido_usado: true
        }
      });

      if (!user) {
        Logger.warn(`Usuario no encontrado para bonos: ${userId}`);
        return result;
      }

      // Si ya usó el bono o no tiene referente, no hay nada que hacer
      if (user.bono_referido_usado || !user.referido_por) {
        Logger.info(`Usuario ${userId} ya usó bono o no tiene referente`);
        return result;
      }

      // Verificar si es la primera recarga aprobada del usuario
      const recargasAprobadas = await prisma.recarga.count({
        where: {
          user_id: userId,
          estado: 'aprobado'
        }
      });

      // Si tiene más de 1 recarga aprobada (la actual), no es primera recarga
      if (recargasAprobadas > 1) {
        Logger.info(`Usuario ${userId} ya tenía recargas aprobadas previas`);
        return result;
      }

      // Obtener configuración de bonos
      const config = await prisma.configuracion.findFirst();
      if (!config) {
        Logger.error('No se encontró configuración para bonos de referido');
        return result;
      }

      const montoBono = Number(config.bono_referido);

      // Verificar que el referente no haya excedido su límite de referidos con bono
      const referidosConBono = await prisma.referido.count({
        where: {
          referrer_id: user.referido_por,
          bono_otorgado: true
        }
      });

      if (referidosConBono >= config.max_referidos_por_usuario) {
        Logger.info(`Referente ${user.referido_por} ya alcanzó el máximo de referidos con bono`);
        return result;
      }

      // Ejecutar transacción para otorgar bonos
      await prisma.$transaction(async (tx) => {
        // 1. Otorgar bono al usuario referido
        await tx.user.update({
          where: { id: userId },
          data: {
            saldo_actual: { increment: new Decimal(montoBono) },
            bono_referido_usado: true
          }
        });
        result.bonoOtorgadoReferido = true;
        result.montoBonoReferido = montoBono;

        // 2. Otorgar bono al referente
        await tx.user.update({
          where: { id: user.referido_por! },
          data: {
            saldo_actual: { increment: new Decimal(montoBono) }
          }
        });
        result.bonoOtorgadoReferente = true;
        result.montoBonoReferente = montoBono;

        // 3. Actualizar registro de referido
        await tx.referido.updateMany({
          where: {
            referrer_id: user.referido_por!,
            referred_id: userId
          },
          data: {
            bono_otorgado: true,
            fecha_primera_recarga: new Date()
          }
        });

        Logger.info(`Bonos otorgados - Referido: ${userId} (${montoBono}), Referente: ${user.referido_por} (${montoBono})`);
      });

      return result;
    } catch (error) {
      Logger.error('Error al procesar bonos de referido:', error);
      return result;
    }
  }
}
