# PANTALLAS FALTANTES - Frontend EfectivoYa

## CONTEXTO DEL PROYECTO
Lee el archivo CLAUDE.md adjunto para contexto completo del proyecto EfectivoYa.

IMPORTANTE: Ya tienes implementado en el frontend:
- ✅ Autenticación completa (Login, Registro, Verificación OTP)
- ✅ Dashboard principal con saldo y estadísticas
- ✅ Tab navigation con 5 tabs
- ✅ Servicios base: api.service.ts, auth.service.ts, socket.service.ts, notifications.service.ts
- ✅ Context API: AuthContext
- ✅ Componentes base: Button, Input, Card, LoadingScreen

## OBJETIVO
Implementar las 4 pantallas faltantes con funcionalidad completa:
1. **RecargasScreen** - Lista de recargas + Crear nueva recarga con upload de voucher
2. **RetirosScreen** - Lista de retiros + Solicitar nuevo retiro
3. **ChatScreen** - Chat en tiempo real con Socket.io
4. **PerfilScreen** - Ver/editar datos, gestionar bancos, cerrar sesión

## CONSIDERACIONES CRÍTICAS DEL PROYECTO

**Del CLAUDE.md - GOTCHAS que DEBES respetar:**
- ✅ `saldo_actual` llega como **string** (Prisma Decimal) → usar `Number()` antes de `.toFixed()`
- ✅ Perfil usuario: `/api/auth/profile` (NO `/api/user/profile`)
- ✅ Campos del usuario: `nombres` y `apellidos` (plural, NO nombre/apellido)
- ✅ Verify OTP: `{ userId, otp }` (NO `{ email, otp }`)
- ✅ `expo-notifications` SDK 54: requiere `shouldShowBanner` + `shouldShowList`
- ✅ Install con `--legacy-peer-deps` por conflicto react 19.1 vs 19.2

**Stack actual:**
- Expo SDK 54, expo-router 6, React Native 0.81
- Zustand 5 (estado global)
- Axios (HTTP)
- socket.io-client (chat)
- TypeScript 5.9

## ESTRUCTURA DEL PROYECTO ACTUAL
efectivoya-app/
├── app/
│   ├── _layout.tsx
│   ├── (auth)/
│   │   ├── login.tsx ✅
│   │   ├── register.tsx ✅
│   │   └── verify-otp.tsx ✅
│   └── (tabs)/
│       ├── _layout.tsx ✅
│       ├── index.tsx (Dashboard) ✅
│       ├── recargas.tsx ⚠️ PLACEHOLDER
│       ├── retiros.tsx ⚠️ PLACEHOLDER
│       ├── chat.tsx ⚠️ PLACEHOLDER
│       └── perfil.tsx ⚠️ PLACEHOLDER
├── src/
│   ├── components/ (Button, Input, Card, LoadingScreen) ✅
│   ├── services/
│   │   ├── api.service.ts ✅
│   │   ├── auth.service.ts ✅
│   │   ├── socket.service.ts ✅
│   │   ├── notifications.service.ts ✅
│   │   ├── recargas.service.ts ❌ CREAR
│   │   ├── retiros.service.ts ❌ CREAR
│   │   └── bancos.service.ts ❌ CREAR
│   ├── store/
│   │   └── useStore.ts ❌ CREAR (Zustand)
│   ├── types/
│   │   └── index.ts (tipos base) ✅
│   ├── constants/ (colors, layout) ✅
│   └── config/ (api.ts) ✅
└── assets/

## INSTRUCCIONES DETALLADAS

### PASO 1: CREAR STORE CON ZUSTAND

**src/store/useStore.ts:**
```typescript
import { create } from 'zustand';
import { User } from '../types';

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  updateSaldo: (nuevoSaldo: number) => void;
  
  // Chat
  unreadMessages: number;
  setUnreadMessages: (count: number) => void;
  incrementUnread: () => void;
  
  // General
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user }),
  updateSaldo: (nuevoSaldo) => 
    set((state) => 
      state.user ? { user: { ...state.user, saldo_actual: nuevoSaldo } } : {}
    ),
  
  // Chat
  unreadMessages: 0,
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  incrementUnread: () => 
    set((state) => ({ unreadMessages: state.unreadMessages + 1 })),
  
  // General
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
```

### PASO 2: SERVICIOS FALTANTES

**src/services/recargas.service.ts:**
```typescript
import ApiService from './api.service';
import { Recarga, PaginatedResponse } from '../types';

class RecargasService {
  /**
   * Obtener configuración de recargas
   */
  async getConfig(): Promise<any> {
    return await ApiService.get('/recargas/config');
  }

  /**
   * Solicitar nueva recarga
   */
  async solicitarRecarga(data: {
    banco_origen: string;
    monto_depositado: number;
    boucher: {
      uri: string;
      name: string;
      type: string;
    };
  }): Promise<any> {
    return await ApiService.uploadFile('/recargas', data.boucher, {
      banco_origen: data.banco_origen,
      monto_depositado: data.monto_depositado.toString(),
    });
  }

  /**
   * Obtener historial de recargas
   */
  async getHistorial(params?: {
    estado?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Recarga>> {
    return await ApiService.get('/recargas/historial', params);
  }

  /**
   * Descargar comprobante
   */
  async getComprobante(id: string): Promise<any> {
    return await ApiService.get(`/recargas/${id}/comprobante`);
  }

  /**
   * Obtener video instructivo por banco
   */
  async getVideoInstructivo(banco: string): Promise<any> {
    return await ApiService.get(`/recargas/video-instructivo/${banco}`);
  }
}

export default new RecargasService();
```

**src/services/retiros.service.ts:**
```typescript
import ApiService from './api.service';
import { Retiro, PaginatedResponse } from '../types';

class RetirosService {
  /**
   * Solicitar retiro
   */
  async solicitarRetiro(data: {
    user_bank_id: string;
    monto: number;
  }): Promise<any> {
    return await ApiService.post('/retiros', data);
  }

  /**
   * Obtener historial de retiros
   */
  async getHistorial(params?: {
    estado?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Retiro>> {
    return await ApiService.get('/retiros/historial', params);
  }

  /**
   * Descargar comprobante
   */
  async getComprobante(id: string): Promise<any> {
    return await ApiService.get(`/retiros/${id}/comprobante`);
  }

  /**
   * Obtener configuración de retiros
   */
  async getConfig(): Promise<any> {
    return await ApiService.get('/retiros/config');
  }
}

export default new RetirosService();
```

**src/services/bancos.service.ts:**
```typescript
import ApiService from './api.service';
import { UserBank } from '../types';

class BancosService {
  /**
   * Obtener bancos del usuario
   */
  async getBancos(): Promise<{ success: boolean; data: { bancos: UserBank[] } }> {
    return await ApiService.get('/user-banks');
  }

  /**
   * Crear banco
   */
  async createBanco(data: {
    banco: 'BCP' | 'Interbank' | 'Scotiabank' | 'BBVA';
    numero_cuenta: string;
    cci: string;
    alias: string;
  }): Promise<any> {
    return await ApiService.post('/user-banks', data);
  }

  /**
   * Actualizar banco
   */
  async updateBanco(id: string, data: { alias: string }): Promise<any> {
    return await ApiService.patch(`/user-banks/${id}`, data);
  }

  /**
   * Eliminar banco
   */
  async deleteBanco(id: string): Promise<any> {
    return await ApiService.delete(`/user-banks/${id}`);
  }
}

export default new BancosService();
```

**src/services/chat.service.ts:**
```typescript
import ApiService from './api.service';
import { Chat, ChatMessage } from '../types';

class ChatService {
  /**
   * Obtener o crear chat del usuario
   */
  async getOrCreateChat(): Promise<{
    success: boolean;
    data: {
      chat: Chat;
      mensajes: ChatMessage[];
      mensajes_no_leidos: number;
    };
  }> {
    return await ApiService.get('/chat');
  }
}

export default new ChatService();
```

### PASO 3: COMPONENTES ADICIONALES

**src/components/OperacionCard.tsx:**
```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface OperacionCardProps {
  tipo: 'recarga' | 'retiro';
  numero_operacion: string;
  monto: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  fecha: string;
  banco?: string;
  onPress?: () => void;
}

export const OperacionCard: React.FC<OperacionCardProps> = ({
  tipo,
  numero_operacion,
  monto,
  estado,
  fecha,
  banco,
  onPress,
}) => {
  const getEstadoColor = () => {
    switch (estado) {
      case 'aprobado':
        return Colors.success;
      case 'pendiente':
        return Colors.warning;
      case 'rechazado':
        return Colors.error;
      default:
        return Colors.gray;
    }
  };

  const getEstadoIcon = () => {
    switch (estado) {
      case 'aprobado':
        return 'checkmark-circle';
      case 'pendiente':
        return 'time';
      case 'rechazado':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: tipo === 'recarga' ? Colors.success + '20' : Colors.secondary + '20' }
      ]}>
        <Ionicons
          name={tipo === 'recarga' ? 'arrow-down' : 'arrow-up'}
          size={24}
          color={tipo === 'recarga' ? Colors.success : Colors.secondary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.tipo}>
            {tipo === 'recarga' ? 'Recarga' : 'Retiro'}
          </Text>
          <Text style={[styles.monto, { color: tipo === 'recarga' ? Colors.success : Colors.error }]}>
            {tipo === 'recarga' ? '+' : '-'}S/. {monto.toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.numero}>{numero_operacion}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor() + '20' }]}>
            <Ionicons
              name={getEstadoIcon()}
              size={12}
              color={getEstadoColor()}
              style={styles.estadoIcon}
            />
            <Text style={[styles.estadoText, { color: getEstadoColor() }]}>
              {estado}
            </Text>
          </View>
        </View>

        {banco && (
          <Text style={styles.banco}>Banco: {banco}</Text>
        )}

        <Text style={styles.fecha}>
          {new Date(fecha).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  tipo: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
  },
  monto: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
  },
  numero: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  estadoIcon: {
    marginRight: 4,
  },
  estadoText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  banco: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
  },
  fecha: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
  },
});
```

**src/components/BancoCard.tsx:**
```typescript
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { UserBank } from '../types';

interface BancoCardProps {
  banco: UserBank;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const BancoCard: React.FC<BancoCardProps> = ({ banco, onEdit, onDelete }) => {
  const handleDelete = () => {
    Alert.alert(
      'Eliminar Banco',
      `¿Estás seguro de eliminar ${banco.alias}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const getBancoIcon = () => {
    switch (banco.banco) {
      case 'BCP':
        return 'card';
      case 'Interbank':
        return 'wallet';
      case 'Scotiabank':
        return 'cash';
      case 'BBVA':
        return 'briefcase';
      default:
        return 'business';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={getBancoIcon()} size={32} color={Colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.banco}>{banco.banco}</Text>
        <Text style={styles.alias}>{banco.alias}</Text>
        <Text style={styles.cuenta}>
          Cuenta: {banco.numero_cuenta_enmascarado}
        </Text>
        <Text style={styles.cci}>
          CCI: {banco.cci_enmascarado}
        </Text>
      </View>

      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  content: {
    flex: 1,
  },
  banco: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: 4,
  },
  alias: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.xs,
  },
  cuenta: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
    marginBottom: 2,
  },
  cci: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
  },
  actions: {
    justifyContent: 'center',
    gap: Layout.spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
### PASO 4: PANTALLA DE RECARGAS

**app/(tabs)/recargas.tsx:**
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { OperacionCard } from '../../src/components/OperacionCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import RecargasService from '../../src/services/recargas.service';
import { useStore } from '../../src/store/useStore';
import { Recarga } from '../../src/types';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';

const BANCOS = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'] as const;

export default function RecargasScreen() {
  const { user, updateSaldo } = useStore();
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  // Form state
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [montoDepositado, setMontoDepositado] = useState('');
  const [boucherUri, setBoucherUri] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historialRes, configRes] = await Promise.all([
        RecargasService.getHistorial({ page: 1, limit: 50 }),
        RecargasService.getConfig(),
      ]);

      if (historialRes.success && historialRes.data) {
        setRecargas(historialRes.data.recargas || []);
      }

      if (configRes.success && configRes.data) {
        setConfig(configRes.data.config);
      }
    } catch (error) {
      console.error('Error al cargar recargas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tu galería para subir el comprobante'
      );
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setBoucherUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a la cámara para tomar una foto del comprobante'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setBoucherUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Seleccionar Comprobante', 'Elige una opción', [
      { text: 'Tomar Foto', onPress: takePhoto },
      { text: 'Elegir de Galería', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const showVideoTutorial = async (banco: string) => {
    try {
      const response = await RecargasService.getVideoInstructivo(banco);
      if (response.success && response.data) {
        setSelectedVideo(response.data.video);
        setVideoModalVisible(true);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el video instructivo');
    }
  };

  const openYoutubeVideo = () => {
    if (selectedVideo?.youtube_url) {
      Linking.openURL(selectedVideo.youtube_url);
    }
  };

  const calcularComision = () => {
    if (!montoDepositado || !config) return 0;
    const monto = parseFloat(montoDepositado);
    return (monto * config.porcentaje_comision) / 100;
  };

  const calcularMontoNeto = () => {
    if (!montoDepositado) return 0;
    const monto = parseFloat(montoDepositado);
    return monto - calcularComision();
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!bancoOrigen) {
      Alert.alert('Error', 'Selecciona el banco de origen');
      return;
    }

    if (!montoDepositado) {
      Alert.alert('Error', 'Ingresa el monto depositado');
      return;
    }

    const monto = parseFloat(montoDepositado);
    if (isNaN(monto) || monto <= 0) {
      Alert.alert('Error', 'Monto inválido');
      return;
    }

    if (config) {
      if (monto < config.monto_minimo_recarga) {
        Alert.alert(
          'Error',
          `El monto mínimo es S/. ${config.monto_minimo_recarga.toFixed(2)}`
        );
        return;
      }

      if (monto > config.monto_maximo_recarga) {
        Alert.alert(
          'Error',
          `El monto máximo es S/. ${config.monto_maximo_recarga.toFixed(2)}`
        );
        return;
      }
    }

    if (!boucherUri) {
      Alert.alert('Error', 'Sube el comprobante de depósito');
      return;
    }

    setSubmitting(true);
    try {
      // Preparar archivo
      const filename = boucherUri.split('/').pop() || 'voucher.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const response = await RecargasService.solicitarRecarga({
        banco_origen: bancoOrigen,
        monto_depositado: monto,
        boucher: {
          uri: boucherUri,
          name: filename,
          type,
        },
      });

      if (response.success) {
        Alert.alert(
          '¡Solicitud Enviada!',
          'Tu recarga está siendo revisada. Te notificaremos cuando sea aprobada.',
          [
            {
              text: 'OK',
              onPress: () => {
                setModalVisible(false);
                resetForm();
                loadData();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al enviar solicitud'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setBancoOrigen('');
    setMontoDepositado('');
    setBoucherUri('');
  };

  const handleVerComprobante = async (recarga: Recarga) => {
    if (recarga.estado !== 'aprobado' || !recarga.comprobante_pdf_url) {
      Alert.alert('Info', 'El comprobante estará disponible cuando se apruebe la recarga');
      return;
    }

    try {
      const response = await RecargasService.getComprobante(recarga.id);
      if (response.success && response.data?.comprobante_url) {
        Linking.openURL(response.data.comprobante_url);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo descargar el comprobante');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Recargas</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        {config && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>Información de Recargas</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Comisión:</Text>
              <Text style={styles.infoValue}>{config.porcentaje_comision}%</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Monto mínimo:</Text>
              <Text style={styles.infoValue}>
                S/. {config.monto_minimo_recarga?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Monto máximo:</Text>
              <Text style={styles.infoValue}>
                S/. {config.monto_maximo_recarga?.toFixed(2)}
              </Text>
            </View>
          </Card>
        )}

        {/* Lista de recargas */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Historial</Text>
          {recargas.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>No tienes recargas aún</Text>
              <Text style={styles.emptySubtext}>
                Presiona el botón + para hacer tu primera recarga
              </Text>
            </View>
          ) : (
            recargas.map((recarga) => (
              <OperacionCard
                key={recarga.id}
                tipo="recarga"
                numero_operacion={recarga.numero_operacion}
                monto={Number(recarga.monto_neto)}
                estado={recarga.estado}
                fecha={recarga.created_at}
                banco={recarga.banco_origen}
                onPress={() => handleVerComprobante(recarga)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Nueva Recarga */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nueva Recarga</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Cuenta recaudadora */}
            {config?.cuenta_recaudadora_numero && (
              <Card style={styles.cuentaCard}>
                <View style={styles.cuentaHeader}>
                  <Ionicons name="business" size={24} color={Colors.primary} />
                  <Text style={styles.cuentaTitle}>Deposita a esta cuenta:</Text>
                </View>
                <Text style={styles.cuentaBanco}>
                  {config.cuenta_recaudadora_banco}
                </Text>
                <Text style={styles.cuentaNumero}>
                  {config.cuenta_recaudadora_numero}
                </Text>
                <Text style={styles.cuentaTitular}>
                  {config.cuenta_recaudadora_titular}
                </Text>
              </Card>
            )}

            {/* Selector de banco */}
            <Text style={styles.label}>Banco de Origen *</Text>
            <View style={styles.bancosGrid}>
              {BANCOS.map((banco) => (
                <TouchableOpacity
                  key={banco}
                  style={[
                    styles.bancoOption,
                    bancoOrigen === banco && styles.bancoSelected,
                  ]}
                  onPress={() => setBancoOrigen(banco)}
                >
                  <Text
                    style={[
                      styles.bancoText,
                      bancoOrigen === banco && styles.bancoTextSelected,
                    ]}
                  >
                    {banco}
                  </Text>
                  {bancoOrigen === banco && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Video tutorial */}
            {bancoOrigen && (
              <TouchableOpacity
                style={styles.videoButton}
                onPress={() => showVideoTutorial(bancoOrigen)}
              >
                <Ionicons name="play-circle" size={20} color={Colors.primary} />
                <Text style={styles.videoButtonText}>
                  Ver tutorial de depósito en {bancoOrigen}
                </Text>
              </TouchableOpacity>
            )}

            {/* Monto */}
            <Input
              label="Monto Depositado *"
              placeholder="1000.00"
              value={montoDepositado}
              onChangeText={setMontoDepositado}
              keyboardType="decimal-pad"
              icon="cash"
            />

            {/* Cálculos */}
            {montoDepositado && (
              <Card style={styles.calculoCard}>
                <View style={styles.calculoRow}>
                  <Text style={styles.calculoLabel}>Monto depositado:</Text>
                  <Text style={styles.calculoValue}>
                    S/. {parseFloat(montoDepositado).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.calculoRow}>
                  <Text style={styles.calculoLabel}>Comisión ({config?.porcentaje_comision}%):</Text>
                  <Text style={[styles.calculoValue, { color: Colors.error }]}>
                    -S/. {calcularComision().toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.calculoRow, styles.calculoTotal]}>
                  <Text style={styles.calculoTotalLabel}>Recibirás:</Text>
                  <Text style={styles.calculoTotalValue}>
                    S/. {calcularMontoNeto().toFixed(2)}
                  </Text>
                </View>
              </Card>
            )}

            {/* Upload voucher */}
            <Text style={styles.label}>Comprobante de Depósito *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showImageOptions}
            >
              {boucherUri ? (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: boucherUri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setBoucherUri('')}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload" size={48} color={Colors.gray} />
                  <Text style={styles.uploadText}>Subir Comprobante</Text>
                  <Text style={styles.uploadSubtext}>
                    Toca para tomar foto o elegir de galería
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Button
              title="Enviar Solicitud"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Video Tutorial */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tutorial de Depósito</Text>
            <TouchableOpacity onPress={() => setVideoModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.videoContent}>
            {selectedVideo && (
              <>
                <Text style={styles.videoTitle}>{selectedVideo.titulo}</Text>
                <Text style={styles.videoBanco}>Banco: {selectedVideo.banco}</Text>
                <Button
                  title="Ver Video en YouTube"
                  onPress={openYoutubeVideo}
                  style={styles.youtubeButton}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  addButton: {
    padding: Layout.spacing.xs,
  },
  infoCard: {
    margin: Layout.spacing.lg,
    backgroundColor: Colors.primaryLight,
  },
  infoTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.xs,
  },
  infoLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
  },
  infoValue: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  listContainer: {
    padding: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl * 2,
  },
  emptyText: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
    marginTop: Layout.spacing.md,
  },
  emptySubtext: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  modalContent: {
    flex: 1,
    padding: Layout.spacing.lg,
  },
  cuentaCard: {
    backgroundColor: Colors.secondary + '10',
    marginBottom: Layout.spacing.lg,
  },
  cuentaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  cuentaTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: Layout.spacing.sm,
  },
  cuentaBanco: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginBottom: Layout.spacing.xs,
  },
  cuentaNumero: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.xs,
  },
  cuentaTitular: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  bancosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  bancoOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  bancoSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bancoText: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  bancoTextSelected: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.xs,
  },
  videoButtonText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  calculoCard: {
    backgroundColor: Colors.lightGray,
    marginBottom: Layout.spacing.md,
  },
  calculoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.xs,
  },
  calculoLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
  },
  calculoValue: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  calculoTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Layout.spacing.xs,
    paddingTop: Layout.spacing.sm,
  },
  calculoTotalLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  calculoTotalValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  uploadButton: {
    marginBottom: Layout.spacing.md,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: Layout.spacing.sm,
    right: Layout.spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.full,
  },
  uploadPlaceholder: {
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  uploadText: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
    marginTop: Layout.spacing.sm,
    fontWeight: '600',
  },
  uploadSubtext: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
  videoContent: {
    padding: Layout.spacing.lg,
  },
  videoTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.sm,
  },
  videoBanco: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
    marginBottom: Layout.spacing.lg,
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
  },
});

### PASO 5: PANTALLA DE RETIROS

**app/(tabs)/retiros.tsx:**
```typescript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { OperacionCard } from '../../src/components/OperacionCard';
import { BancoCard } from '../../src/components/BancoCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import RetirosService from '../../src/services/retiros.service';
import BancosService from '../../src/services/bancos.service';
import { useStore } from '../../src/store/useStore';
import { Retiro, UserBank } from '../../src/types';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';

export default function RetirosScreen() {
  const { user, updateSaldo } = useStore();
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [bancos, setBancos] = useState<UserBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [bancosModalVisible, setBancosModalVisible] = useState(false);
  const [addBancoModalVisible, setAddBancoModalVisible] = useState(false);

  // Form state - Retiro
  const [selectedBancoId, setSelectedBancoId] = useState('');
  const [monto, setMonto] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state - Agregar Banco
  const [nuevoBanco, setNuevoBanco] = useState({
    banco: '' as 'BCP' | 'Interbank' | 'Scotiabank' | 'BBVA' | '',
    numero_cuenta: '',
    cci: '',
    alias: '',
  });
  const [addingBanco, setAddingBanco] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [retirosRes, bancosRes] = await Promise.all([
        RetirosService.getHistorial({ page: 1, limit: 50 }),
        BancosService.getBancos(),
      ]);

      if (retirosRes.success && retirosRes.data) {
        setRetiros(retirosRes.data.retiros || []);
      }

      if (bancosRes.success && bancosRes.data) {
        setBancos(bancosRes.data.bancos || []);
      }
    } catch (error) {
      console.error('Error al cargar retiros:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSubmitRetiro = async () => {
    // Validaciones
    if (!selectedBancoId) {
      Alert.alert('Error', 'Selecciona una cuenta bancaria');
      return;
    }

    if (!monto) {
      Alert.alert('Error', 'Ingresa el monto a retirar');
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Error', 'Monto inválido');
      return;
    }

    // CRÍTICO: saldo_actual viene como string desde Prisma Decimal
    const saldoActual = Number(user?.saldo_actual || 0);
    
    if (montoNum > saldoActual) {
      Alert.alert(
        'Error',
        `Saldo insuficiente. Tu saldo actual es S/. ${saldoActual.toFixed(2)}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await RetirosService.solicitarRetiro({
        user_bank_id: selectedBancoId,
        monto: montoNum,
      });

      if (response.success) {
        Alert.alert(
          '¡Solicitud Enviada!',
          'Tu retiro está siendo procesado. Te notificaremos cuando sea aprobado.',
          [
            {
              text: 'OK',
              onPress: () => {
                setModalVisible(false);
                resetForm();
                loadData();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al enviar solicitud'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedBancoId('');
    setMonto('');
  };

  const handleVerComprobante = async (retiro: Retiro) => {
    if (retiro.estado !== 'aprobado' || !retiro.comprobante_pdf_url) {
      Alert.alert('Info', 'El comprobante estará disponible cuando se apruebe el retiro');
      return;
    }

    try {
      const response = await RetirosService.getComprobante(retiro.id);
      if (response.success && response.data?.comprobante_url) {
        Linking.openURL(response.data.comprobante_url);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo descargar el comprobante');
    }
  };

  const handleAddBanco = async () => {
    // Validaciones
    if (!nuevoBanco.banco) {
      Alert.alert('Error', 'Selecciona un banco');
      return;
    }

    if (!nuevoBanco.numero_cuenta) {
      Alert.alert('Error', 'Ingresa el número de cuenta');
      return;
    }

    if (nuevoBanco.numero_cuenta.length < 13) {
      Alert.alert('Error', 'El número de cuenta debe tener al menos 13 dígitos');
      return;
    }

    if (!nuevoBanco.cci) {
      Alert.alert('Error', 'Ingresa el CCI');
      return;
    }

    if (nuevoBanco.cci.length !== 20) {
      Alert.alert('Error', 'El CCI debe tener exactamente 20 dígitos');
      return;
    }

    if (!nuevoBanco.alias) {
      Alert.alert('Error', 'Ingresa un alias para identificar la cuenta');
      return;
    }

    setAddingBanco(true);
    try {
      const response = await BancosService.createBanco(nuevoBanco as any);

      if (response.success) {
        Alert.alert('¡Éxito!', 'Cuenta bancaria agregada correctamente', [
          {
            text: 'OK',
            onPress: () => {
              setAddBancoModalVisible(false);
              resetNuevoBancoForm();
              loadData();
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al agregar cuenta'
      );
    } finally {
      setAddingBanco(false);
    }
  };

  const resetNuevoBancoForm = () => {
    setNuevoBanco({
      banco: '',
      numero_cuenta: '',
      cci: '',
      alias: '',
    });
  };

  const handleDeleteBanco = async (id: string) => {
    try {
      const response = await BancosService.deleteBanco(id);
      if (response.success) {
        Alert.alert('Éxito', 'Cuenta eliminada correctamente');
        loadData();
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al eliminar cuenta'
      );
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Retiros</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="arrow-down-circle" size={32} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Saldo disponible */}
        <Card style={styles.saldoCard}>
          <Text style={styles.saldoLabel}>Saldo Disponible</Text>
          <Text style={styles.saldoAmount}>
            S/. {Number(user?.saldo_actual || 0).toFixed(2)}
          </Text>
          <Text style={styles.saldoSubtext}>Puedes retirar todo tu saldo sin comisión</Text>
        </Card>

        {/* Cuentas bancarias */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Cuentas</Text>
            <TouchableOpacity onPress={() => setBancosModalVisible(true)}>
              <Text style={styles.seeAllText}>Gestionar</Text>
            </TouchableOpacity>
          </View>

          {bancos.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="card-outline" size={48} color={Colors.gray} />
              <Text style={styles.emptyText}>No tienes cuentas registradas</Text>
              <Button
                title="Agregar Cuenta"
                onPress={() => setAddBancoModalVisible(true)}
                style={styles.addCuentaButton}
              />
            </Card>
          ) : (
            bancos.slice(0, 2).map((banco) => (
              <BancoCard key={banco.id} banco={banco} />
            ))
          )}
        </View>

        {/* Historial de retiros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial</Text>
          {retiros.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={Colors.gray} />
              <Text style={styles.emptyText}>No tienes retiros aún</Text>
            </View>
          ) : (
            retiros.map((retiro) => (
              <OperacionCard
                key={retiro.id}
                tipo="retiro"
                numero_operacion={retiro.numero_operacion}
                monto={Number(retiro.monto)}
                estado={retiro.estado}
                fecha={retiro.created_at}
                banco={retiro.banco?.banco}
                onPress={() => handleVerComprobante(retiro)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Nuevo Retiro */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo Retiro</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Saldo disponible */}
            <Card style={styles.saldoModalCard}>
              <Text style={styles.saldoModalLabel}>Saldo Disponible</Text>
              <Text style={styles.saldoModalAmount}>
                S/. {Number(user?.saldo_actual || 0).toFixed(2)}
              </Text>
            </Card>

            {/* Selector de cuenta */}
            <Text style={styles.label}>Cuenta de Destino *</Text>
            {bancos.length === 0 ? (
              <Card style={styles.noBancosCard}>
                <Text style={styles.noBancosText}>
                  No tienes cuentas registradas
                </Text>
                <Button
                  title="Agregar Cuenta"
                  onPress={() => {
                    setModalVisible(false);
                    setAddBancoModalVisible(true);
                  }}
                  variant="outline"
                  style={styles.addCuentaInlineButton}
                />
              </Card>
            ) : (
              <View style={styles.bancosSelector}>
                {bancos.map((banco) => (
                  <TouchableOpacity
                    key={banco.id}
                    style={[
                      styles.bancoSelectorItem,
                      selectedBancoId === banco.id && styles.bancoSelectorSelected,
                    ]}
                    onPress={() => setSelectedBancoId(banco.id)}
                  >
                    <View style={styles.bancoSelectorContent}>
                      <Text style={styles.bancoSelectorBanco}>{banco.banco}</Text>
                      <Text style={styles.bancoSelectorAlias}>{banco.alias}</Text>
                      <Text style={styles.bancoSelectorCuenta}>
                        {banco.numero_cuenta_enmascarado}
                      </Text>
                    </View>
                    {selectedBancoId === banco.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Monto */}
            <Input
              label="Monto a Retirar *"
              placeholder="0.00"
              value={monto}
              onChangeText={setMonto}
              keyboardType="decimal-pad"
              icon="cash"
            />

            {/* Info sin comisión */}
            <Card style={styles.infoNoComision}>
              <Ionicons name="information-circle" size={24} color={Colors.success} />
              <Text style={styles.infoNoComisionText}>
                Los retiros no tienen comisión. Recibirás el monto exacto que solicites.
              </Text>
            </Card>

            <Button
              title="Solicitar Retiro"
              onPress={handleSubmitRetiro}
              loading={submitting}
              disabled={bancos.length === 0}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Gestionar Bancos */}
      <Modal
        visible={bancosModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Mis Cuentas Bancarias</Text>
            <TouchableOpacity onPress={() => setBancosModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Button
              title="Agregar Nueva Cuenta"
              onPress={() => {
                setBancosModalVisible(false);
                setAddBancoModalVisible(true);
              }}
              variant="outline"
              style={styles.addNewButton}
            />

            {bancos.map((banco) => (
              <BancoCard
                key={banco.id}
                banco={banco}
                onDelete={() => handleDeleteBanco(banco.id)}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Agregar Banco */}
      <Modal
        visible={addBancoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Cuenta</Text>
            <TouchableOpacity onPress={() => setAddBancoModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Banco *</Text>
            <View style={styles.bancosGrid}>
              {(['BCP', 'Interbank', 'Scotiabank', 'BBVA'] as const).map((banco) => (
                <TouchableOpacity
                  key={banco}
                  style={[
                    styles.bancoOption,
                    nuevoBanco.banco === banco && styles.bancoSelected,
                  ]}
                  onPress={() => setNuevoBanco({ ...nuevoBanco, banco })}
                >
                  <Text
                    style={[
                      styles.bancoText,
                      nuevoBanco.banco === banco && styles.bancoTextSelected,
                    ]}
                  >
                    {banco}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Número de Cuenta *"
              placeholder="Mínimo 13 dígitos"
              value={nuevoBanco.numero_cuenta}
              onChangeText={(text) =>
                setNuevoBanco({ ...nuevoBanco, numero_cuenta: text })
              }
              keyboardType="number-pad"
              icon="card"
            />

            <Input
              label="CCI *"
              placeholder="20 dígitos"
              value={nuevoBanco.cci}
              onChangeText={(text) => setNuevoBanco({ ...nuevoBanco, cci: text })}
              keyboardType="number-pad"
              maxLength={20}
              icon="keypad"
            />

            <Input
              label="Alias *"
              placeholder="Ej: Mi cuenta principal"
              value={nuevoBanco.alias}
              onChangeText={(text) => setNuevoBanco({ ...nuevoBanco, alias: text })}
              icon="create"
            />

            <Button
              title="Agregar Cuenta"
              onPress={handleAddBanco}
              loading={addingBanco}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  addButton: {
    padding: Layout.spacing.xs,
  },
  saldoCard: {
    margin: Layout.spacing.lg,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
  },
  saldoLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.textWhite,
    opacity: 0.9,
  },
  saldoAmount: {
    fontSize: Layout.fontSize.xxl * 1.5,
    fontWeight: 'bold',
    color: Colors.textWhite,
    marginVertical: Layout.spacing.sm,
  },
  saldoSubtext: {
    fontSize: Layout.fontSize.xs,
    color: Colors.textWhite,
    opacity: 0.8,
  },
  section: {
    padding: Layout.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  addCuentaButton: {
    marginTop: Layout.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl * 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  modalContent: {
    flex: 1,
    padding: Layout.spacing.lg,
  },
  saldoModalCard: {
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  saldoModalLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
  },
  saldoModalAmount: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginTop: Layout.spacing.xs,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  noBancosCard: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
    marginBottom: Layout.spacing.md,
  },
  noBancosText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.md,
  },
  addCuentaInlineButton: {
    minWidth: 200,
  },
  bancosSelector: {
    marginBottom: Layout.spacing.md,
  },
  bancoSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    marginBottom: Layout.spacing.sm,
  },
  bancoSelectorSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bancoSelectorContent: {
    flex: 1,
  },
  bancoSelectorBanco: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  bancoSelectorAlias: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  bancoSelectorCuenta: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
    marginTop: 2,
  },
  infoNoComision: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  infoNoComisionText: {
    flex: 1,
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
  },
  submitButton: {
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
  addNewButton: {
    marginBottom: Layout.spacing.lg,
  },
  bancosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  bancoOption: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  bancoSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bancoText: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  bancoTextSelected: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});