import { Router } from 'express';
import { AdminAuthController } from '../controllers/adminAuth.controller';

const router = Router();

/**
 * POST /api/admin/login
 * Login de administrador
 */
router.post('/login', AdminAuthController.login);

export default router;
