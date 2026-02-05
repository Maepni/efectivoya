import { Logger } from '../utils/logger.util';

// Almacenamiento temporal de OTPs (en producción usar Redis)
interface OTPStore {
  [key: string]: {
    otp: string;
    expiresAt: Date;
    attempts: number;
  };
}

const otpStore: OTPStore = {};

export class OTPService {
  // Generar OTP de 6 dígitos
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Guardar OTP con expiración de 10 minutos
  static saveOTP(email: string, otp: string): void {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    otpStore[email] = {
      otp,
      expiresAt,
      attempts: 0
    };

    Logger.info(`OTP generado para ${email}, expira en 10 minutos`);
  }

  // Verificar OTP
  static verifyOTP(email: string, otp: string): { valid: boolean; message: string } {
    const stored = otpStore[email];

    if (!stored) {
      return { valid: false, message: 'OTP no encontrado o expirado' };
    }

    // Verificar expiración
    if (new Date() > stored.expiresAt) {
      delete otpStore[email];
      return { valid: false, message: 'OTP expirado' };
    }

    // Verificar intentos (máximo 3)
    if (stored.attempts >= 3) {
      delete otpStore[email];
      return { valid: false, message: 'Demasiados intentos fallidos' };
    }

    // Verificar código
    if (stored.otp !== otp) {
      stored.attempts++;
      return { valid: false, message: 'OTP incorrecto' };
    }

    // OTP válido, eliminar
    delete otpStore[email];
    return { valid: true, message: 'OTP verificado correctamente' };
  }

  // Limpiar OTPs expirados (ejecutar periódicamente)
  static cleanExpiredOTPs(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [email, data] of Object.entries(otpStore)) {
      if (now > data.expiresAt) {
        delete otpStore[email];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      Logger.info(`Limpiados ${cleaned} OTPs expirados`);
    }
  }
}

// Limpiar OTPs cada 5 minutos
setInterval(() => {
  OTPService.cleanExpiredOTPs();
}, 5 * 60 * 1000);
