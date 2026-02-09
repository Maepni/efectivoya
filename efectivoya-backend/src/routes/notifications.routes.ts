import { Router } from 'express';
import { body } from 'express-validator';
import { NotificationsController } from '../controllers/notifications.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Usuario registra token
router.post(
  '/register-token',
  authMiddleware,
  [body('push_token').isString().notEmpty()],
  validateRequest,
  NotificationsController.registerToken
);

// Usuario elimina token
router.delete('/token', authMiddleware, NotificationsController.deleteToken);

// Admin registra token
router.post(
  '/admin/register-token',
  adminAuthMiddleware,
  [body('push_token').isString().notEmpty()],
  validateRequest,
  NotificationsController.registerAdminToken
);

export default router;
