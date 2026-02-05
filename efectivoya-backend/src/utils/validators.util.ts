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

  static isValidNumeroCuenta(cuenta: string): boolean {
    return /^\d{13,}$/.test(cuenta);
  }

  static isValidCCI(cci: string): boolean {
    return /^\d{20}$/.test(cci);
  }

  static sanitizeString(str: string): string {
    return str.trim().replace(/[<>]/g, '');
  }
}
