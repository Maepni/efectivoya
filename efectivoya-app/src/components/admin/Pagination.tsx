import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, page <= 1 && styles.buttonDisabled]}
        onPress={() => onPageChange(page - 1)}
        disabled={page <= 1}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, page <= 1 && styles.buttonTextDisabled]}>
          Anterior
        </Text>
      </TouchableOpacity>

      <Text style={styles.info}>
        Página {page} de {totalPages}
      </Text>

      <TouchableOpacity
        style={[styles.button, page >= totalPages && styles.buttonDisabled]}
        onPress={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, page >= totalPages && styles.buttonTextDisabled]}>
          Siguiente
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.lg,
    gap: Layout.spacing.lg,
  },
  button: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.accent,
    fontWeight: '500',
  },
  buttonTextDisabled: {
    color: Colors.gray,
  },
  info: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
  },
});
