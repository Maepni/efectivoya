import { Router } from 'express';
import { param, query } from 'express-validator';
import { AdminAlertasController } from '../controllers/adminAlertas.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion de admin
router.use(adminAuthMiddleware);

// 1. Estadisticas
router.get('/stats', AdminAlertasController.getStats);

// 2. Marcar todas como revisadas
router.patch('/revisar-todas', AdminAlertasController.marcarTodasRevisadas);

// 3. Listar alertas
router.get(
  '/',
  [
    query('tipo').optional().isIn(['multiples_recargas', 'retiro_inmediato', 'boucher_duplicado', 'patron_sospechoso']),
    query('revisada').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  AdminAlertasController.listAlertas
);

// 4. Marcar alerta como revisada
router.patch(
  '/:id/revisar',
  [param('id').isUUID()],
  validateRequest,
  AdminAlertasController.marcarRevisada
);

export default router;
