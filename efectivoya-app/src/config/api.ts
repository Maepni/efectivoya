import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isLocalIp = (host: string) =>
  host.startsWith('192.168.') ||
  host.startsWith('10.') ||
  host.startsWith('172.') ||
  host === 'localhost';

const getDevApiUrl = () => {
  // 1. Override explicito via env var (.env o EAS)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // 2. Auto-detectar IP del dev server solo si es una IP local (LAN mode)
  // En tunnel mode debuggerHost es algo como "abc.ngrok.io" — no sirve para la API
  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    if (isLocalIp(host)) {
      return `http://${host}:3000`;
    }
  }

  // 3. Fallback para emulador/web
  return Platform.select({
    android: 'http://10.0.2.2:3000',
    ios: 'http://localhost:3000',
    default: 'http://localhost:3000',
  })!;
};

const PROD_API_URL = 'https://api.efectivoya.net';

export const API_URL = __DEV__ ? getDevApiUrl() : PROD_API_URL;
export const SOCKET_URL = API_URL;
