import { Router } from 'express';
import { param, query, body } from 'express-validator';
import { AdminUsersController } from '../controllers/adminUsers.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion de admin
router.use(adminAuthMiddleware);

// 1. Estadisticas de usuarios
router.get('/stats', AdminUsersController.getUsersStats);

// 2. Listar usuarios
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('is_active').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminUsersController.listUsers
);

// 3. Detalle de usuario
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminUsersController.getUserDetail
);

// 4. Eliminar usuario
router.delete(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminUsersController.deleteUser
);

// 5. Suspender/activar usuario
router.patch(
  '/:id/toggle-status',
  [
    param('id').isUUID(),
    body('motivo').optional().isString()
  ],
  validateRequest,
  AdminUsersController.toggleUserStatus
);

export default router;
