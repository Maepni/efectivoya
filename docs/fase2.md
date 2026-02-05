# FASE 2: Autenticación de Usuarios - EfectivoYa

## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

IMPORTANTE: La FASE 1 ya está completada. Tienes el backend base funcionando con Prisma, PostgreSQL, middlewares y utilidades.

## OBJETIVO DE ESTA FASE
Implementar el módulo completo de autenticación de usuarios:
- Registro con validaciones robustas
- Verificación de email con OTP
- Login con JWT (access + refresh tokens)
- Recuperación de contraseña
- Sistema de referidos
- Logs de auditoría automáticos
- Envío de emails con Nodemailer

## ESTRUCTURA A CREAR
efectivoya-backend/src/
├── controllers/
│   └── auth.controller.ts
├── routes/
│   └── auth.routes.ts
├── services/
│   ├── email.service.ts
│   ├── otp.service.ts
│   └── auditLog.service.ts
└── middleware/
└── rateLimit.middleware.ts

## INSTRUCCIONES DETALLADAS

### 1. INSTALAR DEPENDENCIAS ADICIONALES

Primero, instala estas dependencias:
```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

### 2. ACTUALIZAR .ENV.EXAMPLE

Agrega estas variables al archivo .env.example:
```env
# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password-de-gmail
SMTP_FROM_NAME=EfectivoYa
SMTP_FROM_EMAIL=noreply@efectivoya.com
```

### 3. SERVICIO DE OTP (src/services/otp.service.ts)
```typescript
import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

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
```

### 4. SERVICIO DE EMAIL (src/services/email.service.ts)
```typescript
import nodemailer from 'nodemailer';
import { Logger } from '../utils/logger.util';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export class EmailService {
  // Template de verificación de email
  static getVerificationEmailHTML(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #1f1f1f; margin: 0; }
          .logo span { color: #e83733; }
          .content { text-align: center; }
          .otp-box { background-color: #f9f9f9; border: 2px dashed #dc993c; padding: 20px; margin: 30px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #1f1f1f; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 30px; color: #acacae; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Efectivo<span>Ya</span></h1>
            <p style="color: #acacae; margin: 5px 0;">Tu Dinero Al Instante</p>
          </div>
          <div class="content">
            <h2 style="color: #1f1f1f;">Verifica tu correo electrónico</h2>
            <p style="color: #acacae;">Ingresa el siguiente código en la aplicación para verificar tu cuenta:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p style="color: #acacae; font-size: 14px;">Este código expira en 10 minutos.</p>
            <p style="color: #acacae; font-size: 14px;">Si no solicitaste este código, ignora este mensaje.</p>
          </div>
          <div class="footer">
            <p>© 2026 EfectivoYa. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Template de recuperación de contraseña
  static getPasswordResetEmailHTML(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
          .container { background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #1f1f1f; margin: 0; }
          .logo span { color: #e83733; }
          .content { text-align: center; }
          .otp-box { background-color: #f9f9f9; border: 2px dashed #e83733; padding: 20px; margin: 30px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #1f1f1f; letter-spacing: 8px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #acacae; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Efectivo<span>Ya</span></h1>
            <p style="color: #acacae; margin: 5px 0;">Tu Dinero Al Instante</p>
          </div>
          <div class="content">
            <h2 style="color: #1f1f1f;">Recuperación de Contraseña</h2>
            <p style="color: #acacae;">Has solicitado restablecer tu contraseña. Usa el siguiente código:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p style="color: #acacae; font-size: 14px;">Este código expira en 10 minutos.</p>
            <div class="warning">
              <p style="color: #856404; margin: 0; font-size: 14px;">⚠️ Si no solicitaste este cambio, ignora este mensaje y tu contraseña permanecerá sin cambios.</p>
            </div>
          </div>
          <div class="footer">
            <p>© 2026 EfectivoYa. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Enviar email de verificación
  static async sendVerificationEmail(email: string, otp: string): Promise<void> {
    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: 'Verifica tu correo - EfectivoYa',
        html: this.getVerificationEmailHTML(otp)
      });

      Logger.info(`Email de verificación enviado a ${email}`);
    } catch (error) {
      Logger.error('Error al enviar email de verificación:', error);
      throw new Error('No se pudo enviar el email de verificación');
    }
  }

  // Enviar email de recuperación de contraseña
  static async sendPasswordResetEmail(email: string, otp: string): Promise<void> {
    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: 'Recuperación de Contraseña - EfectivoYa',
        html: this.getPasswordResetEmailHTML(otp)
      });

      Logger.info(`Email de recuperación enviado a ${email}`);
    } catch (error) {
      Logger.error('Error al enviar email de recuperación:', error);
      throw new Error('No se pudo enviar el email de recuperación');
    }
  }
}
```

### 5. SERVICIO DE AUDIT LOG (src/services/auditLog.service.ts)
```typescript
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { Logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class AuditLogService {
  static async log(
    accion: string,
    req: Request,
    userId?: string,
    adminId?: string,
    detalles?: any
  ): Promise<void> {
    try {
      const ip_address = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const user_agent = req.headers['user-agent'] || 'unknown';

      await prisma.auditLog.create({
        data: {
          user_id: userId || null,
          admin_id: adminId || null,
          accion,
          ip_address,
          user_agent,
          detalles: detalles || null
        }
      });

      Logger.debug(`Audit log creado: ${accion} - User: ${userId} - Admin: ${adminId}`);
    } catch (error) {
      Logger.error('Error al crear audit log:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }
}
```

### 6. MIDDLEWARE DE RATE LIMITING (src/middleware/rateLimit.middleware.ts)
```typescript
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
```

### 7. CONTROLADOR DE AUTENTICACIÓN (src/controllers/auth.controller.ts)
```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Validators } from '../utils/validators.util';
import { JWTUtil } from '../utils/jwt.util';
import { Logger } from '../utils/logger.util';
import { OTPService } from '../services/otp.service';
import { EmailService } from '../services/email.service';
import { AuditLogService } from '../services/auditLog.service';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();

export class AuthController {
  // Generar código de referido único
  static generateReferralCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'EFECTIVO-';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  // 1. REGISTRO
  static async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, nombres, apellidos, dni, numero_documento, whatsapp, codigo_referido_usado } = req.body;

      // Validaciones
      if (!Validators.isValidEmail(email)) {
        return res.status(400).json({ success: false, message: 'Email inválido' });
      }

      if (!Validators.isValidPassword(password)) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo'
        });
      }

      if (!Validators.isValidDNI(dni)) {
        return res.status(400).json({ success: false, message: 'DNI debe tener 8 dígitos' });
      }

      if (!Validators.isValidWhatsApp(whatsapp)) {
        return res.status(400).json({ success: false, message: 'WhatsApp debe tener 9 dígitos' });
      }

      // Verificar email único
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'El email ya está registrado' });
      }

      // Verificar DNI único
      const existingDNI = await prisma.user.findUnique({ where: { dni } });
      if (existingDNI) {
        return res.status(400).json({ success: false, message: 'El DNI ya está registrado' });
      }

      // Verificar código de referido si fue proporcionado
      let referrerUser = null;
      if (codigo_referido_usado) {
        referrerUser = await prisma.user.findUnique({
          where: { codigo_referido: codigo_referido_usado }
        });

        if (!referrerUser) {
          return res.status(400).json({ success: false, message: 'Código de referido inválido' });
        }
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Generar código de referido único
      let codigo_referido = this.generateReferralCode();
      let codigoExists = await prisma.user.findUnique({ where: { codigo_referido } });
      while (codigoExists) {
        codigo_referido = this.generateReferralCode();
        codigoExists = await prisma.user.findUnique({ where: { codigo_referido } });
      }

      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email,
          password_hash,
          nombres: Validators.sanitizeString(nombres),
          apellidos: Validators.sanitizeString(apellidos),
          dni,
          numero_documento: Validators.sanitizeString(numero_documento),
          whatsapp,
          codigo_referido,
          referido_por: referrerUser?.id || null
        }
      });

      // Si fue referido, crear registro en tabla referidos
      if (referrerUser) {
        await prisma.referido.create({
          data: {
            referrer_id: referrerUser.id,
            referred_id: user.id
          }
        });
      }

      // Generar y enviar OTP
      const otp = OTPService.generateOTP();
      OTPService.saveOTP(email, otp);
      await EmailService.sendVerificationEmail(email, otp);

      // Audit log
      await AuditLogService.log('registro', req, user.id, undefined, {
        email,
        dni,
        referido_por: referrerUser?.codigo_referido || null
      });

      Logger.info(`Usuario registrado: ${email}`);

      return res.status(201).json({
        success: true,
        message: 'Usuario registrado. Código de verificación enviado a tu email.',
        data: {
          userId: user.id,
          email: user.email
        }
      });
    } catch (error) {
      Logger.error('Error en register:', error);
      return res.status(500).json({ success: false, message: 'Error al registrar usuario' });
    }
  }

  // 2. VERIFICAR EMAIL
  static async verifyEmail(req: Request, res: Response): Promise<Response> {
    try {
      const { userId, otp } = req.body;

      if (!userId || !otp) {
        return res.status(400).json({ success: false, message: 'userId y otp son requeridos' });
      }

      // Buscar usuario
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (user.email_verificado) {
        return res.status(400).json({ success: false, message: 'Email ya verificado' });
      }

      // Verificar OTP
      const verification = OTPService.verifyOTP(user.email, otp);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message });
      }

      // Marcar email como verificado
      await prisma.user.update({
        where: { id: userId },
        data: { email_verificado: true }
      });

      // Generar tokens JWT
      const accessToken = JWTUtil.generateAccessToken(user.id, user.email);
      const tokenId = uuidv4();
      const refreshToken = JWTUtil.generateRefreshToken(user.id, tokenId);

      // Audit log
      await AuditLogService.log('email_verificado', req, user.id);

      Logger.info(`Email verificado: ${user.email}`);

      return res.json({
        success: true,
        message: 'Email verificado correctamente',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            nombres: user.nombres,
            apellidos: user.apellidos,
            saldo_actual: user.saldo_actual,
            codigo_referido: user.codigo_referido
          }
        }
      });
    } catch (error) {
      Logger.error('Error en verifyEmail:', error);
      return res.status(500).json({ success: false, message: 'Error al verificar email' });
    }
  }

  // 3. LOGIN
  static async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos' });
      }

      // Buscar usuario
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        await AuditLogService.log('login_fallido', req, user.id);
        return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      }

      // Verificar email verificado
      if (!user.email_verificado) {
        return res.status(403).json({
          success: false,
          message: 'Debes verificar tu email antes de iniciar sesión',
          data: { userId: user.id, email: user.email }
        });
      }

      // Verificar cuenta activa
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Tu cuenta ha sido suspendida. Contacta con soporte.'
        });
      }

      // Generar tokens
      const accessToken = JWTUtil.generateAccessToken(user.id, user.email);
      const tokenId = uuidv4();
      const refreshToken = JWTUtil.generateRefreshToken(user.id, tokenId);

      // Audit log
      await AuditLogService.log('login', req, user.id);

      Logger.info(`Login exitoso: ${user.email}`);

      return res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            nombres: user.nombres,
            apellidos: user.apellidos,
            dni: user.dni,
            whatsapp: user.whatsapp,
            saldo_actual: user.saldo_actual,
            codigo_referido: user.codigo_referido
          }
        }
      });
    } catch (error) {
      Logger.error('Error en login:', error);
      return res.status(500).json({ success: false, message: 'Error al iniciar sesión' });
    }
  }

  // 4. REFRESH TOKEN
  static async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token requerido' });
      }

      // Verificar refresh token
      const decoded = JWTUtil.verifyRefreshToken(refreshToken);

      // Verificar que el usuario existe y está activo
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user || !user.is_active) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
      }

      // Generar nuevo access token
      const newAccessToken = JWTUtil.generateAccessToken(user.id, user.email);

      return res.json({
        success: true,
        data: {
          accessToken: newAccessToken
        }
      });
    } catch (error) {
      Logger.error('Error en refreshToken:', error);
      return res.status(401).json({ success: false, message: 'Refresh token inválido o expirado' });
    }
  }

  // 5. REENVIAR OTP
  static async resendOTP(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email requerido' });
      }

      // Buscar usuario
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (user.email_verificado) {
        return res.status(400).json({ success: false, message: 'Email ya verificado' });
      }

      // Generar y enviar nuevo OTP
      const otp = OTPService.generateOTP();
      OTPService.saveOTP(email, otp);
      await EmailService.sendVerificationEmail(email, otp);

      Logger.info(`OTP reenviado a ${email}`);

      return res.json({
        success: true,
        message: 'Código de verificación reenviado'
      });
    } catch (error) {
      Logger.error('Error en resendOTP:', error);
      return res.status(500).json({ success: false, message: 'Error al reenviar código' });
    }
  }

  // 6. OLVIDÉ MI CONTRASEÑA
  static async forgotPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email requerido' });
      }

      // Buscar usuario
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        // Por seguridad, no revelar si el email existe o no
        return res.json({
          success: true,
          message: 'Si el email existe, recibirás un código de recuperación'
        });
      }

      // Generar y enviar OTP
      const otp = OTPService.generateOTP();
      OTPService.saveOTP(email, otp);
      await EmailService.sendPasswordResetEmail(email, otp);

      // Audit log
      await AuditLogService.log('olvido_contraseña', req, user.id);

      Logger.info(`OTP de recuperación enviado a ${email}`);

      return res.json({
        success: true,
        message: 'Si el email existe, recibirás un código de recuperación'
      });
    } catch (error) {
      Logger.error('Error en forgotPassword:', error);
      return res.status(500).json({ success: false, message: 'Error al procesar solicitud' });
    }
  }

  // 7. RESTABLECER CONTRASEÑA
  static async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, OTP y nueva contraseña son requeridos' });
      }

      // Validar nueva contraseña
      if (!Validators.isValidPassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo'
        });
      }

      // Verificar OTP
      const verification = OTPService.verifyOTP(email, otp);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message });
      }

      // Buscar usuario
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      // Hash nueva contraseña
      const password_hash = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      await prisma.user.update({
        where: { id: user.id },
        data: { password_hash }
      });

      // Audit log
      await AuditLogService.log('contraseña_restablecida', req, user.id);

      Logger.info(`Contraseña restablecida para ${email}`);

      return res.json({
        success: true,
        message: 'Contraseña actualizada correctamente'
      });
    } catch (error) {
      Logger.error('Error en resetPassword:', error);
      return res.status(500).json({ success: false, message: 'Error al restablecer contraseña' });
    }
  }

  // 8. LOGOUT
  static async logout(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Audit log
      await AuditLogService.log('logout', req, req.userId);

      Logger.info(`Logout: ${req.email}`);

      // En producción, agregar refresh token a blacklist en Redis
      return res.json({
        success: true,
        message: 'Sesión cerrada correctamente'
      });
    } catch (error) {
      Logger.error('Error en logout:', error);
      return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
    }
  }

  // 9. OBTENER PERFIL
  static async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          nombres: true,
          apellidos: true,
          dni: true,
          numero_documento: true,
          whatsapp: true,
          saldo_actual: true,
          codigo_referido: true,
          email_verificado: true,
          is_active: true,
          created_at: true
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      return res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      Logger.error('Error en getProfile:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener perfil' });
    }
  }
}
```

### 8. RUTAS DE AUTENTICACIÓN (src/routes/auth.routes.ts)
```typescript
import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// 1. Registro
router.post(
  '/register',
  registerLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
    body('nombres').isString().notEmpty().trim(),
    body('apellidos').isString().notEmpty().trim(),
    body('dni').isString().isLength({ min: 8, max: 8 }),
    body('numero_documento').isString().notEmpty(),
    body('whatsapp').isString().isLength({ min: 9, max: 9 }),
    body('codigo_referido_usado').optional().isString()
  ],
  validateRequest,
  AuthController.register
);

// 2. Verificar email
router.post(
  '/verify-email',
  [
    body('userId').isString().notEmpty(),
    body('otp').isString().isLength({ min: 6, max: 6 })
  ],
  validateRequest,
  AuthController.verifyEmail
);

// 3. Login
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty()
  ],
  validateRequest,
  AuthController.login
);

// 4. Refresh token
router.post(
  '/refresh',
  [body('refreshToken').isString().notEmpty()],
  validateRequest,
  AuthController.refreshToken
);

// 5. Reenviar OTP
router.post(
  '/resend-otp',
  [body('email').isEmail().normalizeEmail()],
  validateRequest,
  AuthController.resendOTP
);

// 6. Olvidé mi contraseña
router.post(
  '/forgot-password',
  passwordResetLimiter,
  [body('email').isEmail().normalizeEmail()],
  validateRequest,
  AuthController.forgotPassword
);

// 7. Restablecer contraseña
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isString().isLength({ min: 6, max: 6 }),
    body('newPassword').isString().notEmpty()
  ],
  validateRequest,
  AuthController.resetPassword
);

// 8. Logout (protegida)
router.post('/logout', authMiddleware, AuthController.logout);

// 9. Obtener perfil (protegida)
router.get('/profile', authMiddleware, AuthController.getProfile);

export default router;
```

### 9. ACTUALIZAR APP.TS

Agrega la importación y el uso de las rutas de autenticación:
```typescript
// ... imports existentes ...
import authRoutes from './routes/auth.routes';

// ... middlewares existentes ...

// Rutas
app.use('/api/auth', authRoutes);

// ... error handlers ...
```

### 10. CONFIGURAR VARIABLES DE ENTORNO

En tu archivo `.env`, agrega:
```env
# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password-generado-en-google
SMTP_FROM_NAME=EfectivoYa
SMTP_FROM_EMAIL=noreply@efectivoya.com
```

**IMPORTANTE:** Para Gmail SMTP:
1. Ve a https://myaccount.google.com/apppasswords
2. Genera una contraseña de aplicación
3. Usa esa contraseña en SMTP_PASS (NO tu contraseña normal)

## PRUEBAS MANUALES

Después de implementar, prueba estos endpoints:

### 1. Registro
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "nombres": "Juan",
    "apellidos": "Pérez",
    "dni": "12345678",
    "numero_documento": "DNI-12345678",
    "whatsapp": "987654321"
  }'
```

### 2. Verificar Email
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid-del-usuario",
    "otp": "123456"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

### 4. Obtener Perfil (requiere token)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer tu-access-token"
```

## RESULTADO ESPERADO

Al finalizar esta fase tendrás:
✅ Sistema completo de registro con validaciones
✅ Verificación de email con OTP
✅ Login con JWT (access + refresh tokens)
✅ Recuperación de contraseña
✅ Sistema de referidos implementado
✅ Logs de auditoría automáticos
✅ Envío de emails HTML profesionales
✅ Rate limiting en rutas críticas
✅ Endpoints protegidos con middleware de autenticación
✅ Manejo robusto de errores

## NOTAS IMPORTANTES

- Los OTPs expiran en 10 minutos
- Máximo 3 intentos de verificación por OTP
- Rate limiting: 5 logins/15min, 3 registros/hora, 3 resets/hora
- Códigos de referido únicos con formato EFECTIVO-XXXXXX
- Todos los logs de auditoría se guardan en base de datos
- Contraseñas hasheadas con bcrypt (10 salt rounds)
- Access token: 15 minutos | Refresh token: 7 días