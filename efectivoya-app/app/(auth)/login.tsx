import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';
import { useResponsive } from '../../src/hooks/useResponsive';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | null>(null);
  const { login, loginWithBiometric, hasBiometricToken, isLoading } = useAuthStore();
  const router = useRouter();
  const { isDesktop } = useResponsive();

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return;
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) return;
      const hasToken = await hasBiometricToken();
      if (!hasToken) return;

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('face');
      } else {
        setBiometricType('fingerprint');
      }
      setBiometricAvailable(true);
    } catch { /* sin biometría disponible */ }
  };

  const handleBiometricLogin = async () => {
    setError('');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Ingresa a EfectivoYa',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (!result.success) return;

      const loginResult = await loginWithBiometric();
      if (loginResult.success) {
        router.replace('/(tabs)');
      } else {
        setError(loginResult.message || 'Error de autenticación');
        setBiometricAvailable(false);
      }
    } catch {
      setError('Error al usar biometría. Ingresa con tu contraseña.');
    }
  };

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
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
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

          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              activeOpacity={0.7}
            >
              <Ionicons
                name={biometricType === 'face' ? 'scan-outline' : 'finger-print-outline'}
                size={28}
                color={Colors.primary}
              />
              <Text style={styles.biometricText}>
                {biometricType === 'face' ? 'Ingresar con Face ID' : 'Ingresar con huella'}
              </Text>
            </TouchableOpacity>
          )}

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
  scrollContentDesktop: {
    maxWidth: 460,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: Spacing.sm,
    borderRadius: 20,
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  biometricText: {
    color: Colors.primary,
    fontSize: FontSize.body,
    fontWeight: '600',
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
