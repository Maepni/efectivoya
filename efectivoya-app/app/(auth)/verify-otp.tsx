import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/Button';
import { authService } from '../../src/services/auth.service';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing, BorderRadius } from '../../src/constants/layout';

export default function VerifyOTPScreen() {
  const { userId, email } = useLocalSearchParams<{ userId: string; email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const { verifyOTP, isLoading } = useAuthStore();
  const router = useRouter();
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setError('');
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Ingresa los 6 dígitos');
      return;
    }

    if (!userId) {
      setError('Error: userId no proporcionado');
      return;
    }

    const result = await verifyOTP(userId, otpString);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.message || 'Código inválido');
    }
  };

  const handleResend = async () => {
    if (!userId) return;
    setResendMessage('');
    setError('');

    const result = await authService.resendOTP(userId);
    if (result.success) {
      setResendMessage('Código reenviado a tu correo');
    } else {
      setError(result.message || 'Error al reenviar');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Verificar Email</Text>
        <Text style={styles.subtitle}>
          Ingresa el código de 6 dígitos enviado a
        </Text>
        <Text style={styles.email}>{email || 'tu correo'}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {resendMessage ? <Text style={styles.successText}>{resendMessage}</Text> : null}

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[styles.otpInput, digit && styles.otpInputFilled]}
              value={digit}
              onChangeText={(v) => handleOtpChange(index, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
            />
          ))}
        </View>

        <Button
          title="Verificar"
          onPress={handleVerify}
          loading={isLoading}
          style={styles.button}
        />

        <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
          <Text style={styles.resendText}>¿No recibiste el código? </Text>
          <Text style={styles.resendLink}>Reenviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.gray,
    textAlign: 'center',
  },
  email: {
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: Spacing.xl,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.caption,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successText: {
    color: Colors.success,
    fontSize: FontSize.caption,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    color: Colors.white,
    fontSize: FontSize.h2,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  otpInputFilled: {
    borderColor: Colors.primary,
  },
  button: {
    marginBottom: Spacing.lg,
  },
  resendButton: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resendText: {
    color: Colors.gray,
    fontSize: FontSize.caption,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});
