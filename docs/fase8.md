# FASE 8: Frontend React Native + Expo (Android, iOS, Web) - EfectivoYa

## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

IMPORTANTE: Las FASES 1-7 ya están completadas. Tienes un backend completo con:
- API REST completa ✅
- Sistema de autenticación JWT ✅
- Recargas y retiros ✅
- Panel administrativo ✅
- Chat en tiempo real con Socket.io ✅
- Notificaciones push con Firebase ✅

## OBJETIVO DE ESTA FASE
Crear aplicación móvil multiplataforma (Android, iOS, Web) con React Native + Expo que consuma el backend existente.

## ARQUITECTURA GENERAL

**Stack Técnico:**
- React Native + Expo (SDK 51+)
- TypeScript
- React Navigation 6
- Context API para estado global
- Axios para peticiones HTTP
- Socket.io Client para chat en tiempo real
- Expo Notifications para push notifications
- React Hook Form para formularios
- AsyncStorage para persistencia local
- Expo File System para manejo de archivos/PDFs

**Estructura del Proyecto:**
efectivoya-app/
├── src/
│   ├── components/          # Componentes reutilizables
│   ├── screens/            # Pantallas de la app
│   ├── navigation/         # Configuración de navegación
│   ├── contexts/           # Context API (estado global)
│   ├── services/           # API services, socket, notifications
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utilidades y helpers
│   ├── types/              # TypeScript types
│   ├── constants/          # Constantes (colores, tamaños, etc.)
│   └── assets/             # Imágenes, iconos, fuentes
├── App.tsx
├── app.json
├── package.json
└── tsconfig.json

## INSTRUCCIONES PASO A PASO

### PASO 1: CREAR PROYECTO EXPO
```bash
# Crear proyecto con TypeScript
npx create-expo-app efectivoya-app --template blank-typescript

cd efectivoya-app

# Instalar dependencias necesarias
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install axios socket.io-client
npm install @react-native-async-storage/async-storage
npm install expo-notifications expo-device expo-constants
npm install react-hook-form
npm install expo-file-system expo-sharing
npm install @expo/vector-icons
npm install expo-image-picker
npm install expo-linear-gradient
```

### PASO 2: CONFIGURAR APP.JSON

Actualiza `app.json`:
```json
{
  "expo": {
    "name": "EfectivoYa",
    "slug": "efectivoya-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#e83733"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.efectivoya.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Esta app necesita acceso a la cámara para subir comprobantes de recarga.",
        "NSPhotoLibraryUsageDescription": "Esta app necesita acceso a tu galería para subir comprobantes de recarga."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.efectivoya.app",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#e83733"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "tu-project-id"
      }
    }
  }
}
```

### PASO 3: TIPOS Y CONSTANTES

**src/types/index.ts:**
```typescript
// Tipos de Usuario
export interface User {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  dni: string;
  whatsapp: string;
  saldo_actual: number;
  codigo_referido: string;
  email_verificado: boolean;
  is_active: boolean;
  created_at: string;
}

// Tipos de Autenticación
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

export interface RegisterData {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  dni: string;
  whatsapp: string;
  codigo_referido?: string;
}

// Tipos de Banco
export interface UserBank {
  id: string;
  banco: 'BCP' | 'Interbank' | 'Scotiabank' | 'BBVA';
  numero_cuenta: string;
  numero_cuenta_enmascarado: string;
  cci: string;
  cci_enmascarado: string;
  alias: string;
  created_at: string;
}

// Tipos de Recarga
export interface Recarga {
  id: string;
  numero_operacion: string;
  banco_origen: string;
  monto_depositado: number;
  comision_calculada: number;
  monto_neto: number;
  boucher_url?: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo?: string;
  comprobante_pdf_url?: string;
  created_at: string;
  processed_at?: string;
}

// Tipos de Retiro
export interface Retiro {
  id: string;
  numero_operacion: string;
  monto: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  motivo_rechazo?: string;
  comprobante_pdf_url?: string;
  created_at: string;
  processed_at?: string;
  banco: {
    banco: string;
    alias: string;
    numero_cuenta_enmascarado: string;
  };
}

// Tipos de Dashboard
export interface DashboardData {
  saldo_disponible: number;
  este_mes: {
    total_recargado: number;
    total_retirado: number;
    cantidad_recargas: number;
    cantidad_retiros: number;
  };
  ultimas_operaciones: Array<{
    tipo: 'recarga' | 'retiro';
    id: string;
    numero_operacion: string;
    monto: number;
    estado: string;
    created_at: string;
  }>;
  referidos: {
    codigo_propio: string;
    cantidad_referidos: number;
    max_referidos: number;
    bonos_ganados: number;
  };
}

// Tipos de Chat
export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_type: 'user' | 'admin';
  sender_id: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
}

export interface Chat {
  id: string;
  estado: 'abierto' | 'cerrado';
  created_at: string;
  updated_at: string;
}

// Tipos de API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items?: T[];
    [key: string]: any;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}
```

**src/constants/colors.ts:**
```typescript
export const Colors = {
  // Principales
  primary: '#e83733',      // Rojo principal
  secondary: '#dc993c',    // Dorado
  accent: '#1f1f1f',       // Negro
  
  // Grises
  gray: '#acacae',
  lightGray: '#f4f4f4',
  darkGray: '#5c5c5c',
  
  // Estados
  success: '#10B981',
  warning: '#ffc107',
  error: '#e83733',
  info: '#3b82f6',
  
  // Fondos
  background: '#ffffff',
  backgroundGray: '#f9f9f9',
  
  // Textos
  text: '#1f1f1f',
  textLight: '#acacae',
  textWhite: '#ffffff',
  
  // Bordes
  border: '#e0e0e0',
  
  // Transparencias
  overlay: 'rgba(0, 0, 0, 0.5)',
  primaryLight: 'rgba(232, 55, 51, 0.1)',
};
```

**src/constants/layout.ts:**
```typescript
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const Layout = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
};
```

### PASO 4: CONFIGURACIÓN DE API

**src/config/api.ts:**
```typescript
// Cambia esta URL según tu entorno
export const API_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Desarrollo
  : 'https://api.efectivoya.com/api';  // Producción

export const SOCKET_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.efectivoya.com';
```

### PASO 5: SERVICIO DE API

**src/services/api.service.ts:**
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import { ApiResponse } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para agregar token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor para manejar errores
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expirado, limpiar y redirigir a login
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        }
        return Promise.reject(error);
      }
    );
  }

  // GET
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.api.get(url, { params });
    return response.data;
  }

  // POST
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.post(url, data);
    return response.data;
  }

  // PATCH
  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.patch(url, data);
    return response.data;
  }

  // DELETE
  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.api.delete(url);
    return response.data;
  }

  // Upload de archivos
  async uploadFile<T = any>(
    url: string,
    file: {
      uri: string;
      name: string;
      type: string;
    },
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

export default new ApiService();
```

### PASO 6: SERVICIO DE AUTENTICACIÓN

**src/services/auth.service.ts:**
```typescript
import ApiService from './api.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginResponse, RegisterData, User } from '../types';

class AuthService {
  /**
   * Login
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await ApiService.post<LoginResponse['data']>('/auth/login', {
      email,
      password,
    });

    if (response.success && response.data) {
      // Guardar tokens y usuario
      await AsyncStorage.setItem('accessToken', response.data.accessToken);
      await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  }

  /**
   * Registro
   */
  async register(data: RegisterData): Promise<any> {
    return await ApiService.post('/auth/register', data);
  }

  /**
   * Verificar OTP
   */
  async verifyOTP(email: string, otp: string): Promise<LoginResponse> {
    const response = await ApiService.post<LoginResponse['data']>('/auth/verify-email', {
      email,
      otp,
    });

    if (response.success && response.data) {
      await AsyncStorage.setItem('accessToken', response.data.accessToken);
      await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as LoginResponse;
  }

  /**
   * Reenviar OTP
   */
  async resendOTP(email: string): Promise<any> {
    return await ApiService.post('/auth/resend-otp', { email });
  }

  /**
   * Recuperar contraseña
   */
  async forgotPassword(email: string): Promise<any> {
    return await ApiService.post('/auth/forgot-password', { email });
  }

  /**
   * Restablecer contraseña
   */
  async resetPassword(token: string, newPassword: string): Promise<any> {
    return await ApiService.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  }

  /**
   * Obtener perfil
   */
  async getProfile(): Promise<User> {
    const response = await ApiService.get<{ user: User }>('/auth/profile');
    
    if (response.success && response.data) {
      // Actualizar usuario en storage
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data.user;
    }

    throw new Error('Error al obtener perfil');
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await ApiService.post('/auth/logout');
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  }

  /**
   * Obtener usuario del storage
   */
  async getCurrentUser(): Promise<User | null> {
    const userJson = await AsyncStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Verificar si está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('accessToken');
    return !!token;
  }
}

export default new AuthService();
```

### PASO 7: SERVICIO DE SOCKET

**src/services/socket.service.ts:**
```typescript
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../config/api';
import { ChatMessage } from '../types';

type MessageCallback = (message: ChatMessage) => void;
type ErrorCallback = (error: any) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageCallbacks: MessageCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];

  /**
   * Conectar al servidor de sockets
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('Socket ya está conectado');
      return;
    }

    const token = await AsyncStorage.getItem('accessToken');
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  /**
   * Configurar event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket conectado');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket desconectado');
    });

    this.socket.on('new_message', (message: ChatMessage) => {
      this.messageCallbacks.forEach(callback => callback(message));
    });

    this.socket.on('message_sent', (message: ChatMessage) => {
      this.messageCallbacks.forEach(callback => callback(message));
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.errorCallbacks.forEach(callback => callback(error));
    });
  }

  /**
   * Enviar mensaje
   */
  sendMessage(chatId: string, mensaje: string): void {
    if (!this.socket?.connected) {
      throw new Error('Socket no está conectado');
    }

    this.socket.emit('send_message', {
      chat_id: chatId,
      mensaje,
    });
  }

  /**
   * Marcar mensajes como leídos
   */
  markAsRead(chatId: string): void {
    if (!this.socket?.connected) return;
    this.socket.emit('mark_as_read', chatId);
  }

  /**
   * Obtener historial de chat
   */
  getChatHistory(chatId: string, callback: (data: any) => void): void {
    if (!this.socket?.connected) {
      throw new Error('Socket no está conectado');
    }

    this.socket.emit('get_chat_history', chatId, callback);
  }

  /**
   * Suscribirse a nuevos mensajes
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.push(callback);
    
    // Retornar función para desuscribirse
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Suscribirse a errores
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.messageCallbacks = [];
      this.errorCallbacks = [];
    }
  }

  /**
   * Verificar si está conectado
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default new SocketService();

**src/services/notifications.service.ts:**
```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import ApiService from './api.service';

// Configurar cómo se muestran las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationsService {
  /**
   * Registrar para notificaciones push
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Las notificaciones push solo funcionan en dispositivos físicos');
      return null;
    }

    // Verificar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('No se otorgaron permisos para notificaciones');
      return null;
    }

    // Obtener token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.log('No se encontró projectId en la configuración');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    // Configurar canal de notificaciones en Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('efectivoya_notifications', {
        name: 'EfectivoYa Notificaciones',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e83733',
      });
    }

    return token.data;
  }

  /**
   * Enviar token al servidor
   */
  async sendTokenToServer(token: string): Promise<void> {
    try {
      await ApiService.post('/notifications/register-token', {
        push_token: token,
      });
      console.log('Token enviado al servidor');
    } catch (error) {
      console.error('Error al enviar token:', error);
    }
  }

  /**
   * Configurar listeners de notificaciones
   */
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void
  ) {
    // Cuando se recibe una notificación mientras la app está abierta
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Cuando el usuario toca una notificación
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      onNotificationTapped
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }

  /**
   * Mostrar notificación local
   */
  async showLocalNotification(title: string, body: string, data?: any): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Mostrar inmediatamente
    });
  }
}

export default new NotificationsService();
```

### PASO 9: CONTEXT API - AUTH CONTEXT

**src/contexts/AuthContext.tsx:**
```typescript
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AuthService from '../services/auth.service';
import NotificationsService from '../services/notifications.service';
import SocketService from '../services/socket.service';
import { User, LoginResponse, RegisterData } from '../types';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  // Cargar usuario del storage
  const loadStoredUser = async () => {
    try {
      const storedUser = await AuthService.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
        await initializeServices();
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  // Inicializar servicios (socket, notificaciones)
  const initializeServices = async () => {
    try {
      // Conectar socket
      await SocketService.connect();

      // Registrar notificaciones push
      const pushToken = await NotificationsService.registerForPushNotifications();
      if (pushToken) {
        await NotificationsService.sendTokenToServer(pushToken);
      }
    } catch (error) {
      console.error('Error al inicializar servicios:', error);
    }
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login(email, password);
      setUser(response.data.user);
      await initializeServices();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  // Registro
  const register = async (data: RegisterData) => {
    try {
      await AuthService.register(data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al registrarse');
    }
  };

  // Verificar OTP
  const verifyOTP = async (email: string, otp: string) => {
    try {
      const response = await AuthService.verifyOTP(email, otp);
      setUser(response.data.user);
      await initializeServices();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Código OTP inválido');
    }
  };

  // Logout
  const logout = async () => {
    try {
      await AuthService.logout();
      SocketService.disconnect();
      setUser(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Refrescar datos del usuario
  const refreshUser = async () => {
    try {
      const updatedUser = await AuthService.getProfile();
      setUser(updatedUser);
    } catch (error) {
      console.error('Error al refrescar usuario:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyOTP,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
```

### PASO 10: COMPONENTES REUTILIZABLES

**src/components/Button.tsx:**
```typescript
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'outline' && styles.outlineButton,
        isDisabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? Colors.primary : Colors.textWhite}
        />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'primary' && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            variant === 'outline' && styles.outlineText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
  primaryText: {
    color: Colors.textWhite,
  },
  secondaryText: {
    color: Colors.textWhite,
  },
  outlineText: {
    color: Colors.primary,
  },
});
```

**src/components/Input.tsx:**
```typescript
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  secureTextEntry = false,
  ...props
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={Colors.gray}
            style={styles.icon}
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.gray}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color={Colors.gray}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Layout.spacing.md,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundGray,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Layout.spacing.md,
  },
  inputError: {
    borderColor: Colors.error,
  },
  icon: {
    marginRight: Layout.spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
  eyeIcon: {
    padding: Layout.spacing.xs,
  },
  errorText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.error,
    marginTop: Layout.spacing.xs,
  },
});
```

**src/components/Card.tsx:**
```typescript
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
```

**src/components/LoadingScreen.tsx:**
```typescript
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export const LoadingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
```

### PASO 11: PANTALLAS DE AUTENTICACIÓN

**src/screens/LoginScreen.tsx:**
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    const newErrors: any = {};

    if (!email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            Efectivo<Text style={styles.titleAccent}>Ya</Text>
          </Text>
          <Text style={styles.subtitle}>Tu Dinero Al Instante</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
            error={errors.email}
          />

          <Input
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon="lock-closed"
            error={errors.password}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <Button
            title="Iniciar Sesión"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Layout.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl * 2,
  },
  title: {
    fontSize: Layout.fontSize.xxl * 1.5,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  titleAccent: {
    color: Colors.primary,
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
  },
  form: {
    width: '100%',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: Layout.spacing.lg,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
  },
  loginButton: {
    marginTop: Layout.spacing.md,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Layout.spacing.lg,
  },
  registerText: {
    color: Colors.gray,
    fontSize: Layout.fontSize.sm,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
});
```

**src/screens/RegisterScreen.tsx:**
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    password: '',
    confirmPassword: '',
    dni: '',
    whatsapp: '',
    codigo_referido: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: any = {};

    if (!formData.nombres) newErrors.nombres = 'Nombres requeridos';
    if (!formData.apellidos) newErrors.apellidos = 'Apellidos requeridos';
    if (!formData.email) {
      newErrors.email = 'Email requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.password) {
      newErrors.password = 'Contraseña requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (!formData.dni) {
      newErrors.dni = 'DNI requerido';
    } else if (formData.dni.length !== 8) {
      newErrors.dni = 'DNI debe tener 8 dígitos';
    }
    if (!formData.whatsapp) {
      newErrors.whatsapp = 'WhatsApp requerido';
    } else if (formData.whatsapp.length !== 9) {
      newErrors.whatsapp = 'WhatsApp debe tener 9 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        email: formData.email,
        password: formData.password,
        dni: formData.dni,
        whatsapp: formData.whatsapp,
        codigo_referido: formData.codigo_referido || undefined,
      });

      Alert.alert(
        'Registro Exitoso',
        'Te hemos enviado un código de verificación a tu email',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('VerifyOTP', { email: formData.email }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Completa tus datos para comenzar</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nombres"
            placeholder="Tus nombres"
            value={formData.nombres}
            onChangeText={(value) => updateField('nombres', value)}
            icon="person"
            error={errors.nombres}
          />

          <Input
            label="Apellidos"
            placeholder="Tus apellidos"
            value={formData.apellidos}
            onChangeText={(value) => updateField('apellidos', value)}
            icon="person"
            error={errors.apellidos}
          />

          <Input
            label="Email"
            placeholder="tu@email.com"
            value={formData.email}
            onChangeText={(value) => updateField('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
            error={errors.email}
          />

          <Input
            label="DNI"
            placeholder="12345678"
            value={formData.dni}
            onChangeText={(value) => updateField('dni', value)}
            keyboardType="number-pad"
            maxLength={8}
            icon="card"
            error={errors.dni}
          />

          <Input
            label="WhatsApp"
            placeholder="987654321"
            value={formData.whatsapp}
            onChangeText={(value) => updateField('whatsapp', value)}
            keyboardType="phone-pad"
            maxLength={9}
            icon="logo-whatsapp"
            error={errors.whatsapp}
          />

          <Input
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            onChangeText={(value) => updateField('password', value)}
            secureTextEntry
            icon="lock-closed"
            error={errors.password}
          />

          <Input
            label="Confirmar Contraseña"
            placeholder="Repite tu contraseña"
            value={formData.confirmPassword}
            onChangeText={(value) => updateField('confirmPassword', value)}
            secureTextEntry
            icon="lock-closed"
            error={errors.confirmPassword}
          />

          <Input
            label="Código de Referido (Opcional)"
            placeholder="EFECTIVO-XXXXX"
            value={formData.codigo_referido}
            onChangeText={(value) => updateField('codigo_referido', value)}
            autoCapitalize="characters"
            icon="gift"
          />

          <Button
            title="Registrarse"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Layout.spacing.lg,
  },
  header: {
    marginBottom: Layout.spacing.xl,
    marginTop: Layout.spacing.lg,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  subtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
  },
  form: {
    width: '100%',
  },
  registerButton: {
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
});

**src/screens/VerifyOTPScreen.tsx:**
```typescript
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import AuthService from '../services/auth.service';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export const VerifyOTPScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { verifyOTP } = useAuth();
  const { email } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Por favor ingresa el código completo');
      return;
    }

    setLoading(true);
    try {
      await verifyOTP(email, otpCode);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await AuthService.resendOTP(email);
      Alert.alert('Éxito', 'Código reenviado a tu email');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verificación</Text>
        <Text style={styles.subtitle}>
          Ingresa el código de 6 dígitos enviado a{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>
      </View>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={styles.otpInput}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <Button
        title="Verificar"
        onPress={handleVerify}
        loading={loading}
        style={styles.verifyButton}
      />

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>¿No recibiste el código? </Text>
        <TouchableOpacity onPress={handleResend} disabled={resending}>
          <Text style={styles.resendLink}>
            {resending ? 'Reenviando...' : 'Reenviar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Layout.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl * 2,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.sm,
  },
  subtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  email: {
    color: Colors.primary,
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xl,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    fontSize: Layout.fontSize.xl,
    textAlign: 'center',
    color: Colors.text,
    fontWeight: 'bold',
  },
  verifyButton: {
    marginBottom: Layout.spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: Colors.gray,
    fontSize: Layout.fontSize.sm,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
});
```

### PASO 13: PANTALLA DE DASHBOARD

**src/screens/DashboardScreen.tsx:**
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';
import { LoadingScreen } from '../components/LoadingScreen';
import ApiService from '../services/api.service';
import { DashboardData } from '../types';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await ApiService.get<DashboardData>('/user/dashboard');
      if (response.success && response.data) {
        setDashboard(response.data);
      }
      await refreshUser();
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header con saludo */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.userName}>{user?.nombres}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Saldo disponible */}
      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Disponible</Text>
        <Text style={styles.balanceAmount}>
          S/. {dashboard?.saldo_disponible.toFixed(2)}
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rechargeButton]}
            onPress={() => navigation.navigate('Recargas')}
          >
            <Ionicons name="add-circle" size={20} color={Colors.textWhite} />
            <Text style={styles.actionButtonText}>Recargar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.withdrawButton]}
            onPress={() => navigation.navigate('Retiros')}
          >
            <Ionicons name="arrow-down-circle" size={20} color={Colors.textWhite} />
            <Text style={styles.actionButtonText}>Retirar</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Estadísticas del mes */}
      <Card style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Este Mes</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Recargado</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              +S/. {dashboard?.este_mes.total_recargado.toFixed(2)}
            </Text>
            <Text style={styles.statCount}>
              {dashboard?.este_mes.cantidad_recargas} operaciones
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Retirado</Text>
            <Text style={[styles.statValue, { color: Colors.error }]}>
              -S/. {dashboard?.este_mes.total_retirado.toFixed(2)}
            </Text>
            <Text style={styles.statCount}>
              {dashboard?.este_mes.cantidad_retiros} operaciones
            </Text>
          </View>
        </View>
      </Card>

      {/* Últimas operaciones */}
      <Card style={styles.operationsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Últimas Operaciones</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Historial')}>
            <Text style={styles.seeAllText}>Ver todo</Text>
          </TouchableOpacity>
        </View>

        {dashboard?.ultimas_operaciones.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={Colors.gray} />
            <Text style={styles.emptyText}>No tienes operaciones aún</Text>
          </View>
        ) : (
          dashboard?.ultimas_operaciones.map((op) => (
            <View key={op.id} style={styles.operationItem}>
              <View
                style={[
                  styles.operationIcon,
                  op.tipo === 'recarga'
                    ? styles.rechargeIcon
                    : styles.withdrawIcon,
                ]}
              >
                <Ionicons
                  name={
                    op.tipo === 'recarga'
                      ? 'arrow-down-circle'
                      : 'arrow-up-circle'
                  }
                  size={24}
                  color={Colors.textWhite}
                />
              </View>
              <View style={styles.operationDetails}>
                <Text style={styles.operationType}>
                  {op.tipo === 'recarga' ? 'Recarga' : 'Retiro'}
                </Text>
                <Text style={styles.operationNumber}>{op.numero_operacion}</Text>
              </View>
              <View style={styles.operationRight}>
                <Text
                  style={[
                    styles.operationAmount,
                    op.tipo === 'recarga'
                      ? { color: Colors.success }
                      : { color: Colors.error },
                  ]}
                >
                  {op.tipo === 'recarga' ? '+' : '-'}S/. {op.monto.toFixed(2)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    op.estado === 'aprobado' && styles.statusApproved,
                    op.estado === 'pendiente' && styles.statusPending,
                    op.estado === 'rechazado' && styles.statusRejected,
                  ]}
                >
                  <Text style={styles.statusText}>{op.estado}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Referidos */}
      <Card style={styles.referralCard}>
        <View style={styles.referralHeader}>
          <Ionicons name="gift" size={32} color={Colors.secondary} />
          <Text style={styles.referralTitle}>Invita y Gana</Text>
        </View>
        <Text style={styles.referralSubtitle}>
          Comparte tu código y gana S/. 10 por cada amigo que se registre
        </Text>
        <View style={styles.referralCodeContainer}>
          <Text style={styles.referralCodeLabel}>Tu código:</Text>
          <Text style={styles.referralCode}>
            {dashboard?.referidos.codigo_propio}
          </Text>
        </View>
        <View style={styles.referralStats}>
          <View style={styles.referralStatItem}>
            <Text style={styles.referralStatValue}>
              {dashboard?.referidos.cantidad_referidos}
            </Text>
            <Text style={styles.referralStatLabel}>Referidos</Text>
          </View>
          <View style={styles.referralStatItem}>
            <Text style={styles.referralStatValue}>
              S/. {dashboard?.referidos.bonos_ganados.toFixed(2)}
            </Text>
            <Text style={styles.referralStatLabel}>Ganados</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => {
            // TODO: Implementar compartir código
          }}
        >
          <Ionicons name="share-social" size={20} color={Colors.textWhite} />
          <Text style={styles.shareButtonText}>Compartir Código</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background,
  },
  greeting: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
  },
  userName: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    margin: Layout.spacing.lg,
    backgroundColor: Colors.primary,
  },
  balanceLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textWhite,
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: Layout.fontSize.xxl * 1.5,
    fontWeight: 'bold',
    color: Colors.textWhite,
    marginVertical: Layout.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: Layout.spacing.md,
    gap: Layout.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    gap: Layout.spacing.sm,
  },
  rechargeButton: {
    backgroundColor: Colors.success,
  },
  withdrawButton: {
    backgroundColor: Colors.secondary,
  },
  actionButtonText: {
    color: Colors.textWhite,
    fontWeight: '600',
    fontSize: Layout.fontSize.md,
  },
  statsCard: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Layout.spacing.md,
  },
  statLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.xs,
  },
  statValue: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    marginBottom: Layout.spacing.xs,
  },
  statCount: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },
  operationsCard: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  emptyText: {
    color: Colors.gray,
    fontSize: Layout.fontSize.sm,
    marginTop: Layout.spacing.sm,
  },
  operationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  operationIcon: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  rechargeIcon: {
    backgroundColor: Colors.success,
  },
  withdrawIcon: {
    backgroundColor: Colors.secondary,
  },
  operationDetails: {
    flex: 1,
  },
  operationType: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
  },
  operationNumber: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  operationRight: {
    alignItems: 'flex-end',
  },
  operationAmount: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    marginBottom: Layout.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  statusApproved: {
    backgroundColor: Colors.success + '20',
  },
  statusPending: {
    backgroundColor: Colors.warning + '20',
  },
  statusRejected: {
    backgroundColor: Colors.error + '20',
  },
  statusText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  referralCard: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.xl,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  referralTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    marginLeft: Layout.spacing.sm,
  },
  referralSubtitle: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.md,
  },
  referralCodeContainer: {
    backgroundColor: Colors.lightGray,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.md,
  },
  referralCodeLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginBottom: Layout.spacing.xs,
  },
  referralCode: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 2,
  },
  referralStats: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.md,
  },
  referralStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  referralStatValue: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  referralStatLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  shareButtonText: {
    color: Colors.textWhite,
    fontWeight: '600',
    fontSize: Layout.fontSize.md,
  },
});
```

### PASO 14: NAVEGACIÓN

**src/navigation/AppNavigator.tsx:**
```typescript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { Colors } from '../constants/colors';

// Auth Screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { VerifyOTPScreen } from '../screens/VerifyOTPScreen';

// Main Screens
import { DashboardScreen } from '../screens/DashboardScreen';

// Placeholder screens (implementar después)
const RecargasScreen = () => null;
const RetirosScreen = () => null;
const ChatScreen = () => null;
const PerfilScreen = () => null;

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Recargas') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Retiros') {
            iconName = focused ? 'arrow-down-circle' : 'arrow-down-circle-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen
        name="Recargas"
        component={RecargasScreen}
        options={{ tabBarLabel: 'Recargar' }}
      />
      <Tab.Screen
        name="Retiros"
        component={RetirosScreen}
        options={{ tabBarLabel: 'Retirar' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ tabBarLabel: 'Soporte' }}
      />
      <Tab.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
};

// App Navigator
export const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
          </>
        ) : (
          // Main Stack
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### PASO 15: APP.TSX FINAL

**App.tsx:**
```typescript
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import NotificationsService from './src/services/notifications.service';

export default function App() {
  useEffect(() => {
    // Configurar listeners de notificaciones
    const unsubscribe = NotificationsService.setupNotificationListeners(
      (notification) => {
        console.log('Notificación recibida:', notification);
      },
      (response) => {
        console.log('Notificación tocada:', response);
        // TODO: Navegar según el tipo de notificación
      }
    );

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

### PASO 16: CONFIGURACIÓN DE TYPESCRIPT

**tsconfig.json:**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

### PASO 17: PACKAGE.JSON FINAL

**package.json (scripts):**
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "build:all": "eas build --platform all"
  }
}
```

## INSTRUCCIONES DE COMPILACIÓN Y DEPLOYMENT

### DESARROLLO LOCAL
```bash
# 1. Instalar dependencias
cd efectivoya-app
npm install

# 2. Iniciar en modo desarrollo
npm start

# 3. Escanear QR con Expo Go (Android/iOS)
# O presionar 'a' para Android emulator
# O presionar 'i' para iOS simulator
# O presionar 'w' para web browser
```

### CONFIGURAR FIREBASE PARA NOTIFICACIONES
```bash
# 1. Descargar google-services.json de Firebase Console
# 2. Colocarlo en la raíz del proyecto efectivoya-app/

# Para iOS, descargar GoogleService-Info.plist
# y colocarlo también en la raíz
```

### BUILD PARA PRODUCCIÓN

**Instalar EAS CLI:**
```bash
npm install -g eas-cli
eas login
```

**Configurar EAS:**
```bash
eas build:configure
```

Esto crea **eas.json**:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Build Android APK (para pruebas):**
```bash
eas build --platform android --profile preview
```

**Build Android AAB (para Google Play):**
```bash
eas build --platform android --profile production
```

**Build iOS (para App Store):**
```bash
eas build --platform ios --profile production
```

**Build ambos:**
```bash
eas build --platform all --profile production
```

### PUBLICAR EN STORES

**Google Play Store:**
```bash
# Después de build production
eas submit --platform android
```

**Apple App Store:**
```bash
# Después de build production
eas submit --platform ios
```

### DEPLOYMENT WEB (PWA)
```bash
# Build web
expo export:web

# Deploy a Vercel/Netlify
# Subir carpeta web-build/
```

## VARIABLES DE ENTORNO

Crea **.env** en la raíz:
```env
# API URLs
API_URL_DEV=http://localhost:3000/api
API_URL_PROD=https://api.efectivoya.com/api
SOCKET_URL_DEV=http://localhost:3000
SOCKET_URL_PROD=https://api.efectivoya.com

# EAS Project ID (obtener de expo.dev)
EXPO_PROJECT_ID=tu-project-id-aqui
```

## TESTING

**Probar en dispositivos físicos:**
```bash
# Android
npm run android

# iOS
npm run ios
```

**Probar notificaciones push:**
1. Compilar app en modo development
2. Instalar en dispositivo físico
3. Registrar token
4. Desde backend, aprobar una recarga
5. Debe llegar notificación push

**Probar Socket.io:**
1. Login en la app
2. Ir a pantalla de Chat
3. Enviar mensaje
4. Debe aparecer en tiempo real

## CHECKLIST PRE-LAUNCH
✅ Configurar Firebase (google-services.json)
✅ Actualizar URLs de API en config/api.ts
✅ Probar login/registro completo
✅ Probar recargas (subir voucher, aprobar)
✅ Probar retiros
✅ Probar chat en tiempo real
✅ Probar notificaciones push
✅ Probar en Android físico
✅ Probar en iOS físico
✅ Build de producción exitoso
✅ Iconos y splash screen correctos
✅ Permisos de cámara/galería funcionando
✅ Términos y políticas actualizados

## ESTRUCTURA FINAL DEL PROYECTO
efectivoya-app/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── LoadingScreen.tsx
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── VerifyOTPScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   └── ... (más pantallas)
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── services/
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   ├── socket.service.ts
│   │   └── notifications.service.ts
│   ├── types/
│   │   └── index.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   └── layout.ts
│   └── config/
│       └── api.ts
├── assets/
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
├── App.tsx
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
└── google-services.json

## PRÓXIMOS PASOS DESPUÉS DE ESTA FASE

Después de completar el frontend básico, deberías:

1. **Implementar pantallas faltantes:**
   - RecargasScreen (lista, crear recarga, upload voucher)
   - RetirosScreen (lista, solicitar retiro)
   - ChatScreen (chat en tiempo real)
   - PerfilScreen (editar datos, bancos, cerrar sesión)
   - HistorialScreen (todas las operaciones)

2. **Mejorar UX:**
   - Animaciones con React Native Reanimated
   - Gestos con React Native Gesture Handler
   - Skeletons mientras carga

3. **Optimizaciones:**
   - Caché de imágenes
   - Offline support
   - Reducir tamaño del bundle

4. **Testing:**
   - Unit tests con Jest
   - E2E tests con Detox
   - Performance testing

5. **Analytics:**
   - Integrar Firebase Analytics
   - Tracking de eventos
   - Crashlytics

## RESULTADO ESPERADO

Al finalizar esta fase tendrás:
✅ App móvil multiplataforma (Android, iOS, Web)
✅ Autenticación completa con JWT
✅ Dashboard con estadísticas en tiempo real
✅ Sistema de recargas y retiros
✅ Chat en tiempo real con Socket.io
✅ Notificaciones push con Firebase
✅ Navegación con tabs y stack
✅ Componentes reutilizables
✅ TypeScript en todo el proyecto
✅ Estado global con Context API
✅ Listo para deployment en stores