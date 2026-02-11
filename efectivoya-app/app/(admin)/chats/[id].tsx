import { useState, useEffect, useRef, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminChatService } from '../../../src/services/adminChat.service';
import { adminSocketService } from '../../../src/services/adminSocket.service';
import { useResponsive } from '../../../src/hooks/useResponsive';
import type { ChatMessage } from '../../../src/types';

export default function AdminChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isMobile } = useResponsive();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatEstado, setChatEstado] = useState<'abierto' | 'cerrado'>('abierto');
  const [userName, setUserName] = useState('');
  const [userInfo, setUserInfo] = useState<{ email: string; whatsapp: string; saldo: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadChat = useCallback(async () => {
    if (!id) return;
    try {
      const res = await adminChatService.getDetail(id);
      if (res.success && res.data) {
        const { chat } = res.data;
        setMessages(chat.mensajes);
        setChatEstado(chat.estado);
        setUserName(`${chat.user.nombres} ${chat.user.apellidos}`);
        setUserInfo({
          email: chat.user.email,
          whatsapp: chat.user.whatsapp,
          saldo: `S/. ${Number(chat.user.saldo_actual).toFixed(2)}`,
        });

        // Marcar como leídos
        if (adminSocketService.isConnected()) {
          adminSocketService.markAsRead(id);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error al cargar chat:', error);
      Alert.alert('Error', 'No se pudo cargar el chat');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadChat(); }, [loadChat]);

  // Escuchar mensajes nuevos por socket
  useEffect(() => {
    const unsubscribe = adminSocketService.onMessage((message: ChatMessage) => {
      // Solo agregar mensajes de este chat
      if (message.chat_id !== id) return;

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Marcar como leído si es del usuario
      if (id && message.remitente_tipo === 'usuario') {
        adminSocketService.markAsRead(id);
      }
    });

    return unsubscribe;
  }, [id]);

  const handleSend = () => {
    if (!inputText.trim() || sending || !id) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      adminSocketService.sendMessage(id, messageText);
    } catch (error) {
      if (__DEV__) console.error('Error al enviar mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleToggleEstado = async () => {
    if (!id) return;
    const action = chatEstado === 'abierto' ? 'cerrar' : 'reabrir';
    const res = chatEstado === 'abierto'
      ? await adminChatService.cerrar(id)
      : await adminChatService.reabrir(id);

    if (res.success) {
      setChatEstado(chatEstado === 'abierto' ? 'cerrado' : 'abierto');
    } else {
      Alert.alert('Error', `No se pudo ${action} el chat`);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isAdmin = item.remitente_tipo === 'admin';

    return (
      <View style={[styles.messageContainer, isAdmin ? styles.adminMessageContainer : styles.userMessageContainer]}>
        <View style={[styles.messageBubble, isAdmin ? styles.adminBubble : styles.userBubble]}>
          <Text style={[styles.messageText, isAdmin ? styles.adminMessageText : styles.userMessageText]}>
            {item.mensaje}
          </Text>
          <Text style={[styles.messageTime, isAdmin ? styles.adminMessageTime : styles.userMessageTime]}>
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
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={Colors.accent} />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={20} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{userName}</Text>
            <Text style={[styles.headerSubtitle, { color: chatEstado === 'abierto' ? Colors.success : Colors.gray }]}>
              {chatEstado === 'abierto' ? 'Chat abierto' : 'Chat cerrado'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleToggleEstado}
          style={[styles.actionButton, chatEstado === 'abierto' ? styles.closeButton : styles.reopenButton]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={chatEstado === 'abierto' ? 'close-circle-outline' : 'refresh-circle-outline'}
            size={18}
            color={chatEstado === 'abierto' ? Colors.error : Colors.success}
          />
          <Text style={[styles.actionText, { color: chatEstado === 'abierto' ? Colors.error : Colors.success }]}>
            {chatEstado === 'abierto' ? 'Cerrar' : 'Reabrir'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* User info card */}
      {userInfo && !isMobile && (
        <View style={styles.userInfoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={14} color={Colors.gray} />
            <Text style={styles.infoText}>{userInfo.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="logo-whatsapp" size={14} color={Colors.gray} />
            <Text style={styles.infoText}>{userInfo.whatsapp}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="wallet-outline" size={14} color={Colors.gray} />
            <Text style={styles.infoText}>{userInfo.saldo}</Text>
          </View>
        </View>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <Ionicons name="chatbubbles-outline" size={64} color={Colors.gray} />
          <Text style={styles.emptyText}>No hay mensajes aún</Text>
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
      {chatEstado === 'abierto' ? (
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
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim() && !sending ? Colors.white : Colors.gray}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedBanner}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.gray} />
          <Text style={styles.closedText}>Chat cerrado. Reabre para enviar mensajes.</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: 'center', alignItems: 'center', padding: Layout.spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    flex: 1,
  },
  backButton: {
    padding: Layout.spacing.xs,
  },
  avatarContainer: {
    width: 36,
    height: 36,
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
  headerSubtitle: { fontSize: Layout.fontSize.xs, marginTop: 1 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 6,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
  },
  closeButton: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}10`,
  },
  reopenButton: {
    borderColor: Colors.success,
    backgroundColor: `${Colors.success}10`,
  },
  actionText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
  userInfoCard: {
    flexDirection: 'row',
    gap: Layout.spacing.lg,
    padding: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },
  messagesList: { padding: Layout.spacing.lg },
  messageContainer: { marginBottom: Layout.spacing.md },
  adminMessageContainer: { alignItems: 'flex-end' },
  userMessageContainer: { alignItems: 'flex-start' },
  messageBubble: {
    maxWidth: '80%',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
  },
  adminBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.cardBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: Layout.fontSize.md, lineHeight: 20 },
  adminMessageText: { color: Colors.white },
  userMessageText: { color: Colors.text },
  messageTime: { fontSize: Layout.fontSize.xs, marginTop: Layout.spacing.xs },
  adminMessageTime: { color: Colors.white, opacity: 0.7 },
  userMessageTime: { color: Colors.gray },
  emptyText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.gray,
    marginTop: Layout.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Layout.spacing.md,
    backgroundColor: Colors.cardBackground,
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
  sendButtonDisabled: { backgroundColor: Colors.lightGray },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closedText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
  },
});
