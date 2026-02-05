export class MaskDataUtil {
  /**
   * Enmascara un número de cuenta mostrando solo los últimos 4 dígitos
   * Ejemplo: "123456789012345" → "****2345"
   */
  static maskCuenta(cuenta: string): string {
    if (!cuenta || cuenta.length < 4) return cuenta;
    return '****' + cuenta.slice(-4);
  }

  /**
   * Enmascara un CCI mostrando solo los últimos 4 dígitos
   * Ejemplo: "12345678901234567890" → "****7890"
   */
  static maskCCI(cci: string): string {
    if (!cci || cci.length < 4) return cci;
    return '****' + cci.slice(-4);
  }

  /**
   * Enmascara un DNI mostrando solo los últimos 3 dígitos
   * Ejemplo: "12345678" → "*****678"
   */
  static maskDNI(dni: string): string {
    if (!dni || dni.length < 3) return dni;
    return '*'.repeat(dni.length - 3) + dni.slice(-3);
  }

  /**
   * Enmascara un email
   * Ejemplo: "juan.perez@gmail.com" → "j***z@gmail.com"
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return local[0] + '***' + local[local.length - 1] + '@' + domain;
  }
}
