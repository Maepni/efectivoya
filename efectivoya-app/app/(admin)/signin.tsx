import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';
import { useAdminAuthStore } from '../../src/store/adminAuthStore';

export default function AdminLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAdminAuthStore();

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    const result = await login(email.trim(), password);
    if (!result.success) {
      setError(result.message || 'Credenciales incorrectas');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>EfectivoYa</Text>
        <Text style={styles.subtitle}>Panel de Administración</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Input
          label="Email"
          placeholder="admin@efectivoya.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          icon="mail-outline"
        />

        <Input
          label="Contraseña"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          isPassword
          icon="lock-closed-outline"
        />

        <Button
          title="Iniciar Sesión"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.button}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.xxl,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Layout.spacing.xs,
  },
  subtitle: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Layout.spacing.xxl,
  },
  error: {
    color: Colors.error,
    fontSize: Layout.fontSize.sm,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
    backgroundColor: `${Colors.error}15`,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
  },
  button: {
    marginTop: Layout.spacing.lg,
  },
});
