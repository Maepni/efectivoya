import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: DialogButton[];
  onDismiss: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  buttons,
  onDismiss,
}: ConfirmDialogProps) {
  const handlePress = (button: DialogButton) => {
    button.onPress?.();
    onDismiss();
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return { color: Colors.error };
      case 'cancel':
        return { color: Colors.gray };
      default:
        return { color: Colors.primary };
    }
  };

  const isRow = buttons.length === 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={isRow ? styles.buttonsRow : styles.buttonsColumn}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  isRow && styles.buttonFlex,
                  index > 0 && isRow && styles.buttonBorderLeft,
                ]}
                onPress={() => handlePress(button)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    getButtonStyle(button.style),
                    button.style === 'cancel' && styles.buttonTextCancel,
                    button.style === 'destructive' && styles.buttonTextBold,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  title: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    textAlign: 'center',
    paddingTop: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
  },
  message: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
    textAlign: 'center',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
  },
  buttonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  buttonsColumn: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  buttonBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  buttonText: {
    fontSize: Layout.fontSize.md,
    fontWeight: '500',
  },
  buttonTextCancel: {
    fontWeight: '400',
  },
  buttonTextBold: {
    fontWeight: '700',
  },
});
