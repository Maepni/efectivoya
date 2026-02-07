import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { Validators } from '../utils/validators.util';

const prisma = new PrismaClient();

export class AdminAdminsController {
  /**
   * Listar administradores
   * GET /api/admin/admins
   */
  static async listAdmins(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          is_active: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      return res.json({
        success: true,
        data: {
          admins,
          total: admins.length
        }
      });
    } catch (error) {
      Logger.error('Error en listAdmins:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar administradores'
      });
    }
  }

  /**
   * Crear nuevo administrador (solo super_admin)
   * POST /api/admin/admins
   */
  static async createAdmin(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const currentAdminId = req.adminId;
      const currentAdminRol = req.adminRol;
      const { email, password, nombre, rol } = req.body;

      if (!currentAdminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (currentAdminRol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo super administradores pueden crear nuevos administradores'
        });
      }

      if (!Validators.isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }

      if (!Validators.isValidPassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo'
        });
      }

      if (!['super_admin', 'admin'].includes(rol)) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido. Debe ser super_admin o admin'
        });
      }

      const existingAdmin = await prisma.admin.findUnique({
        where: { email }
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const newAdmin = await prisma.admin.create({
        data: {
          email,
          password_hash,
          nombre: Validators.sanitizeString(nombre),
          rol: rol as any
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          is_active: true,
          created_at: true
        }
      });

      await AuditLogService.log('admin_creado', req, undefined, currentAdminId, {
        nuevo_admin_id: newAdmin.id,
        email: newAdmin.email,
        rol: newAdmin.rol
      });

      Logger.info(`Admin creado: ${newAdmin.email} por ${currentAdminId}`);

      return res.status(201).json({
        success: true,
        message: 'Administrador creado exitosamente',
        data: { admin: newAdmin }
      });
    } catch (error) {
      Logger.error('Error en createAdmin:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear administrador'
      });
    }
  }

  /**
   * Actualizar administrador (solo super_admin)
   * PATCH /api/admin/admins/:id
   */
  static async updateAdmin(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const currentAdminId = req.adminId;
      const currentAdminRol = req.adminRol;
      const { id } = req.params;
      const { nombre, rol, is_active, password } = req.body;

      if (!currentAdminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (currentAdminRol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo super administradores pueden editar administradores'
        });
      }

      const dataToUpdate: any = {};

      if (nombre !== undefined) {
        dataToUpdate.nombre = Validators.sanitizeString(nombre);
      }

      if (rol !== undefined) {
        if (!['super_admin', 'admin'].includes(rol)) {
          return res.status(400).json({
            success: false,
            message: 'Rol inválido'
          });
        }
        dataToUpdate.rol = rol;
      }

      if (is_active !== undefined) {
        dataToUpdate.is_active = Boolean(is_active);
      }

      if (password !== undefined) {
        if (!Validators.isValidPassword(password)) {
          return res.status(400).json({
            success: false,
            message: 'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo'
          });
        }
        dataToUpdate.password_hash = await bcrypt.hash(password, 10);
      }

      if (Object.keys(dataToUpdate).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionaron campos para actualizar'
        });
      }

      const adminActualizado = await prisma.admin.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          is_active: true
        }
      });

      await AuditLogService.log('admin_actualizado', req, undefined, currentAdminId, {
        admin_id: id,
        campos_actualizados: Object.keys(dataToUpdate)
      });

      return res.json({
        success: true,
        message: 'Administrador actualizado exitosamente',
        data: { admin: adminActualizado }
      });
    } catch (error) {
      Logger.error('Error en updateAdmin:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar administrador'
      });
    }
  }

  /**
   * Eliminar administrador (solo super_admin)
   * DELETE /api/admin/admins/:id
   */
  static async deleteAdmin(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const currentAdminId = req.adminId;
      const currentAdminRol = req.adminRol;
      const { id } = req.params;

      if (!currentAdminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      if (currentAdminRol !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo super administradores pueden eliminar administradores'
        });
      }

      if (id === currentAdminId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminarte a ti mismo'
        });
      }

      const admin = await prisma.admin.findUnique({
        where: { id }
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Administrador no encontrado'
        });
      }

      await prisma.admin.delete({
        where: { id }
      });

      await AuditLogService.log('admin_eliminado', req, undefined, currentAdminId, {
        admin_eliminado_id: id,
        email: admin.email
      });

      Logger.info(`Admin eliminado: ${admin.email} por ${currentAdminId}`);

      return res.json({
        success: true,
        message: 'Administrador eliminado exitosamente'
      });
    } catch (error) {
      Logger.error('Error en deleteAdmin:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar administrador'
      });
    }
  }
}
