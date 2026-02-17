import { Router } from 'express';
import { body } from 'express-validator';
import { AdminConfigController } from '../controllers/adminConfig.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion de admin
router.use(adminAuthMiddleware);

// 1. Obtener configuracion
router.get('/', AdminConfigController.getConfig);

// 2. Actualizar configuracion
router.patch(
  '/',
  [
    body('porcentaje_comision').optional().isFloat({ min: 0, max: 100 }),
    body('comision_bcp').optional().isFloat({ min: 0, max: 100 }),
    body('comision_interbank').optional().isFloat({ min: 0, max: 100 }),
    body('comision_scotiabank').optional().isFloat({ min: 0, max: 100 }),
    body('comision_bbva').optional().isFloat({ min: 0, max: 100 }),
    body('monto_minimo_recarga').optional().isFloat({ min: 0 }),
    body('monto_maximo_recarga').optional().isFloat({ min: 0 }),
    body('cuenta_recaudadora_numero').optional().isString(),
    body('cuenta_recaudadora_banco').optional().isString(),
    body('cuenta_recaudadora_titular').optional().isString(),
    body('mantenimiento_activo').optional().isBoolean(),
    body('version_minima_android').optional().isString(),
    body('version_minima_ios').optional().isString(),
    body('forzar_actualizacion').optional().isBoolean(),
    body('bono_referido').optional().isFloat({ min: 0 }),
    body('max_referidos_por_usuario').optional().isInt({ min: 0 })
  ],
  validateRequest,
  AdminConfigController.updateConfig
);

// 3. Toggle modo mantenimiento
router.patch(
  '/maintenance',
  [body('activo').isBoolean()],
  validateRequest,
  AdminConfigController.toggleMaintenance
);

export default router;
