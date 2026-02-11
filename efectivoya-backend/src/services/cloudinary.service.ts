import { v2 as cloudinary } from 'cloudinary';
import { Logger } from '../utils/logger.util';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export interface UploadResult {
  url: string;
  publicId: string;
}

export class CloudinaryService {
  /**
   * Sube un boucher (imagen) a Cloudinary
   * @param file - Buffer del archivo
   * @param userId - ID del usuario para organizar carpetas
   * @returns URL y publicId del archivo subido
   */
  static async uploadBoucher(file: Buffer, userId: string): Promise<UploadResult> {
    try {
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `efectivoya/bouchers/${userId}`,
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
            max_bytes: 5 * 1024 * 1024, // 5MB
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('No se obtuvo resultado de Cloudinary'));
          }
        ).end(file);
      });

      Logger.info(`Boucher subido: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (error) {
      Logger.error('Error al subir boucher a Cloudinary:', error);
      throw new Error('Error al subir el boucher');
    }
  }

  /**
   * Sube un comprobante PDF a Cloudinary
   * @param buffer - Buffer del PDF
   * @param numeroOperacion - Número de operación para nombrar el archivo
   * @returns URL y publicId del archivo subido
   */
  static async uploadComprobantePDF(buffer: Buffer, numeroOperacion: string): Promise<UploadResult> {
    try {
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'efectivoya/comprobantes',
            resource_type: 'raw',
            public_id: `comprobante-${numeroOperacion}`,
            format: 'pdf'
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('No se obtuvo resultado de Cloudinary'));
          }
        ).end(buffer);
      });

      Logger.info(`Comprobante PDF subido: ${result.public_id}`);

      // Generar URL firmada para evitar error "untrusted" en cuentas free
      const signedUrl = cloudinary.url(result.public_id, {
        resource_type: 'raw',
        sign_url: true,
        secure: true,
        type: 'upload'
      });

      return {
        url: signedUrl,
        publicId: result.public_id
      };
    } catch (error) {
      Logger.error('Error al subir comprobante PDF a Cloudinary:', error);
      throw new Error('Error al subir el comprobante');
    }
  }

  /**
   * Sube un video instructivo a Cloudinary
   * @param file - Buffer del archivo de video
   * @param banco - Nombre del banco para organizar carpetas
   * @returns URL y publicId del video subido
   */
  static async uploadVideo(file: Buffer, banco: string): Promise<UploadResult> {
    try {
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'efectivoya/videos_instructivos',
            resource_type: 'video',
            public_id: `video_${banco.toLowerCase()}_${Date.now()}`,
            allowed_formats: ['mp4', 'mov', 'webm'],
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'mp4' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('No se obtuvo resultado de Cloudinary'));
          }
        ).end(file);
      });

      Logger.info(`Video instructivo subido: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (error) {
      Logger.error('Error al subir video a Cloudinary:', error);
      throw new Error('Error al subir el video');
    }
  }

  /**
   * Elimina un archivo de Cloudinary
   * @param publicId - ID público del archivo
   * @param resourceType - Tipo de recurso (image, raw, video)
   */
  static async deleteFile(publicId: string, resourceType: 'image' | 'raw' | 'video' = 'image'): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      Logger.info(`Archivo eliminado de Cloudinary: ${publicId}`);
    } catch (error) {
      Logger.error('Error al eliminar archivo de Cloudinary:', error);
    }
  }
}
