import { Router } from 'express';
import { body, param } from 'express-validator';
import { UserBanksController } from '../controllers/userBanks.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// 1. Listar bancos del usuario
router.get('/', UserBanksController.listBanks);

// 2. Obtener estadísticas
router.get('/stats', UserBanksController.getBankStats);

// 3. Obtener banco por ID
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  UserBanksController.getBankById
);

// 4. Registrar banco
router.post(
  '/',
  [
    body('banco')
      .isIn(['BCP', 'Interbank', 'Scotiabank', 'BBVA'])
      .withMessage('Banco debe ser: BCP, Interbank, Scotiabank o BBVA'),
    body('numero_cuenta')
      .isString()
      .notEmpty()
      .isNumeric()
      .isLength({ min: 13 })
      .withMessage('Número de cuenta debe tener al menos 13 dígitos'),
    body('cci')
      .isString()
      .notEmpty()
      .isNumeric()
      .isLength({ min: 20, max: 20 })
      .withMessage('CCI debe tener exactamente 20 dígitos'),
    body('alias')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Alias no puede tener más de 50 caracteres')
  ],
  validateRequest,
  UserBanksController.registerBank
);

// 5. Editar banco
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('numero_cuenta')
      .optional()
      .isString()
      .isNumeric()
      .isLength({ min: 13 })
      .withMessage('Número de cuenta debe tener al menos 13 dígitos'),
    body('cci')
      .optional()
      .isString()
      .isNumeric()
      .isLength({ min: 20, max: 20 })
      .withMessage('CCI debe tener exactamente 20 dígitos'),
    body('alias')
      .optional()
      .isString()
      .isLength({ max: 50 })
      .withMessage('Alias no puede tener más de 50 caracteres')
  ],
  validateRequest,
  UserBanksController.updateBank
);

// 6. Eliminar banco
router.delete(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  UserBanksController.deleteBank
);

export default router;
