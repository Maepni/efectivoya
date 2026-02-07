import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';

const prisma = new PrismaClient();

export class AdminConfigController {
  /**
   * Obtener configuracion global
   * GET /api/admin/config
   */
  static async getConfig(_req: AdminRequest, res: Response): Promise<Response> {
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
        data: { config }
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
   * Actualizar configuracion global
   * PATCH /api/admin/config
   */
  static async updateConfig(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const {
        porcentaje_comision,
        monto_minimo_recarga,
        monto_maximo_recarga,
        cuenta_recaudadora_numero,
        cuenta_recaudadora_banco,
        cuenta_recaudadora_titular,
        mantenimiento_activo,
        version_minima_android,
        version_minima_ios,
        forzar_actualizacion,
        bono_referido,
        max_referidos_por_usuario
      } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const dataToUpdate: any = {};

      if (porcentaje_comision !== undefined) {
        const porcentaje = parseFloat(porcentaje_comision);
        if (porcentaje < 0 || porcentaje > 100) {
          return res.status(400).json({
            success: false,
            message: 'El porcentaje de comisión debe estar entre 0 y 100'
          });
        }
        dataToUpdate.porcentaje_comision = porcentaje;
      }

      if (monto_minimo_recarga !== undefined) {
        dataToUpdate.monto_minimo_recarga = parseFloat(monto_minimo_recarga);
      }

      if (monto_maximo_recarga !== undefined) {
        dataToUpdate.monto_maximo_recarga = parseFloat(monto_maximo_recarga);
      }

      if (cuenta_recaudadora_numero !== undefined) {
        dataToUpdate.cuenta_recaudadora_numero = cuenta_recaudadora_numero;
      }

      if (cuenta_recaudadora_banco !== undefined) {
        dataToUpdate.cuenta_recaudadora_banco = cuenta_recaudadora_banco;
      }

      if (cuenta_recaudadora_titular !== undefined) {
        dataToUpdate.cuenta_recaudadora_titular = cuenta_recaudadora_titular;
      }

      if (mantenimiento_activo !== undefined) {
        dataToUpdate.mantenimiento_activo = Boolean(mantenimiento_activo);
      }

      if (version_minima_android !== undefined) {
        dataToUpdate.version_minima_android = version_minima_android;
      }

      if (version_minima_ios !== undefined) {
        dataToUpdate.version_minima_ios = version_minima_ios;
      }

      if (forzar_actualizacion !== undefined) {
        dataToUpdate.forzar_actualizacion = Boolean(forzar_actualizacion);
      }

      if (bono_referido !== undefined) {
        dataToUpdate.bono_referido = parseFloat(bono_referido);
      }

      if (max_referidos_por_usuario !== undefined) {
        dataToUpdate.max_referidos_por_usuario = parseInt(max_referidos_por_usuario);
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }

      const configActualizada = await prisma.configuracion.update({
        where: { id: 1 },
        data: dataToUpdate
      });

      await AuditLogService.log('configuracion_actualizada', req, undefined, adminId, {
        campos_actualizados: Object.keys(dataToUpdate)
      });

      Logger.info(`Configuración actualizada por admin ${adminId}`);

      return res.json({
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: { config: configActualizada }
      });
    } catch (error) {
      Logger.error('Error en updateConfig:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar configuración'
      });
    }
  }

  /**
   * Activar/desactivar modo mantenimiento
   * PATCH /api/admin/config/maintenance
   */
  static async toggleMaintenance(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { activo } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const config = await prisma.configuracion.update({
        where: { id: 1 },
        data: {
          mantenimiento_activo: Boolean(activo)
        }
      });

      await AuditLogService.log(
        activo ? 'mantenimiento_activado' : 'mantenimiento_desactivado',
        req,
        undefined,
        adminId
      );

      Logger.info(`Modo mantenimiento ${activo ? 'activado' : 'desactivado'} por admin ${adminId}`);

      return res.json({
        success: true,
        message: `Modo mantenimiento ${activo ? 'activado' : 'desactivado'}`,
        data: {
          mantenimiento_activo: config.mantenimiento_activo
        }
      });
    } catch (error) {
      Logger.error('Error en toggleMaintenance:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al cambiar modo mantenimiento'
      });
    }
  }
}
