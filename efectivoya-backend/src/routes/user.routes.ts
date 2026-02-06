import { Router } from 'express';
import { UserDashboardController } from '../controllers/userDashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticacion
router.use(authMiddleware);

// 1. Dashboard completo
router.get('/dashboard', UserDashboardController.getDashboard);

// 2. Informacion de referido
router.get('/referido', UserDashboardController.getReferido);

// 3. Lista de referidos
router.get('/referidos/lista', UserDashboardController.getListaReferidos);

export default router;
