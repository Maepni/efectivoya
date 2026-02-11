import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pendiente: { bg: `${Colors.pendiente}20`, text: Colors.pendiente, label: 'Pendiente' },
  aprobado: { bg: `${Colors.aprobado}20`, text: Colors.aprobado, label: 'Aprobado' },
  rechazado: { bg: `${Colors.rechazado}20`, text: Colors.rechazado, label: 'Rechazado' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.pendiente;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
