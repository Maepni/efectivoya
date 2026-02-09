import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos');
      return;
    }

    const result = await login(email.trim().toLowerCase(), password);

    if (result.type === 'success') {
      router.replace('/(tabs)');
    } else if (result.type === 'unverified') {
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { userId: result.userId, email: result.email },
      });
    } else {
      setError(result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>
            Efectivo<Text style={styles.logoAccent}>Ya</Text>
          </Text>
          <Text style={styles.tagline}>Tu Dinero Al Instante</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Iniciar Sesión</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Input
            label="Correo electrónico"
            icon="mail-outline"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label="Contraseña"
            icon="lock-closed-outline"
            placeholder="Tu contraseña"
            value={password}
            onChangeText={setPassword}
            isPassword
          />

          <Button
            title="Ingresar"
            onPress={handleLogin}
            loading={isLoading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Regístrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    fontSize: FontSize.h1,
    fontWeight: 'bold',
    color: Colors.white,
  },
  logoAccent: {
    color: Colors.primary,
  },
  tagline: {
    fontSize: FontSize.caption,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.caption,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    color: Colors.gray,
    fontSize: FontSize.caption,
  },
  link: {
    color: Colors.primary,
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});
