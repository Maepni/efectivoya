import { Router } from 'express';
import { RecargasController } from '../controllers/recargas.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadBoucher } from '../middleware/upload.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * GET /api/recargas/config
 * Obtiene la configuración pública para recargas
 */
router.get('/config', RecargasController.getConfig);

/**
 * GET /api/recargas/video/:banco
 * Obtiene el video instructivo para un banco específico
 */
router.get('/video/:banco', RecargasController.getVideo);

/**
 * POST /api/recargas
 * Solicita una nueva recarga con boucher
 * Body: multipart/form-data con campo "boucher" (imagen) + banco_origen + monto_depositado
 */
router.post('/', uploadBoucher, RecargasController.solicitarRecarga);

/**
 * GET /api/recargas/historial
 * Obtiene el historial de recargas del usuario (paginado)
 * Query params: page, limit, estado
 */
router.get('/historial', RecargasController.getHistorial);

/**
 * GET /api/recargas/:id/comprobante
 * Obtiene la URL del comprobante PDF de una recarga aprobada
 */
router.get('/:id/comprobante', RecargasController.getComprobante);

export default router;
