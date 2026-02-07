import { Router } from 'express';
import { param, body } from 'express-validator';
import { AdminContenidoController } from '../controllers/adminContenido.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion de admin
router.use(adminAuthMiddleware);

// FAQs
router.get('/faqs', AdminContenidoController.listFAQs);
router.post(
  '/faqs',
  [
    body('pregunta').isString().notEmpty(),
    body('respuesta').isString().notEmpty(),
    body('orden').optional().isInt()
  ],
  validateRequest,
  AdminContenidoController.createFAQ
);
router.patch(
  '/faqs/:id',
  [
    param('id').isUUID(),
    body('pregunta').optional().isString(),
    body('respuesta').optional().isString(),
    body('orden').optional().isInt()
  ],
  validateRequest,
  AdminContenidoController.updateFAQ
);
router.delete(
  '/faqs/:id',
  [param('id').isUUID()],
  validateRequest,
  AdminContenidoController.deleteFAQ
);

// Terminos y Condiciones
router.get('/terminos', AdminContenidoController.getTerminos);
router.patch(
  '/terminos',
  [
    body('contenido').isString().notEmpty(),
    body('version').optional().isString()
  ],
  validateRequest,
  AdminContenidoController.updateTerminos
);

// Politicas de Privacidad
router.get('/politicas', AdminContenidoController.getPoliticas);
router.patch(
  '/politicas',
  [
    body('contenido').isString().notEmpty(),
    body('version').optional().isString()
  ],
  validateRequest,
  AdminContenidoController.updatePoliticas
);

// Videos Instructivos
router.get('/videos', AdminContenidoController.listVideos);
router.patch(
  '/videos/:banco',
  [
    param('banco').isIn(['BCP', 'Interbank', 'Scotiabank', 'BBVA']),
    body('youtube_url').isString().notEmpty(),
    body('titulo').isString().notEmpty()
  ],
  validateRequest,
  AdminContenidoController.updateVideo
);

export default router;
