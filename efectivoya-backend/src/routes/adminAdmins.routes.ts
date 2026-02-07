import { Router } from 'express';
import { param, body } from 'express-validator';
import { AdminAdminsController } from '../controllers/adminAdmins.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion de admin
router.use(adminAuthMiddleware);

// 1. Listar administradores
router.get('/', AdminAdminsController.listAdmins);

// 2. Crear administrador
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
    body('nombre').isString().notEmpty(),
    body('rol').isIn(['super_admin', 'admin'])
  ],
  validateRequest,
  AdminAdminsController.createAdmin
);

// 3. Actualizar administrador
router.patch(
  '/:id',
  [
    param('id').isUUID(),
    body('nombre').optional().isString(),
    body('rol').optional().isIn(['super_admin', 'admin']),
    body('is_active').optional().isBoolean(),
    body('password').optional().isString()
  ],
  validateRequest,
  AdminAdminsController.updateAdmin
);

// 4. Eliminar administrador
router.delete(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminAdminsController.deleteAdmin
);

export default router;
