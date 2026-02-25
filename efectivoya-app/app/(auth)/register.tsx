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
import { DepartamentoPicker } from '../../src/components/DepartamentoPicker';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';

const validators = {
  email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email inválido',
  dni: (v: string) => /^\d{8}$/.test(v) ? '' : 'DNI debe tener 8 dígitos',
  whatsapp: (v: string) => /^\d{9}$/.test(v) ? '' : 'WhatsApp debe tener 9 dígitos',
  password: (v: string) => {
    if (v.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(v)) return 'Debe incluir una mayúscula';
    if (!/\d/.test(v)) return 'Debe incluir un número';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(v)) return 'Debe incluir un símbolo';
    return '';
  },
};

export default function RegisterScreen() {
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    dni: '',
    whatsapp: '',
    departamento: '',
    distrito: '',
    direccion: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.nombres.trim()) newErrors.nombres = 'Nombre requerido';
    if (!form.apellidos.trim()) newErrors.apellidos = 'Apellido requerido';

    const emailErr = validators.email(form.email);
    if (emailErr) newErrors.email = emailErr;

    const dniErr = validators.dni(form.dni);
    if (dniErr) newErrors.dni = dniErr;

    const whatsappErr = validators.whatsapp(form.whatsapp);
    if (whatsappErr) newErrors.whatsapp = whatsappErr;

    if (!form.departamento) newErrors.departamento = 'Departamento requerido';
    if (!form.distrito.trim()) newErrors.distrito = 'Distrito requerido';
    if (!form.direccion.trim()) newErrors.direccion = 'Dirección requerida';

    const passwordErr = validators.password(form.password);
    if (passwordErr) newErrors.password = passwordErr;

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setApiError('');
    if (!validate()) return;

    const result = await register({
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      email: form.email.trim().toLowerCase(),
      dni: form.dni.trim(),
      whatsapp: form.whatsapp.trim(),
      departamento: form.departamento,
      distrito: form.distrito.trim(),
      direccion: form.direccion.trim(),
      password: form.password,
    });

    if (result.success && result.userId) {
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { userId: result.userId, email: result.email || form.email },
      });
    } else {
      setApiError(result.message || 'Error al registrarse');
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
        <Text style={styles.title}>Crear Cuenta</Text>

        {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

        <Input
          label="Nombre"
          icon="person-outline"
          placeholder="Tu nombre"
          value={form.nombres}
          onChangeText={(v) => updateField('nombres', v)}
          error={errors.nombres}
          autoCapitalize="words"
        />

        <Input
          label="Apellido"
          icon="person-outline"
          placeholder="Tu apellido"
          value={form.apellidos}
          onChangeText={(v) => updateField('apellidos', v)}
          error={errors.apellidos}
          autoCapitalize="words"
        />

        <Input
          label="Correo electrónico"
          icon="mail-outline"
          placeholder="tu@email.com"
          value={form.email}
          onChangeText={(v) => updateField('email', v)}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="DNI"
          icon="card-outline"
          placeholder="12345678"
          value={form.dni}
          onChangeText={(v) => updateField('dni', v)}
          error={errors.dni}
          keyboardType="numeric"
          maxLength={8}
        />

        <Input
          label="WhatsApp"
          icon="logo-whatsapp"
          placeholder="987654321"
          value={form.whatsapp}
          onChangeText={(v) => updateField('whatsapp', v)}
          error={errors.whatsapp}
          keyboardType="phone-pad"
          maxLength={9}
        />

        <DepartamentoPicker
          value={form.departamento}
          onSelect={(dep) => {
            setForm((prev) => ({ ...prev, departamento: dep }));
            if (errors.departamento) {
              setErrors((prev) => ({ ...prev, departamento: '' }));
            }
          }}
          error={errors.departamento}
        />

        <Input
          label="Distrito"
          icon="map-outline"
          placeholder="Ej: Miraflores"
          value={form.distrito}
          onChangeText={(v) => updateField('distrito', v)}
          error={errors.distrito}
          autoCapitalize="words"
        />

        <Input
          label="Dirección"
          icon="home-outline"
          placeholder="Ej: Av. Principal 123"
          value={form.direccion}
          onChangeText={(v) => updateField('direccion', v)}
          error={errors.direccion}
          autoCapitalize="sentences"
        />

        <Input
          label="Contraseña"
          icon="lock-closed-outline"
          placeholder="Mín. 8 caracteres"
          value={form.password}
          onChangeText={(v) => updateField('password', v)}
          error={errors.password}
          isPassword
        />

        <Input
          label="Confirmar contraseña"
          icon="lock-closed-outline"
          placeholder="Repite tu contraseña"
          value={form.confirmPassword}
          onChangeText={(v) => updateField('confirmPassword', v)}
          error={errors.confirmPassword}
          isPassword
        />

        <Button
          title="Registrarme"
          onPress={handleRegister}
          loading={isLoading}
          style={styles.button}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Inicia sesión</Text>
            </TouchableOpacity>
          </Link>
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
    padding: Spacing.xl,
    paddingTop: 60,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.xl,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.caption,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  button: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
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
