import PDFDocument from 'pdfkit';
import { Decimal } from '@prisma/client/runtime/library';
import { Formatters } from '../utils/formatters.util';

export interface RecargaComprobanteData {
  numeroOperacion: string;
  fecha: Date;
  usuario: {
    nombres: string;
    apellidos: string;
    dni: string;
    email: string;
  };
  bancoOrigen: string;
  montoDepositado: number | string | Decimal;
  porcentajeComision: number | string | Decimal;
  comisionCalculada: number | string | Decimal;
  montoNeto: number | string | Decimal;
  saldoAnterior: number | string | Decimal;
  saldoNuevo: number | string | Decimal;
}

export class PDFService {
  /**
   * Genera un comprobante PDF para una recarga aprobada
   * @param data - Datos de la recarga
   * @returns Buffer del PDF generado
   */
  static async generateRecargaComprobante(data: RecargaComprobanteData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Comprobante de Recarga - ${data.numeroOperacion}`,
            Author: 'EfectivoYa',
            Subject: 'Comprobante de Recarga'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Colores de la marca
        const primaryColor = '#e83733';
        const secondaryColor = '#dc993c';
        const textColor = '#1f1f1f';
        const grayColor = '#acacae';

        // Header
        doc.fontSize(28)
          .fillColor(textColor)
          .text('Efectivo', 50, 50, { continued: true })
          .fillColor(primaryColor)
          .text('Ya');

        doc.fontSize(10)
          .fillColor(grayColor)
          .text('Tu Dinero Al Instante', 50, 85);

        // Título del comprobante
        doc.moveDown(2);
        doc.fontSize(20)
          .fillColor(textColor)
          .text('COMPROBANTE DE RECARGA', { align: 'center' });

        // Línea decorativa
        doc.moveDown(0.5);
        doc.strokeColor(secondaryColor)
          .lineWidth(2)
          .moveTo(150, doc.y)
          .lineTo(450, doc.y)
          .stroke();

        // Número de operación y fecha
        doc.moveDown(1.5);
        doc.fontSize(12)
          .fillColor(grayColor)
          .text('Número de Operación:', 50, doc.y, { continued: true })
          .fillColor(textColor)
          .text(`  ${data.numeroOperacion}`);

        doc.fontSize(12)
          .fillColor(grayColor)
          .text('Fecha y Hora:', 50, doc.y + 5, { continued: true })
          .fillColor(textColor)
          .text(`  ${Formatters.formatDate(data.fecha)}`);

        // Sección: Datos del Usuario
        doc.moveDown(1.5);
        doc.fontSize(14)
          .fillColor(primaryColor)
          .text('DATOS DEL USUARIO');

        doc.strokeColor(grayColor)
          .lineWidth(0.5)
          .moveTo(50, doc.y + 5)
          .lineTo(550, doc.y + 5)
          .stroke();

        doc.moveDown(0.5);
        const userY = doc.y;
        doc.fontSize(11)
          .fillColor(grayColor)
          .text('Nombre:', 50, userY);
        doc.fillColor(textColor)
          .text(`${data.usuario.nombres} ${data.usuario.apellidos}`, 150, userY);

        doc.fillColor(grayColor)
          .text('DNI:', 50, userY + 20);
        doc.fillColor(textColor)
          .text(data.usuario.dni, 150, userY + 20);

        doc.fillColor(grayColor)
          .text('Email:', 50, userY + 40);
        doc.fillColor(textColor)
          .text(data.usuario.email, 150, userY + 40);

        // Sección: Detalle de la Operación
        doc.moveDown(4);
        doc.fontSize(14)
          .fillColor(primaryColor)
          .text('DETALLE DE LA OPERACIÓN');

        doc.strokeColor(grayColor)
          .lineWidth(0.5)
          .moveTo(50, doc.y + 5)
          .lineTo(550, doc.y + 5)
          .stroke();

        doc.moveDown(0.5);
        const detailY = doc.y;

        const addDetailRow = (label: string, value: string, yOffset: number, highlight = false) => {
          doc.fontSize(11)
            .fillColor(grayColor)
            .text(label, 50, detailY + yOffset);
          doc.fillColor(highlight ? primaryColor : textColor)
            .fontSize(highlight ? 12 : 11)
            .text(value, 300, detailY + yOffset, { align: 'right', width: 250 });
        };

        addDetailRow('Banco de Origen:', data.bancoOrigen, 0);
        addDetailRow('Monto Depositado:', Formatters.formatCurrency(data.montoDepositado), 25);
        addDetailRow(`Comisión (${data.porcentajeComision}%):`, `- ${Formatters.formatCurrency(data.comisionCalculada)}`, 50);

        // Línea separadora
        doc.strokeColor(grayColor)
          .lineWidth(0.5)
          .moveTo(50, detailY + 80)
          .lineTo(550, detailY + 80)
          .stroke();

        addDetailRow('MONTO ACREDITADO:', Formatters.formatCurrency(data.montoNeto), 90, true);

        // Sección: Saldo
        doc.moveDown(7);
        doc.fontSize(14)
          .fillColor(primaryColor)
          .text('INFORMACIÓN DE SALDO');

        doc.strokeColor(grayColor)
          .lineWidth(0.5)
          .moveTo(50, doc.y + 5)
          .lineTo(550, doc.y + 5)
          .stroke();

        doc.moveDown(0.5);
        const saldoY = doc.y;

        doc.fontSize(11)
          .fillColor(grayColor)
          .text('Saldo Anterior:', 50, saldoY);
        doc.fillColor(textColor)
          .text(Formatters.formatCurrency(data.saldoAnterior), 300, saldoY, { align: 'right', width: 250 });

        doc.fillColor(grayColor)
          .text('Monto Acreditado:', 50, saldoY + 25);
        doc.fillColor(textColor)
          .text(`+ ${Formatters.formatCurrency(data.montoNeto)}`, 300, saldoY + 25, { align: 'right', width: 250 });

        doc.strokeColor(grayColor)
          .lineWidth(0.5)
          .moveTo(300, saldoY + 50)
          .lineTo(550, saldoY + 50)
          .stroke();

        doc.fontSize(12)
          .fillColor(grayColor)
          .text('SALDO ACTUAL:', 50, saldoY + 60);
        doc.fillColor(primaryColor)
          .fontSize(14)
          .text(Formatters.formatCurrency(data.saldoNuevo), 300, saldoY + 58, { align: 'right', width: 250 });

        // Footer
        const footerY = 750;
        doc.fontSize(9)
          .fillColor(grayColor)
          .text('Este comprobante es un documento digital válido generado por EfectivoYa.', 50, footerY, { align: 'center' });
        doc.text('Para cualquier consulta, contacta a soporte@efectivoya.com', 50, footerY + 15, { align: 'center' });
        doc.text(`Generado el ${Formatters.formatDate(new Date())}`, 50, footerY + 30, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
