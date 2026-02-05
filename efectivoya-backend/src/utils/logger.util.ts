export class Logger {
  static info(message: string, ...args: unknown[]) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static error(message: string, ...args: unknown[]) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static warn(message: string, ...args: unknown[]) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static debug(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}
