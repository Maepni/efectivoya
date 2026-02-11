import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
}

export function MetricCard({ title, value, subtitle, accentColor = Colors.primary }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    flex: 1,
  },
  accentBar: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginBottom: Layout.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
  },
});
