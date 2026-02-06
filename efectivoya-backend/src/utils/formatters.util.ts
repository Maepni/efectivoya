import { Decimal } from '@prisma/client/runtime/library';

/**
 * Utilidades de formateo para EfectivoYa
 */

export class Formatters {
  /**
   * Formatea un monto en soles peruanos
   * @param amount - Monto a formatear (puede ser number, string o Decimal de Prisma)
   * @returns String formateado como "S/. 1,234.56"
   */
  static formatCurrency(amount: number | string | Decimal): string {
    let num: number;
    if (amount instanceof Decimal) {
      num = amount.toNumber();
    } else if (typeof amount === 'string') {
      num = parseFloat(amount);
    } else {
      num = amount;
    }
    return `S/. ${num.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Formatea una fecha a formato peruano
   * @param date - Fecha a formatear
   * @returns String formateado como "05/02/2026 10:30"
   */
  static formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Formatea solo la fecha sin hora
   * @param date - Fecha a formatear
   * @returns String formateado como "05/02/2026"
   */
  static formatDateOnly(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Genera un número de operación único
   * @param prefix - Prefijo para el número (REC para recargas, RET para retiros)
   * @returns Número de operación como "REC-20260205-ABC123"
   */
  static generateNumeroOperacion(prefix: 'REC' | 'RET'): string {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomStr = '';
    for (let i = 0; i < 6; i++) {
      randomStr += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return `${prefix}-${dateStr}-${randomStr}`;
  }

  /**
   * Mascara parcialmente un número de cuenta
   * @param accountNumber - Número de cuenta
   * @returns Número enmascarado como "****1234"
   */
  static maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  }
}
