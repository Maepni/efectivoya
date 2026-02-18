import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import ChatService from '../../src/services/chat.service';
import { socketService } from '../../src/services/socket.service';
import { useAuthStore } from '../../src/store/authStore';
import { useStore } from '../../src/store/useStore';
import type { ChatMessage } from '../../src/types';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { setUnreadMessages } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadChat = useCallback(async () => {
    try {
      const response = await ChatService.getOrCreateChat();

      if (response.success && response.data) {
        setChatId(response.data.chat.id);
        setMessages(response.data.mensajes || []);
        setUnreadMessages(0);

        if (response.data.chat.id && socketService.isConnected()) {
          socketService.markAsRead(response.data.chat.id);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error al cargar chat:', error);
      Alert.alert('Error', 'No se pudo cargar el chat');
    } finally {
      setLoading(false);
    }
  }, [setUnreadMessages]);

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  useEffect(() => {
    const unsubscribe = socketService.onMessage((message: ChatMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      if (chatId && message.remitente_tipo === 'admin') {
        socketService.markAsRead(chatId);
        setUnreadMessages(0);
      }
    });

    return unsubscribe;
  }, [chatId, setUnreadMessages]);

  // Scroll al bottom cuando sube el teclado en iOS
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    });
    return () => sub.remove();
  }, []);

  const handleSend = () => {
    if (!inputText.trim() || sending) return;
    if (!socketService.isConnected()) {
      Alert.alert('Sin conexión', 'No hay conexión al servidor. Intenta de nuevo.');
      return;
    }

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      socketService.sendMessage(chatId, messageText);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      if (__DEV__) console.error('Error al enviar mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.remitente_tipo === 'usuario';

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

  if (loading) return <LoadingScreen />;

  // Tab bar height + safe area: en iOS la tab bar ocupa ~49px + insets.bottom
  const keyboardOffset = Platform.OS === 'ios' ? 49 + insets.bottom : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Ionicons name="headset" size={24} color={Colors.white} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Soporte EfectivoYa</Text>
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: socketService.isConnected()
                    ? Colors.success
                    : Colors.gray,
                },
              ]}
            >
              {socketService.isConnected() ? 'En línea' : 'Desconectado'}
            </Text>
          </View>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={Colors.gray}
          />
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

      <View style={[styles.inputContainer, { paddingBottom: Math.max(Layout.spacing.md, insets.bottom) }]}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={Colors.gray}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
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
            color={
              inputText.trim() && !sending ? Colors.white : Colors.gray
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    backgroundColor: Colors.cardBackground,
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
  headerSubtitle: { fontSize: Layout.fontSize.xs, marginTop: 2 },
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
  messagesList: { padding: Layout.spacing.lg },
  messageContainer: { marginBottom: Layout.spacing.md },
  userMessageContainer: { alignItems: 'flex-end' },
  adminMessageContainer: { alignItems: 'flex-start' },
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
    backgroundColor: Colors.cardBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: Layout.fontSize.md, lineHeight: 20 },
  userMessageText: { color: Colors.white },
  adminMessageText: { color: Colors.text },
  messageTime: { fontSize: Layout.fontSize.xs, marginTop: Layout.spacing.xs },
  userMessageTime: { color: Colors.white, opacity: 0.7 },
  adminMessageTime: { color: Colors.gray },
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
});
