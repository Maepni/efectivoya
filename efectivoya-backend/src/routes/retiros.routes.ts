import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { RetirosController } from '../controllers/retiros.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authMiddleware);

// 1. Solicitar retiro
router.post(
  '/',
  [
    body('user_bank_id')
      .isUUID()
      .withMessage('ID de banco invalido'),
    body('monto')
      .isNumeric()
      .withMessage('El monto debe ser un numero')
      .custom((value) => parseFloat(value) > 0)
      .withMessage('El monto debe ser mayor a 0')
  ],
  validateRequest,
  RetirosController.solicitarRetiro
);

// 2. Historial de retiros
router.get(
  '/historial',
  [
    query('estado').optional().isIn(['pendiente', 'aprobado', 'rechazado']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  RetirosController.getHistorial
);

// 3. Descargar comprobante
router.get(
  '/:id/comprobante',
  [param('id').isUUID()],
  validateRequest,
  RetirosController.getComprobante
);

export default router;
