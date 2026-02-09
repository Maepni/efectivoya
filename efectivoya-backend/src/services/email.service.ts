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

  // Template de recarga aprobada
  static getRecargaAprobadaEmailHTML(
    nombres: string,
    numeroOperacion: string,
    monto: number,
    comision: number,
    montoNeto: number,
    nuevoSaldo: number
  ): string {
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
          .success-icon { text-align: center; font-size: 60px; color: #10B981; margin: 20px 0; }
          .content { text-align: center; }
          .amount { font-size: 36px; font-weight: bold; color: #10B981; margin: 20px 0; }
          .details { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
          .detail-label { color: #acacae; }
          .detail-value { font-weight: bold; color: #1f1f1f; }
          .footer { text-align: center; margin-top: 30px; color: #acacae; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Efectivo<span>Ya</span></h1>
            <p style="color: #acacae; margin: 5px 0;">Tu Dinero Al Instante</p>
          </div>
          <div class="success-icon">&#10003;</div>
          <div class="content">
            <h2 style="color: #1f1f1f;">Recarga Aprobada!</h2>
            <p style="color: #acacae;">Hola ${nombres}, tu recarga ha sido aprobada exitosamente.</p>
            <div class="amount">S/. ${montoNeto.toFixed(2)}</div>
            <p style="color: #acacae; font-size: 14px;">Monto acreditado a tu cuenta</p>
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">N de Operacion:</span>
                <span class="detail-value">${numeroOperacion}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Monto Depositado:</span>
                <span class="detail-value">S/. ${monto.toFixed(2)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Comision:</span>
                <span class="detail-value" style="color: #e83733;">-S/. ${comision.toFixed(2)}</span>
              </div>
              <div class="detail-row" style="border-bottom: none;">
                <span class="detail-label">Nuevo Saldo:</span>
                <span class="detail-value" style="color: #dc993c;">S/. ${nuevoSaldo.toFixed(2)}</span>
              </div>
            </div>
            <p style="color: #acacae; font-size: 14px;">Tu comprobante esta adjunto a este correo.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 EfectivoYa. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Template de recarga rechazada
  static getRecargaRechazadaEmailHTML(
    nombres: string,
    numeroOperacion: string,
    monto: number,
    motivo: string
  ): string {
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
          .error-icon { text-align: center; font-size: 60px; color: #e83733; margin: 20px 0; }
          .content { text-align: center; }
          .motivo-box { background-color: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #acacae; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Efectivo<span>Ya</span></h1>
            <p style="color: #acacae; margin: 5px 0;">Tu Dinero Al Instante</p>
          </div>
          <div class="error-icon">&#10007;</div>
          <div class="content">
            <h2 style="color: #1f1f1f;">Recarga Rechazada</h2>
            <p style="color: #acacae;">Hola ${nombres}, lamentablemente tu recarga no pudo ser procesada.</p>
            <div style="margin: 20px 0;">
              <p style="color: #acacae; margin: 5px 0;">N de Operacion:</p>
              <p style="font-weight: bold; color: #1f1f1f; margin: 5px 0;">${numeroOperacion}</p>
              <p style="color: #acacae; margin: 5px 0;">Monto: S/. ${monto.toFixed(2)}</p>
            </div>
            <div class="motivo-box">
              <p style="color: #856404; margin: 0; font-weight: bold;">Motivo del rechazo:</p>
              <p style="color: #856404; margin: 10px 0 0 0;">${motivo}</p>
            </div>
            <p style="color: #acacae; font-size: 14px;">Por favor, verifica los datos y vuelve a intentarlo. Si tienes dudas, contactanos por el chat de soporte.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 EfectivoYa. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Enviar email de recarga aprobada
  static async sendRecargaAprobadaEmail(
    email: string,
    nombres: string,
    numeroOperacion: string,
    monto: number,
    comision: number,
    montoNeto: number,
    nuevoSaldo: number,
    comprobantePdfBuffer?: Buffer
  ): Promise<void> {
    try {
      const mailOptions: {
        from: string;
        to: string;
        subject: string;
        html: string;
        attachments?: { filename: string; content: Buffer }[];
      } = {
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: 'Recarga Aprobada! - EfectivoYa',
        html: this.getRecargaAprobadaEmailHTML(nombres, numeroOperacion, monto, comision, montoNeto, nuevoSaldo)
      };

      if (comprobantePdfBuffer) {
        mailOptions.attachments = [
          {
            filename: `comprobante-${numeroOperacion}.pdf`,
            content: comprobantePdfBuffer
          }
        ];
      }

      await transporter.sendMail(mailOptions);
      Logger.info(`Email de recarga aprobada enviado a ${email}`);
    } catch (error) {
      Logger.error('Error al enviar email de recarga aprobada:', error);
    }
  }

  // Enviar email de recarga rechazada
  static async sendRecargaRechazadaEmail(
    email: string,
    nombres: string,
    numeroOperacion: string,
    monto: number,
    motivo: string
  ): Promise<void> {
    try {
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: 'Recarga Rechazada - EfectivoYa',
        html: this.getRecargaRechazadaEmailHTML(nombres, numeroOperacion, monto, motivo)
      });

      Logger.info(`Email de recarga rechazada enviado a ${email}`);
    } catch (error) {
      Logger.error('Error al enviar email de recarga rechazada:', error);
    }
  }
}
