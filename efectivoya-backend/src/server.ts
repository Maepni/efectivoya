import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { socketService } from './services/socket.service';
import { Logger } from './utils/logger.util';

const PORT = process.env.PORT || 3000;

// Crear servidor HTTP para Socket.io
const server = http.createServer(app);

// Inicializar Socket.io
socketService.initialize(server);

server.listen(PORT, () => {
  Logger.info(`Servidor corriendo en puerto ${PORT}`);
  Logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`Health check: http://localhost:${PORT}/health`);
  Logger.info(`Socket.io inicializado`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});
