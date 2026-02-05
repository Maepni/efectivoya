import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// 1. Registro
router.post(
  '/register',
  registerLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
    body('nombres').isString().notEmpty().trim(),
    body('apellidos').isString().notEmpty().trim(),
    body('dni').isString().isLength({ min: 8, max: 8 }),
    body('numero_documento').isString().notEmpty(),
    body('whatsapp').isString().isLength({ min: 9, max: 9 }),
    body('codigo_referido_usado').optional().isString()
  ],
  validateRequest,
  AuthController.register
);

// 2. Verificar email
router.post(
  '/verify-email',
  [
    body('userId').isString().notEmpty(),
    body('otp').isString().isLength({ min: 6, max: 6 })
  ],
  validateRequest,
  AuthController.verifyEmail
);

// 3. Login
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty()
  ],
  validateRequest,
  AuthController.login
);

// 4. Refresh token
router.post(
  '/refresh',
  [body('refreshToken').isString().notEmpty()],
  validateRequest,
  AuthController.refreshToken
);

// 5. Reenviar OTP
router.post(
  '/resend-otp',
  [body('email').isEmail().normalizeEmail()],
  validateRequest,
  AuthController.resendOTP
);

// 6. Olvidé mi contraseña
router.post(
  '/forgot-password',
  passwordResetLimiter,
  [body('email').isEmail().normalizeEmail()],
  validateRequest,
  AuthController.forgotPassword
);

// 7. Restablecer contraseña
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isString().isLength({ min: 6, max: 6 }),
    body('newPassword').isString().notEmpty()
  ],
  validateRequest,
  AuthController.resetPassword
);

// 8. Logout (protegida)
router.post('/logout', authMiddleware, AuthController.logout);

// 9. Obtener perfil (protegida)
router.get('/profile', authMiddleware, AuthController.getProfile);

export default router;
