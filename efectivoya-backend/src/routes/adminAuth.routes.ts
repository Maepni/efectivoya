import { Router } from 'express';
import { body } from 'express-validator';
import { AdminAuthController } from '../controllers/adminAuth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';
import { loginLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// 1. Login
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty()
  ],
  validateRequest,
  AdminAuthController.login
);

// 2. Perfil (protegida)
router.get('/profile', adminAuthMiddleware, AdminAuthController.getProfile);

// 3. Logout (protegida)
router.post('/logout', adminAuthMiddleware, AdminAuthController.logout);

export default router;
