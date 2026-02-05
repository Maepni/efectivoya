import rateLimit from 'express-rate-limit';

// Rate limiter para login (5 intentos cada 15 minutos)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para registro (3 registros por hora)
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  message: {
    success: false,
    message: 'Demasiados registros desde esta IP. Intenta de nuevo en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para recuperación de contraseña (3 solicitudes por hora)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
