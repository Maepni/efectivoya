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
