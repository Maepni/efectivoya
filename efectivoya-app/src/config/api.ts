import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getDevApiUrl = () => {
  // 1. Override explicito via env var
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // 2. Auto-detectar IP del dev server (Expo Go en dispositivo fisico)
  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000`;
  }

  // 3. Fallback para emulador/web
  return Platform.select({
    android: 'http://10.0.2.2:3000',
    ios: 'http://localhost:3000',
    default: 'http://localhost:3000',
  })!;
};

const PROD_API_URL = 'https://api.efectivoya.com';

export const API_URL = __DEV__ ? getDevApiUrl() : PROD_API_URL;
export const SOCKET_URL = API_URL;
