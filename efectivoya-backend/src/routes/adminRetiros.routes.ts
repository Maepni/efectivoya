import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { AdminRetirosController } from '../controllers/adminRetiros.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion de admin
router.use(adminAuthMiddleware);

// 1. Listar retiros pendientes
router.get('/pendientes', AdminRetirosController.getPendientes);

// 2. Estadisticas
router.get('/stats', AdminRetirosController.getStats);

// 3. Obtener todos los retiros (con filtros)
router.get(
  '/',
  [
    query('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado']),
    query('user_id').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminRetirosController.getAll
);

// 4. Detalle de retiro
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminRetirosController.getDetalle
);

// 5. Aprobar retiro
router.post(
  '/:id/aprobar',
  [param('id').isUUID()],
  validateRequest,
  AdminRetirosController.aprobar
);

// 6. Rechazar retiro
router.post(
  '/:id/rechazar',
  [
    param('id').isUUID(),
    body('motivo_rechazo')
      .isString()
      .notEmpty()
      .withMessage('El motivo de rechazo es requerido')
  ],
  validateRequest,
  AdminRetirosController.rechazar
);

export default router;
