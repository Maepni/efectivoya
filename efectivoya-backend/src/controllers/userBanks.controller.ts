import { Response } from 'express';
import { PrismaClient, BancoEnum, TipoCuenta } from '@prisma/client';
import { AuthRequest } from '../types';
import { Validators } from '../utils/validators.util';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { MaskDataUtil } from '../utils/maskData.util';

const prisma = new PrismaClient();

export class UserBanksController {
  /**
   * 1. LISTAR BANCOS DEL USUARIO
   * GET /api/user-banks
   */
  static async listBanks(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const bancos = await prisma.userBank.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      // Enmascarar datos sensibles
      const bancosEnmascarados = bancos.map(banco => ({
        id: banco.id,
        banco: banco.banco,
        tipo_cuenta: banco.tipo_cuenta,
        numero_cuenta: MaskDataUtil.maskCuenta(banco.numero_cuenta),
        numero_cuenta_completo: banco.numero_cuenta,
        cci: MaskDataUtil.maskCCI(banco.cci),
        cci_completo: banco.cci,
        alias: banco.alias,
        created_at: banco.created_at,
        updated_at: banco.updated_at
      }));

      Logger.info(`Bancos listados para usuario ${userId}: ${bancos.length} bancos`);

      return res.json({
        success: true,
        data: {
          bancos: bancosEnmascarados,
          total: bancos.length
        }
      });
    } catch (error) {
      Logger.error('Error en listBanks:', error);
      return res.status(500).json({ success: false, message: 'Error al listar bancos' });
    }
  }

  /**
   * 2. OBTENER BANCO POR ID
   * GET /api/user-banks/:id
   */
  static async getBankById(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const banco = await prisma.userBank.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!banco) {
        return res.status(404).json({ success: false, message: 'Banco no encontrado' });
      }

      // Enmascarar datos sensibles
      const bancoEnmascarado = {
        id: banco.id,
        banco: banco.banco,
        tipo_cuenta: banco.tipo_cuenta,
        numero_cuenta: MaskDataUtil.maskCuenta(banco.numero_cuenta),
        numero_cuenta_completo: banco.numero_cuenta,
        cci: MaskDataUtil.maskCCI(banco.cci),
        cci_completo: banco.cci,
        alias: banco.alias,
        created_at: banco.created_at,
        updated_at: banco.updated_at
      };

      return res.json({
        success: true,
        data: { banco: bancoEnmascarado }
      });
    } catch (error) {
      Logger.error('Error en getBankById:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener banco' });
    }
  }

  /**
   * 3. REGISTRAR BANCO
   * POST /api/user-banks
   */
  static async registerBank(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { banco, tipo_cuenta, numero_cuenta, cci, alias } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Validar banco
      const bancosValidos = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'];
      if (!bancosValidos.includes(banco)) {
        return res.status(400).json({
          success: false,
          message: 'Banco inválido. Opciones: BCP, Interbank, Scotiabank, BBVA'
        });
      }

      // Validar tipo_cuenta: requerido para BCP, no permitido para otros
      if (banco === 'BCP' && !tipo_cuenta) {
        return res.status(400).json({
          success: false,
          message: 'Para BCP debes seleccionar el tipo de cuenta (ahorros o corriente)'
        });
      }
      if (banco !== 'BCP' && tipo_cuenta) {
        return res.status(400).json({
          success: false,
          message: 'El tipo de cuenta solo aplica para BCP'
        });
      }

      // Validar número de cuenta per-bank
      if (!Validators.isValidNumeroCuenta(numero_cuenta, banco, tipo_cuenta)) {
        return res.status(400).json({
          success: false,
          message: Validators.getNumeroCuentaErrorMessage(banco, tipo_cuenta)
        });
      }

      // Validar CCI
      if (!Validators.isValidCCI(cci)) {
        return res.status(400).json({
          success: false,
          message: 'CCI inválido. Debe tener exactamente 20 dígitos'
        });
      }

      // Validar alias (opcional)
      if (alias && alias.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El alias no puede tener más de 50 caracteres'
        });
      }

      // Verificar que no exista el mismo banco con la misma cuenta
      const bancoExistente = await prisma.userBank.findFirst({
        where: {
          user_id: userId,
          banco: banco as BancoEnum,
          numero_cuenta
        }
      });

      if (bancoExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya tienes registrado este banco con este número de cuenta'
        });
      }

      // Crear banco
      const nuevoBanco = await prisma.userBank.create({
        data: {
          user_id: userId,
          banco: banco as BancoEnum,
          tipo_cuenta: banco === 'BCP' ? (tipo_cuenta as TipoCuenta) : null,
          numero_cuenta: numero_cuenta.trim(),
          cci: cci.trim(),
          alias: alias ? Validators.sanitizeString(alias) : null
        }
      });

      // Audit log
      await AuditLogService.log('banco_registrado', req, userId, undefined, {
        banco_id: nuevoBanco.id,
        banco: banco,
        alias: alias || null
      });

      Logger.info(`Banco registrado para usuario ${userId}: ${banco}`);

      // Enmascarar datos en respuesta
      return res.status(201).json({
        success: true,
        message: 'Banco registrado exitosamente',
        data: {
          banco: {
            id: nuevoBanco.id,
            banco: nuevoBanco.banco,
            tipo_cuenta: nuevoBanco.tipo_cuenta,
            numero_cuenta: MaskDataUtil.maskCuenta(nuevoBanco.numero_cuenta),
            cci: MaskDataUtil.maskCCI(nuevoBanco.cci),
            alias: nuevoBanco.alias,
            created_at: nuevoBanco.created_at
          }
        }
      });
    } catch (error) {
      Logger.error('Error en registerBank:', error);
      return res.status(500).json({ success: false, message: 'Error al registrar banco' });
    }
  }

  /**
   * 4. EDITAR BANCO
   * PUT /api/user-banks/:id
   */
  static async updateBank(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { id } = req.params;
      const { tipo_cuenta, numero_cuenta, cci, alias } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Verificar que el banco pertenece al usuario
      const bancoExistente = await prisma.userBank.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!bancoExistente) {
        return res.status(404).json({
          success: false,
          message: 'Banco no encontrado o no te pertenece'
        });
      }

      // Preparar datos a actualizar
      const dataToUpdate: Record<string, string | null> = {};

      // Validar tipo_cuenta si se proporciona
      if (tipo_cuenta !== undefined) {
        if (bancoExistente.banco !== 'BCP') {
          return res.status(400).json({
            success: false,
            message: 'El tipo de cuenta solo aplica para BCP'
          });
        }
        dataToUpdate.tipo_cuenta = tipo_cuenta;
      }

      // Determinar tipo_cuenta efectivo para validar numero_cuenta
      const effectiveTipoCuenta = tipo_cuenta !== undefined
        ? tipo_cuenta
        : bancoExistente.tipo_cuenta;

      // Validar y actualizar número de cuenta si se proporciona
      if (numero_cuenta !== undefined) {
        if (!Validators.isValidNumeroCuenta(numero_cuenta, bancoExistente.banco, effectiveTipoCuenta)) {
          return res.status(400).json({
            success: false,
            message: Validators.getNumeroCuentaErrorMessage(bancoExistente.banco, effectiveTipoCuenta)
          });
        }
        dataToUpdate.numero_cuenta = numero_cuenta.trim();
      }

      // Validar y actualizar CCI si se proporciona
      if (cci !== undefined) {
        if (!Validators.isValidCCI(cci)) {
          return res.status(400).json({
            success: false,
            message: 'CCI inválido. Debe tener exactamente 20 dígitos'
          });
        }
        dataToUpdate.cci = cci.trim();
      }

      // Actualizar alias si se proporciona
      if (alias !== undefined) {
        if (alias && alias.length > 50) {
          return res.status(400).json({
            success: false,
            message: 'El alias no puede tener más de 50 caracteres'
          });
        }
        dataToUpdate.alias = alias ? Validators.sanitizeString(alias) : null;
      }

      // Si no hay nada que actualizar
      if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }

      // Actualizar banco
      const bancoActualizado = await prisma.userBank.update({
        where: { id },
        data: dataToUpdate
      });

      // Audit log
      await AuditLogService.log('banco_editado', req, userId, undefined, {
        banco_id: id,
        campos_actualizados: Object.keys(dataToUpdate)
      });

      Logger.info(`Banco actualizado: ${id} - Usuario: ${userId}`);

      // Enmascarar datos en respuesta
      return res.json({
        success: true,
        message: 'Banco actualizado exitosamente',
        data: {
          banco: {
            id: bancoActualizado.id,
            banco: bancoActualizado.banco,
            tipo_cuenta: bancoActualizado.tipo_cuenta,
            numero_cuenta: MaskDataUtil.maskCuenta(bancoActualizado.numero_cuenta),
            cci: MaskDataUtil.maskCCI(bancoActualizado.cci),
            alias: bancoActualizado.alias,
            updated_at: bancoActualizado.updated_at
          }
        }
      });
    } catch (error) {
      Logger.error('Error en updateBank:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar banco' });
    }
  }

  /**
   * 5. ELIMINAR BANCO
   * DELETE /api/user-banks/:id
   */
  static async deleteBank(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Verificar que el banco pertenece al usuario
      const banco = await prisma.userBank.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!banco) {
        return res.status(404).json({
          success: false,
          message: 'Banco no encontrado o no te pertenece'
        });
      }

      // Verificar que no hay retiros pendientes con este banco
      const retirosPendientes = await prisma.retiro.findFirst({
        where: {
          user_bank_id: id,
          estado: 'pendiente'
        }
      });

      if (retirosPendientes) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar este banco porque tiene un retiro pendiente de aprobación. Espera a que sea procesado.'
        });
      }

      // Eliminar banco
      await prisma.userBank.delete({
        where: { id }
      });

      // Audit log
      await AuditLogService.log('banco_eliminado', req, userId, undefined, {
        banco_id: id,
        banco: banco.banco,
        alias: banco.alias
      });

      Logger.info(`Banco eliminado: ${id} - Usuario: ${userId}`);

      return res.json({
        success: true,
        message: 'Banco eliminado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en deleteBank:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar banco' });
    }
  }

  /**
   * 6. OBTENER ESTADÍSTICAS DE BANCOS
   * GET /api/user-banks/stats
   */
  static async getBankStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      // Contar bancos por tipo
      const bancos = await prisma.userBank.findMany({
        where: { user_id: userId },
        select: { banco: true }
      });

      const stats = {
        total: bancos.length,
        por_banco: {
          BCP: bancos.filter(b => b.banco === 'BCP').length,
          Interbank: bancos.filter(b => b.banco === 'Interbank').length,
          Scotiabank: bancos.filter(b => b.banco === 'Scotiabank').length,
          BBVA: bancos.filter(b => b.banco === 'BBVA').length
        }
      };

      return res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      Logger.error('Error en getBankStats:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  }
}
