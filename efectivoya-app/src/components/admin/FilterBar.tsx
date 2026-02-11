import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  estadoOptions?: FilterOption[];
  estadoValue: string;
  onEstadoChange: (val: string) => void;
  bancoOptions?: FilterOption[];
  bancoValue?: string;
  onBancoChange?: (val: string) => void;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  estadoOptions,
  estadoValue,
  onEstadoChange,
  bancoOptions,
  bancoValue,
  onBancoChange,
}: FilterBarProps) {
  const defaultEstados: FilterOption[] = [
    { label: 'Todos', value: '' },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Aprobado', value: 'aprobado' },
    { label: 'Rechazado', value: 'rechazado' },
  ];

  const estados = estadoOptions ?? defaultEstados;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder={searchPlaceholder}
        placeholderTextColor={Colors.gray}
        value={searchValue}
        onChangeText={onSearchChange}
      />

      <View style={styles.chipRow}>
        {estados.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, estadoValue === opt.value && styles.chipActive]}
            onPress={() => onEstadoChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, estadoValue === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {bancoOptions && onBancoChange && (
        <View style={styles.chipRow}>
          {bancoOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, bancoValue === opt.value && styles.chipActive]}
              onPress={() => onBancoChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, bancoValue === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.lg,
  },
  searchInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    color: Colors.white,
    fontSize: Layout.fontSize.sm,
    height: 40,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  chip: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.primary,
  },
});
