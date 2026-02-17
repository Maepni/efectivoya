export class Validators {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidDNI(dni: string): boolean {
    return /^\d{8}$/.test(dni);
  }

  static isValidWhatsApp(whatsapp: string): boolean {
    return /^\d{9}$/.test(whatsapp);
  }

  static isValidPassword(password: string): boolean {
    // Min 8 chars, 1 uppercase, 1 number, 1 symbol
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return hasMinLength && hasUppercase && hasNumber && hasSymbol;
  }

  static getExpectedCuentaLength(banco?: string, tipoCuenta?: string): number[] {
    switch (banco) {
      case 'BCP':
        if (tipoCuenta === 'ahorros') return [14];
        if (tipoCuenta === 'corriente') return [13];
        return [13, 14];
      case 'Interbank':
        return [13];
      case 'Scotiabank':
        return [10];
      case 'BBVA':
        return [18];
      default:
        return [10, 13, 14, 18];
    }
  }

  static getNumeroCuentaErrorMessage(banco?: string, tipoCuenta?: string): string {
    const lengths = Validators.getExpectedCuentaLength(banco, tipoCuenta);
    switch (banco) {
      case 'BCP':
        if (tipoCuenta === 'ahorros') return 'Cuenta BCP ahorros debe tener 14 dígitos';
        if (tipoCuenta === 'corriente') return 'Cuenta BCP corriente debe tener 13 dígitos';
        return 'Cuenta BCP debe tener 13 dígitos (corriente) o 14 dígitos (ahorros)';
      case 'Interbank':
        return 'Cuenta Interbank debe tener 13 dígitos';
      case 'Scotiabank':
        return 'Cuenta Scotiabank debe tener 10 dígitos';
      case 'BBVA':
        return 'Cuenta BBVA debe tener 18 dígitos';
      default:
        return `Número de cuenta debe tener ${lengths.join(' o ')} dígitos`;
    }
  }

  static isValidNumeroCuenta(cuenta: string, banco?: string, tipoCuenta?: string): boolean {
    if (!/^\d+$/.test(cuenta)) return false;
    const validLengths = Validators.getExpectedCuentaLength(banco, tipoCuenta);
    return validLengths.includes(cuenta.length);
  }

  static isValidCCI(cci: string): boolean {
    return /^\d{20}$/.test(cci);
  }

  static sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, '');
  }
}
