## CONTEXTO
Estás trabajando en el frontend de **EfectivoYa** (billetera digital fintech para Perú).

**YA IMPLEMENTADO:**
- ✅ Autenticación (Login, Registro, OTP)
- ✅ Dashboard con estadísticas
- ✅ Pantalla de Recargas completa
- ✅ Pantalla de Retiros completa
- ✅ Servicios: api, auth, socket, notifications, recargas, retiros, bancos
- ✅ Store con Zustand
- ✅ Componentes: Button, Input, Card, LoadingScreen, OperacionCard, BancoCard

**PENDIENTE (este prompt):**
- ❌ Pantalla de Chat (Socket.io en tiempo real)
- ❌ Pantalla de Perfil (ver/editar datos, gestionar bancos, logout)
- ❌ Configuración final del proyecto
- ❌ Actualizar AuthContext para usar el store

## IMPORTANTE - CONSIDERACIONES CRÍTICAS

Del archivo CLAUDE.md:
- ✅ `saldo_actual` viene como **string** desde Prisma → usar `Number()` antes de `.toFixed()`
- ✅ Perfil usuario: `/api/auth/profile` (NO `/api/user/profile`)
- ✅ Campos: `nombres` y `apellidos` (plural, NO nombre/apellido)
- ✅ Socket.io: Conectar con token JWT en auth
- ✅ Chat: Usuario solo ve su propio chat, mensajes en tiempo real

## ESTRUCTURA DEL PROYECTO
efectivoya-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx ✅ (Dashboard)
│   │   ├── recargas.tsx ✅
│   │   ├── retiros.tsx ✅
│   │   ├── chat.tsx ❌ CREAR AHORA
│   │   └── perfil.tsx ❌ CREAR AHORA
├── src/
│   ├── components/ ✅
│   ├── services/ ✅ (todos creados)
│   ├── store/
│   │   └── useStore.ts ✅
│   ├── contexts/
│   │   └── AuthContext.tsx ⚠️ ACTUALIZAR
│   ├── types/ ✅
│   ├── constants/ ✅
│   └── config/ ✅

## PASO 1: ACTUALIZAR AUTHCONTEXT

**src/contexts/AuthContext.tsx:**
```typescript
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AuthService from '../services/auth.service';
import NotificationsService from '../services/notifications.service';
import SocketService from '../services/socket.service';
import { useStore } from '../store/useStore';
import { User, LoginResponse, RegisterData } from '../types';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  verifyOTP: (userId: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const { user, setUser } = useStore();

  useEffect(() => {
    loadStoredUser();
  }, []);

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

  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login(email, password);
      setUser(response.data.user);
      await initializeServices();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  const register = async (data: RegisterData) => {
    try {
      await AuthService.register(data);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al registrarse');
    }
  };

  const verifyOTP = async (userId: string, otp: string) => {
    try {
      const response = await AuthService.verifyOTP(userId, otp);
      setUser(response.data.user);
      await initializeServices();
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Código OTP inválido');
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      SocketService.disconnect();
      setUser(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

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

## PASO 2: ACTUALIZAR AUTHSERVICE

**src/services/auth.service.ts - AGREGAR método verifyOTP actualizado:**
```typescript
// ... (mantener todo el código existente)

/**
 * Verificar OTP - CORREGIDO según CLAUDE.md
 */
async verifyOTP(userId: string, otp: string): Promise<LoginResponse> {
  const response = await ApiService.post<LoginResponse['data']>('/auth/verify-email', {
    userId,  // CRÍTICO: es userId, NO email
    otp,
  });

  if (response.success && response.data) {
    await AsyncStorage.setItem('accessToken', response.data.accessToken);
    await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
  }

  return response as LoginResponse;
}

// ... (resto del código)
```

## PASO 3: PANTALLA DE CHAT

**app/(tabs)/chat.tsx:**
```typescript
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import ChatService from '../../src/services/chat.service';
import SocketService from '../../src/services/socket.service';
import { useStore } from '../../src/store/useStore';
import { ChatMessage } from '../../src/types';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';

export default function ChatScreen() {
  const { user, unreadMessages, setUnreadMessages } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChat();
    setupSocketListeners();

    return () => {
      // Cleanup socket listeners
    };
  }, []);

  const loadChat = async () => {
    try {
      const response = await ChatService.getOrCreateChat();
      
      if (response.success && response.data) {
        setChatId(response.data.chat.id);
        setMessages(response.data.mensajes || []);
        setUnreadMessages(0);

        // Marcar mensajes como leídos
        if (response.data.chat.id && SocketService.isConnected()) {
          SocketService.markAsRead(response.data.chat.id);
        }
      }
    } catch (error) {
      console.error('Error al cargar chat:', error);
      Alert.alert('Error', 'No se pudo cargar el chat');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Listener para nuevos mensajes
    const unsubscribe = SocketService.onMessage((message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      
      // Auto-scroll al final
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Marcar como leído si el chat está abierto
      if (chatId && message.sender_type === 'admin') {
        SocketService.markAsRead(chatId);
        setUnreadMessages(0);
      }
    });

    return unsubscribe;
  };

  const handleSend = async () => {
    if (!inputText.trim() || !chatId || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      SocketService.sendMessage(chatId, messageText);
      
      // El mensaje se agregará cuando llegue el evento 'message_sent' del socket
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setInputText(messageText); // Restaurar texto
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender_type === 'user';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.adminMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.adminBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.adminMessageText,
            ]}
          >
            {item.mensaje}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isUser ? styles.userMessageTime : styles.adminMessageTime,
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Ionicons name="headset" size={24} color={Colors.textWhite} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Soporte EfectivoYa</Text>
            <Text style={styles.headerSubtitle}>
              {SocketService.isConnected() ? 'En línea' : 'Desconectado'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.gray} />
          <Text style={styles.emptyText}>No hay mensajes aún</Text>
          <Text style={styles.emptySubtext}>
            Envía un mensaje para iniciar la conversación con soporte
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={Colors.gray}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Ionicons
            name="send"
            size={24}
            color={inputText.trim() && !sending ? Colors.textWhite : Colors.gray}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  headerSubtitle: {
    fontSize: Layout.fontSize.xs,
    color: Colors.success,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  emptyText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.gray,
    marginTop: Layout.spacing.md,
  },
  emptySubtext: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },
  messagesList: {
    padding: Layout.spacing.lg,
  },
  messageContainer: {
    marginBottom: Layout.spacing.md,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  adminMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  adminBubble: {
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: Layout.fontSize.md,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.textWhite,
  },
  adminMessageText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: Layout.fontSize.xs,
    marginTop: Layout.spacing.xs,
  },
  userMessageTime: {
    color: Colors.textWhite,
    opacity: 0.7,
  },
  adminMessageTime: {
    color: Colors.gray,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Layout.spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Layout.spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.lightGray,
  },
});
```

## PASO 4: PANTALLA DE PERFIL

**app/(tabs)/perfil.tsx:**
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { BancoCard } from '../../src/components/BancoCard';
import { useAuth } from '../../src/contexts/AuthContext';
import BancosService from '../../src/services/bancos.service';
import { useStore } from '../../src/store/useStore';
import { UserBank } from '../../src/types';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const { setUser } = useStore();
  const [bancos, setBancos] = useState<UserBank[]>([]);
  const [bancosModalVisible, setBancosModalVisible] = useState(false);
  const [addBancoModalVisible, setAddBancoModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form state - Editar perfil
  const [editData, setEditData] = useState({
    nombres: user?.nombres || '',
    apellidos: user?.apellidos || '',
    whatsapp: user?.whatsapp || '',
  });
  const [updating, setUpdating] = useState(false);

  // Form state - Agregar Banco
  const [nuevoBanco, setNuevoBanco] = useState({
    banco: '' as 'BCP' | 'Interbank' | 'Scotiabank' | 'BBVA' | '',
    numero_cuenta: '',
    cci: '',
    alias: '',
  });
  const [addingBanco, setAddingBanco] = useState(false);

  React.useEffect(() => {
    loadBancos();
  }, []);

  const loadBancos = async () => {
    try {
      const response = await BancosService.getBancos();
      if (response.success && response.data) {
        setBancos(response.data.bancos || []);
      }
    } catch (error) {
      console.error('Error al cargar bancos:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleUpdateProfile = async () => {
    // Validaciones
    if (!editData.nombres || !editData.apellidos) {
      Alert.alert('Error', 'Nombres y apellidos son requeridos');
      return;
    }

    if (editData.whatsapp && editData.whatsapp.length !== 9) {
      Alert.alert('Error', 'WhatsApp debe tener 9 dígitos');
      return;
    }

    setUpdating(true);
    try {
      // TODO: Implementar endpoint de actualización de perfil en el backend
      // Por ahora, solo mostramos mensaje
      Alert.alert('Info', 'Función de actualización de perfil próximamente disponible');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setUpdating(false);
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
      Alert.alert('Error', 'Ingresa un alias');
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
              loadBancos();
            },
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al agregar cuenta');
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
        loadBancos();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al eliminar cuenta');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        {/* Datos del usuario */}
        <Card style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.nombres.charAt(0)}{user?.apellidos.charAt(0)}
              </Text>
            </View>
          </View>

          <Text style={styles.userName}>
            {user?.nombres} {user?.apellidos}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
            <Text style={styles.editButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        </Card>

        {/* Información de cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Cuenta</Text>

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="card" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>DNI</Text>
                <Text style={styles.infoValue}>{user?.dni}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="logo-whatsapp" size={20} color={Colors.success} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>WhatsApp</Text>
                <Text style={styles.infoValue}>{user?.whatsapp}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="gift" size={20} color={Colors.secondary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Código de Referido</Text>
                <Text style={[styles.infoValue, { color: Colors.secondary }]}>
                  {user?.codigo_referido}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name={user?.email_verificado ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={user?.email_verificado ? Colors.success : Colors.error}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Estado</Text>
                <Text style={styles.infoValue}>
                  {user?.email_verificado ? 'Verificado' : 'No verificado'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Cuentas bancarias */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Cuentas Bancarias</Text>
            <TouchableOpacity onPress={() => setBancosModalVisible(true)}>
              <Text style={styles.seeAllText}>Ver todas</Text>
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

        {/* Opciones */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.optionButton}>
            <Ionicons name="help-circle-outline" size={24} color={Colors.text} />
            <Text style={styles.optionText}>Ayuda y Soporte</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Ionicons name="document-text-outline" size={24} color={Colors.text} />
            <Text style={styles.optionText}>Términos y Condiciones</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Ionicons name="shield-checkmark-outline" size={24} color={Colors.text} />
            <Text style={styles.optionText}>Políticas de Privacidad</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            <Text style={[styles.optionText, { color: Colors.error }]}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>

        {/* Versión */}
        <Text style={styles.versionText}>Versión 1.0.0</Text>
      </ScrollView>

      {/* Modal Editar Perfil */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Input
              label="Nombres"
              placeholder="Tus nombres"
              value={editData.nombres}
              onChangeText={(text) => setEditData({ ...editData, nombres: text })}
              icon="person"
            />

            <Input
              label="Apellidos"
              placeholder="Tus apellidos"
              value={editData.apellidos}
              onChangeText={(text) => setEditData({ ...editData, apellidos: text })}
              icon="person"
            />

            <Input
              label="WhatsApp"
              placeholder="987654321"
              value={editData.whatsapp}
              onChangeText={(text) => setEditData({ ...editData, whatsapp: text })}
              keyboardType="phone-pad"
              maxLength={9}
              icon="logo-whatsapp"
            />

            <Button
              title="Guardar Cambios"
              onPress={handleUpdateProfile}
              loading={updating}
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
    padding: Layout.spacing.lg,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  userCard: {
    margin: Layout.spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: Layout.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.textWhite,
  },
  userName: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.xs,
  },
  userEmail: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editButtonText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
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
  infoCard: {
    gap: Layout.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
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
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.sm,
    gap: Layout.spacing.md,
  },
  optionText: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: Layout.spacing.lg,
  },
  versionText: {
    textAlign: 'center',
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    paddingVertical: Layout.spacing.xl,
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
  submitButton: {
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
  addNewButton: {
    marginBottom: Layout.spacing.lg,
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
```

## PASO 5: CONFIGURACIÓN FINAL

### 5.1 Actualizar app.json
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
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.efectivoya.app"
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
      ]
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
    ]
  }
}
```

### 5.2 Crear .env
```env
# API URLs
API_URL_DEV=http://localhost:3000/api
API_URL_PROD=https://api.efectivoya.com/api
SOCKET_URL_DEV=http://localhost:3000
SOCKET_URL_PROD=https://api.efectivoya.com
```

### 5.3 Actualizar package.json scripts
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

## PASO 6: TESTING Y DEPLOYMENT

### Comandos para testing:
```bash
# Instalar dependencias
cd efectivoya-app
npm install --legacy-peer-deps

# Verificar TypeScript
npx tsc --noEmit

# Iniciar en desarrollo
npx expo start

# Para Android
npx expo start --android

# Para iOS
npx expo start --ios

# Para Web
npx expo start --web
```

### Checklist Pre-Launch:
✅ Todas las pantallas implementadas
✅ Socket.io conectando correctamente
✅ Notificaciones push configuradas
✅ Manejo de errores en todas las pantallas
✅ Loading states implementados
✅ Validaciones de formularios
✅ Navegación funcionando
✅ AuthContext usando el store
✅ saldo_actual convertido correctamente (Number())
✅ Campos nombres/apellidos (plural) en todos los forms
✅ verifyOTP usando userId (no email)

### Para compilar:
```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar
eas build:configure

# Build Android APK
eas build --platform android --profile preview

# Build para stores
eas build --platform all --profile production
```

## RESULTADO ESPERADO

Al completar este prompt tendrás:

✅ Chat en tiempo real con Socket.io completamente funcional
✅ Pantalla de perfil con edición de datos
✅ Gestión completa de cuentas bancarias
✅ Logout funcionando correctamente
✅ AuthContext actualizado para usar Zustand store
✅ Todas las pantallas de la app completas
✅ App lista para testing y deployment

## NOTAS IMPORTANTES

1. **Socket.io**: El chat se conecta automáticamente al iniciar sesión
2. **Push Notifications**: Se registran al login
3. **saldo_actual**: SIEMPRE usar `Number()` antes de `.toFixed()`
4. **Perfil**: Endpoint `/api/auth/profile` (NO /api/user/profile)
5. **Campos**: `nombres` y `apellidos` (plural)
6. **OTP**: `{ userId, otp }` no `{ email, otp }`