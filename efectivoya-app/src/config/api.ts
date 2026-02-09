import { Platform } from 'react-native';

const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

const PROD_API_URL = 'https://api.efectivoya.com';

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
export const SOCKET_URL = API_URL;
