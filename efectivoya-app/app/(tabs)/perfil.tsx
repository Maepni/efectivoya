import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';

export default function PerfilScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={Colors.white} />
        </View>
        <Text style={styles.name}>
          {user?.nombres} {user?.apellidos}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Card style={styles.infoCard}>
        <InfoRow label="DNI" value={user?.dni || '-'} />
        <InfoRow label="WhatsApp" value={user?.whatsapp || '-'} />
        <InfoRow label="Código referido" value={user?.codigo_referido || '-'} />
        <InfoRow
          label="Miembro desde"
          value={user?.created_at
            ? new Date(user.created_at).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: 'long',
              })
            : '-'}
        />
      </Card>

      <View style={styles.placeholderSection}>
        <Ionicons name="settings-outline" size={32} color={Colors.gray} />
        <Text style={styles.placeholderText}>
          Más opciones de perfil próximamente
        </Text>
      </View>

      <Button
        title="Cerrar Sesión"
        onPress={handleLogout}
        variant="outline"
        style={styles.logoutButton}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  name: {
    fontSize: FontSize.h3,
    fontWeight: 'bold',
    color: Colors.white,
  },
  email: {
    fontSize: FontSize.caption,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  infoCard: {
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  infoLabel: {
    fontSize: FontSize.caption,
    color: Colors.gray,
  },
  infoValue: {
    fontSize: FontSize.caption,
    color: Colors.white,
    fontWeight: '500',
  },
  placeholderSection: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  placeholderText: {
    fontSize: FontSize.caption,
    color: Colors.gray,
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
});
