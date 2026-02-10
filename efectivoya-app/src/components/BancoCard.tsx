import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { UserBank } from '../types';

interface BancoCardProps {
  banco: UserBank;
  onDelete?: () => void;
}

export function BancoCard({ banco, onDelete }: BancoCardProps) {
  const handleDelete = () => {
    Alert.alert(
      'Eliminar Banco',
      `¿Estás seguro de eliminar ${banco.alias || banco.banco}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const getBancoIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (banco.banco) {
      case 'BCP':
        return 'card';
      case 'Interbank':
        return 'wallet';
      case 'Scotiabank':
        return 'cash';
      case 'BBVA':
        return 'briefcase';
      default:
        return 'business';
    }
  };

  const maskAccount = (num: string) => {
    if (num.length <= 4) return num;
    return '****' + num.slice(-4);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={getBancoIcon()} size={32} color={Colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.bancoName}>{banco.banco}</Text>
        {banco.alias && <Text style={styles.alias}>{banco.alias}</Text>}
        <Text style={styles.cuenta}>
          Cuenta: {maskAccount(banco.numero_cuenta)}
        </Text>
        <Text style={styles.cci}>CCI: {maskAccount(banco.cci)}</Text>
      </View>

      {onDelete && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.lg,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  content: {
    flex: 1,
  },
  bancoName: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: 2,
  },
  alias: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.xs,
  },
  cuenta: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
    marginBottom: 2,
  },
  cci: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
  },
  actions: {
    justifyContent: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
