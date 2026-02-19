import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler.middleware';
import authRoutes from './routes/auth.routes';
import userBanksRoutes from './routes/userBanks.routes';
import recargasRoutes from './routes/recargas.routes';
import retirosRoutes from './routes/retiros.routes';
import userRoutes from './routes/user.routes';
import adminAuthRoutes from './routes/adminAuth.routes';
import adminDashboardRoutes from './routes/adminDashboard.routes';
import adminUsersRoutes from './routes/adminUsers.routes';
import adminConfigRoutes from './routes/adminConfig.routes';
import adminAlertasRoutes from './routes/adminAlertas.routes';
import adminLogsRoutes from './routes/adminLogs.routes';
import adminContenidoRoutes from './routes/adminContenido.routes';
import adminAdminsRoutes from './routes/adminAdmins.routes';
import adminRecargasRoutes from './routes/adminRecargas.routes';
import adminRetirosRoutes from './routes/adminRetiros.routes';
import chatRoutes from './routes/chat.routes';
import adminChatRoutes from './routes/adminChat.routes';
import notificationsRoutes from './routes/notifications.routes';

const app: Application = express();
app.set('trust proxy', 1);

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8081',
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'EfectivoYa API está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Rutas de Usuarios
app.use('/api/auth', authRoutes);
app.use('/api/user-banks', userBanksRoutes);
app.use('/api/recargas', recargasRoutes);
app.use('/api/retiros', retirosRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationsRoutes);

// Rutas de Admin
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/config', adminConfigRoutes);
app.use('/api/admin/alertas', adminAlertasRoutes);
app.use('/api/admin/logs', adminLogsRoutes);
app.use('/api/admin/contenido', adminContenidoRoutes);
app.use('/api/admin/admins', adminAdminsRoutes);
app.use('/api/admin/recargas', adminRecargasRoutes);
app.use('/api/admin/retiros', adminRetirosRoutes);
app.use('/api/admin/chats', adminChatRoutes);

// Error handler (debe estar al final)
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

export default app;
