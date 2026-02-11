import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, Pressable } from 'react-native';
import { Button } from '../Button';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

interface RechazoModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (motivo: string) => void;
  loading?: boolean;
  title?: string;
}

export function RechazoModal({
  visible,
  onDismiss,
  onConfirm,
  loading = false,
  title = 'Motivo de Rechazo',
}: RechazoModalProps) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (motivo.trim().length < 10) {
      setError('El motivo debe tener al menos 10 caracteres');
      return;
    }
    setError('');
    onConfirm(motivo.trim());
    setMotivo('');
  };

  const handleDismiss = () => {
    setMotivo('');
    setError('');
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.input}
            placeholder="Escribe el motivo del rechazo..."
            placeholderTextColor={Colors.gray}
            value={motivo}
            onChangeText={setMotivo}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.buttons}>
            <Button
              title="Cancelar"
              onPress={handleDismiss}
              variant="outline"
              style={styles.button}
            />
            <Button
              title="Rechazar"
              onPress={handleConfirm}
              loading={loading}
              style={styles.rejectButton}
            />
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
    padding: Layout.spacing.xl,
    width: '100%',
    maxWidth: 440,
  },
  title: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.lg,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.md,
    color: Colors.white,
    fontSize: Layout.fontSize.sm,
    minHeight: 100,
  },
  error: {
    color: Colors.error,
    fontSize: Layout.fontSize.xs,
    marginTop: Layout.spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },
  button: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.error,
  },
});
