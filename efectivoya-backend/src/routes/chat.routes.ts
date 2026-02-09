import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Usuario obtiene su chat
router.get('/', authMiddleware, ChatController.getOrCreateUserChat);

export default router;
