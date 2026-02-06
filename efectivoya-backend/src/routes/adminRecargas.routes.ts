import { Router } from 'express';
import { AdminRecargasController } from '../controllers/adminRecargas.controller';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

/**
 * GET /api/admin/recargas/pendientes
 * Lista todas las recargas pendientes de aprobar
 * Query params: page, limit
 */
router.get('/pendientes', AdminRecargasController.getPendientes);

/**
 * GET /api/admin/recargas/stats
 * Obtiene estadísticas de recargas
 */
router.get('/stats', AdminRecargasController.getStats);

/**
 * GET /api/admin/recargas
 * Lista todas las recargas con filtros
 * Query params: page, limit, estado, banco, fecha_desde, fecha_hasta, busqueda
 */
router.get('/', AdminRecargasController.getAll);

/**
 * GET /api/admin/recargas/:id
 * Obtiene el detalle completo de una recarga
 */
router.get('/:id', AdminRecargasController.getDetalle);

/**
 * POST /api/admin/recargas/:id/aprobar
 * Aprueba una recarga pendiente
 */
router.post('/:id/aprobar', AdminRecargasController.aprobar);

/**
 * POST /api/admin/recargas/:id/rechazar
 * Rechaza una recarga pendiente
 * Body: { motivo: string }
 */
router.post('/:id/rechazar', AdminRecargasController.rechazar);

export default router;
