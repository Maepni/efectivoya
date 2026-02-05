import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { Logger } from './utils/logger.util';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  Logger.info(`Servidor corriendo en puerto ${PORT}`);
  Logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  Logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});
