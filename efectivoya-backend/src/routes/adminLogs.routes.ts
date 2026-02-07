import { Router } from 'express';
import { param, query } from 'express-validator';
import { AdminLogsController } from '../controllers/adminLogs.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion de admin
router.use(adminAuthMiddleware);

// 1. Estadisticas
router.get('/stats', AdminLogsController.getStats);

// 2. Listar logs
router.get(
  '/',
  [
    query('accion').optional().isString(),
    query('user_id').optional().isUUID(),
    query('admin_id').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminLogsController.listLogs
);

// 3. Obtener log por ID
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminLogsController.getLogById
);

export default router;
