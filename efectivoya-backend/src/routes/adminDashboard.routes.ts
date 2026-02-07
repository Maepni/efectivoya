import { Router } from 'express';
import { query } from 'express-validator';
import { AdminDashboardController } from '../controllers/adminDashboard.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion de admin
router.use(adminAuthMiddleware);

// 1. Metricas generales
router.get('/metrics', AdminDashboardController.getMetrics);

// 2. Actividad reciente
router.get(
  '/recent-activity',
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  AdminDashboardController.getRecentActivity
);

// 3. Tendencias (ultimos 7 dias)
router.get('/trends', AdminDashboardController.getTrends);

export default router;
