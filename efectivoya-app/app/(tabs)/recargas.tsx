import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';

export default function RecargasScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="arrow-up-circle-outline" size={64} color={Colors.gray} />
      <Text style={styles.title}>Recargas</Text>
      <Text style={styles.subtitle}>Próximamente</Text>
      <Text style={styles.description}>
        Podrás recargar tu saldo subiendo el boucher de tu depósito bancario.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.secondary,
    marginTop: Spacing.sm,
  },
  description: {
    fontSize: FontSize.caption,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 20,
  },
});
