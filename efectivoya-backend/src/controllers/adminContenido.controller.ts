import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AdminRequest } from '../types';
import { Logger } from '../utils/logger.util';
import { AuditLogService } from '../services/auditLog.service';
import { CloudinaryService } from '../services/cloudinary.service';

const prisma = new PrismaClient();

export class AdminContenidoController {
  /**
   * Listar FAQs
   * GET /api/admin/contenido/faqs
   */
  static async listFAQs(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const faqs = await prisma.fAQ.findMany({
        orderBy: { orden: 'asc' }
      });

      return res.json({
        success: true,
        data: { faqs }
      });
    } catch (error) {
      Logger.error('Error en listFAQs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar FAQs'
      });
    }
  }

  /**
   * Crear FAQ
   * POST /api/admin/contenido/faqs
   */
  static async createFAQ(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { pregunta, respuesta, orden } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const faq = await prisma.fAQ.create({
        data: {
          pregunta,
          respuesta,
          orden: orden || 999
        }
      });

      await AuditLogService.log('faq_creada', req, undefined, adminId, {
        faq_id: faq.id
      });

      return res.status(201).json({
        success: true,
        message: 'FAQ creada exitosamente',
        data: { faq }
      });
    } catch (error) {
      Logger.error('Error en createFAQ:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al crear FAQ'
      });
    }
  }

  /**
   * Actualizar FAQ
   * PATCH /api/admin/contenido/faqs/:id
   */
  static async updateFAQ(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;
      const { pregunta, respuesta, orden } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const dataToUpdate: any = {};
      if (pregunta !== undefined) dataToUpdate.pregunta = pregunta;
      if (respuesta !== undefined) dataToUpdate.respuesta = respuesta;
      if (orden !== undefined) dataToUpdate.orden = parseInt(orden);

      const faq = await prisma.fAQ.update({
        where: { id },
        data: dataToUpdate
      });

      await AuditLogService.log('faq_actualizada', req, undefined, adminId, {
        faq_id: id
      });

      return res.json({
        success: true,
        message: 'FAQ actualizada exitosamente',
        data: { faq }
      });
    } catch (error) {
      Logger.error('Error en updateFAQ:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar FAQ'
      });
    }
  }

  /**
   * Eliminar FAQ
   * DELETE /api/admin/contenido/faqs/:id
   */
  static async deleteFAQ(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { id } = req.params;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      await prisma.fAQ.delete({
        where: { id }
      });

      await AuditLogService.log('faq_eliminada', req, undefined, adminId, {
        faq_id: id
      });

      return res.json({
        success: true,
        message: 'FAQ eliminada exitosamente'
      });
    } catch (error) {
      Logger.error('Error en deleteFAQ:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar FAQ'
      });
    }
  }

  /**
   * Obtener terminos y condiciones
   * GET /api/admin/contenido/terminos
   */
  static async getTerminos(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const terminos = await prisma.terminosCondiciones.findUnique({
        where: { id: 1 }
      });

      return res.json({
        success: true,
        data: { terminos }
      });
    } catch (error) {
      Logger.error('Error en getTerminos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener términos'
      });
    }
  }

  /**
   * Actualizar terminos y condiciones
   * PATCH /api/admin/contenido/terminos
   */
  static async updateTerminos(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { contenido, version } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const terminos = await prisma.terminosCondiciones.upsert({
        where: { id: 1 },
        update: {
          contenido,
          version: version || '1.0'
        },
        create: {
          id: 1,
          contenido,
          version: version || '1.0'
        }
      });

      await AuditLogService.log('terminos_actualizados', req, undefined, adminId);

      return res.json({
        success: true,
        message: 'Términos actualizados exitosamente',
        data: { terminos }
      });
    } catch (error) {
      Logger.error('Error en updateTerminos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar términos'
      });
    }
  }

  /**
   * Obtener politicas de privacidad
   * GET /api/admin/contenido/politicas
   */
  static async getPoliticas(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const politicas = await prisma.politicasPrivacidad.findUnique({
        where: { id: 1 }
      });

      return res.json({
        success: true,
        data: { politicas }
      });
    } catch (error) {
      Logger.error('Error en getPoliticas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener políticas'
      });
    }
  }

  /**
   * Actualizar politicas de privacidad
   * PATCH /api/admin/contenido/politicas
   */
  static async updatePoliticas(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { contenido, version } = req.body;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const politicas = await prisma.politicasPrivacidad.upsert({
        where: { id: 1 },
        update: {
          contenido,
          version: version || '1.0'
        },
        create: {
          id: 1,
          contenido,
          version: version || '1.0'
        }
      });

      await AuditLogService.log('politicas_actualizadas', req, undefined, adminId);

      return res.json({
        success: true,
        message: 'Políticas actualizadas exitosamente',
        data: { politicas }
      });
    } catch (error) {
      Logger.error('Error en updatePoliticas:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar políticas'
      });
    }
  }

  /**
   * Listar videos instructivos
   * GET /api/admin/contenido/videos
   */
  static async listVideos(_req: AdminRequest, res: Response): Promise<Response> {
    try {
      const videos = await prisma.videoInstructivo.findMany({
        orderBy: { banco: 'asc' }
      });

      return res.json({
        success: true,
        data: { videos }
      });
    } catch (error) {
      Logger.error('Error en listVideos:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al listar videos'
      });
    }
  }

  /**
   * Actualizar video instructivo por banco
   * PATCH /api/admin/contenido/videos/:banco
   * Acepta multipart/form-data con campo 'video' (archivo) y 'titulo' (texto)
   */
  static async updateVideo(req: AdminRequest, res: Response): Promise<Response> {
    try {
      const adminId = req.adminId;
      const { banco } = req.params;
      const { titulo } = req.body;
      const file = req.file;

      if (!adminId) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const existing = await prisma.videoInstructivo.findUnique({
        where: { banco: banco as any }
      });

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Video no encontrado para este banco' });
      }

      const dataToUpdate: { titulo?: string; video_url?: string; video_cloudinary_id?: string } = {};

      if (titulo) {
        dataToUpdate.titulo = titulo;
      }

      if (file) {
        // Eliminar video anterior de Cloudinary si existe
        if (existing.video_cloudinary_id) {
          await CloudinaryService.deleteFile(existing.video_cloudinary_id, 'video');
        }

        // Subir nuevo video
        const uploadResult = await CloudinaryService.uploadVideo(file.buffer, banco);
        dataToUpdate.video_url = uploadResult.url;
        dataToUpdate.video_cloudinary_id = uploadResult.publicId;
      }

      const video = await prisma.videoInstructivo.update({
        where: { banco: banco as any },
        data: dataToUpdate
      });

      await AuditLogService.log('video_actualizado', req, undefined, adminId, {
        banco,
        has_video_file: !!file
      });

      return res.json({
        success: true,
        message: 'Video actualizado exitosamente',
        data: { video }
      });
    } catch (error) {
      Logger.error('Error en updateVideo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar video'
      });
    }
  }
}
