import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export const DEPARTAMENTOS_PERU: readonly string[] = [
  'Amazonas', 'Áncash', 'Apurímac', 'Arequipa', 'Ayacucho',
  'Cajamarca', 'Callao', 'Cusco', 'Huancavelica', 'Huánuco',
  'Ica', 'Junín', 'La Libertad', 'Lambayeque', 'Lima',
  'Loreto', 'Madre de Dios', 'Moquegua', 'Pasco', 'Piura',
  'Puno', 'San Martín', 'Tacna', 'Tumbes', 'Ucayali',
] as const;

interface DepartamentoPickerProps {
  value: string;
  onSelect: (departamento: string) => void;
  error?: string;
}

export function DepartamentoPicker({ value, onSelect, error }: DepartamentoPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Departamento *</Text>
      <TouchableOpacity
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={20} color={Colors.gray} style={styles.icon} />
        <Text style={[styles.triggerText, !value && styles.placeholder]}>
          {value || 'Selecciona tu departamento'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {open && (
        <View style={styles.list}>
          <ScrollView
            nestedScrollEnabled
            style={styles.listScroll}
            keyboardShouldPersistTaps="handled"
          >
            {DEPARTAMENTOS_PERU.map((dep) => (
              <TouchableOpacity
                key={dep}
                style={[styles.item, value === dep && styles.itemSelected]}
                onPress={() => {
                  onSelect(dep);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.itemText, value === dep && styles.itemTextSelected]}>
                  {dep}
                </Text>
                {value === dep && (
                  <Ionicons name="checkmark" size={16} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Layout.spacing.md,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 14,
    backgroundColor: Colors.cardBackground,
    gap: Layout.spacing.sm,
  },
  triggerError: {
    borderColor: Colors.error,
  },
  icon: {
    marginRight: 4,
  },
  triggerText: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.gray,
  },
  errorText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.error,
    marginTop: 4,
  },
  list: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    marginTop: 4,
    backgroundColor: Colors.cardBackground,
    maxHeight: 200,
  },
  listScroll: {
    maxHeight: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemSelected: {
    backgroundColor: `${Colors.primary}15`,
  },
  itemText: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
  },
  itemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
