import { Router } from 'express';
import { param, query } from 'express-validator';
import { ChatController } from '../controllers/chat.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware';

const router = Router();

// Todas las rutas requieren autenticación de admin
router.use(adminAuthMiddleware);

// 1. Listar chats
router.get(
  '/',
  [
    query('estado').optional().isIn(['abierto', 'cerrado']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  ChatController.listChats
);

// 2. Detalle de chat
router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  ChatController.getChatDetail
);

// 3. Cerrar chat
router.patch(
  '/:id/cerrar',
  [param('id').isUUID()],
  validateRequest,
  ChatController.cerrarChat
);

// 4. Reabrir chat
router.patch(
  '/:id/reabrir',
  [param('id').isUUID()],
  validateRequest,
  ChatController.reabrirChat
);

export default router;
