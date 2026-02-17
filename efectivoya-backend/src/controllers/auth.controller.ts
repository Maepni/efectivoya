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
      const { email, password, nombres, apellidos, dni, whatsapp, codigo_referido_usado } = req.body;

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
      let codigo_referido = AuthController.generateReferralCode();
      let codigoExists = await prisma.user.findUnique({ where: { codigo_referido } });
      while (codigoExists) {
        codigo_referido = AuthController.generateReferralCode();
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
            dni: user.dni,
            whatsapp: user.whatsapp,
            saldo_actual: user.saldo_actual,
            codigo_referido: user.codigo_referido,
            email_verificado: true,
            is_active: user.is_active
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
            codigo_referido: user.codigo_referido,
            email_verificado: user.email_verificado,
            is_active: user.is_active
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

      // Generar nuevos tokens (token rotation)
      const newAccessToken = JWTUtil.generateAccessToken(user.id, user.email);
      const newTokenId = uuidv4();
      const newRefreshToken = JWTUtil.generateRefreshToken(user.id, newTokenId);

      return res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
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
