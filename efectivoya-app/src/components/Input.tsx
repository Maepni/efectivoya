import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { BorderRadius, FontSize, Spacing } from '../constants/layout';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  icon,
  isPassword,
  containerStyle,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={Colors.gray}
            style={styles.icon}
          />
        )}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon]}
          placeholderTextColor={Colors.gray}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={Colors.gray}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    color: Colors.white,
    fontSize: FontSize.caption,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.input,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  inputError: {
    borderColor: Colors.error,
  },
  icon: {
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    color: Colors.white,
    fontSize: FontSize.body,
    paddingHorizontal: Spacing.md,
  },
  inputWithIcon: {
    paddingLeft: Spacing.sm,
  },
  eyeIcon: {
    paddingRight: Spacing.md,
  },
  error: {
    color: Colors.error,
    fontSize: FontSize.small,
    marginTop: Spacing.xs,
  },
});
