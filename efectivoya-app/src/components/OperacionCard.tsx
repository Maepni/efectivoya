import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface OperacionCardProps {
  tipo: 'recarga' | 'retiro';
  numero_operacion: string;
  monto: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  fecha: string;
  banco?: string;
  motivo_rechazo?: string | null;
  onPress?: () => void;
}

export function OperacionCard({
  tipo,
  numero_operacion,
  monto,
  estado,
  fecha,
  banco,
  motivo_rechazo,
  onPress,
}: OperacionCardProps) {
  const getEstadoColor = () => {
    switch (estado) {
      case 'aprobado':
        return Colors.success;
      case 'pendiente':
        return Colors.warning;
      case 'rechazado':
        return Colors.error;
      default:
        return Colors.gray;
    }
  };

  const getEstadoIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (estado) {
      case 'aprobado':
        return 'checkmark-circle';
      case 'pendiente':
        return 'time';
      case 'rechazado':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const estadoColor = getEstadoColor();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor:
              tipo === 'recarga'
                ? Colors.success + '20'
                : Colors.secondary + '20',
          },
        ]}
      >
        <Ionicons
          name={tipo === 'recarga' ? 'arrow-down' : 'arrow-up'}
          size={24}
          color={tipo === 'recarga' ? Colors.success : Colors.secondary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.tipo}>
            {tipo === 'recarga' ? 'Recarga' : 'Retiro'}
          </Text>
          <Text
            style={[
              styles.monto,
              { color: tipo === 'recarga' ? Colors.success : Colors.error },
            ]}
          >
            {tipo === 'recarga' ? '+' : '-'}S/. {monto.toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.numero}>{numero_operacion}</Text>
          <View
            style={[
              styles.estadoBadge,
              { backgroundColor: estadoColor + '20' },
            ]}
          >
            <Ionicons
              name={getEstadoIcon()}
              size={12}
              color={estadoColor}
              style={styles.estadoIcon}
            />
            <Text style={[styles.estadoText, { color: estadoColor }]}>
              {estado}
            </Text>
          </View>
        </View>

        {banco && <Text style={styles.banco}>Banco: {banco}</Text>}

        {estado === 'rechazado' && motivo_rechazo && (
          <Text style={styles.motivoRechazo}>Motivo: {motivo_rechazo}</Text>
        )}

        <Text style={styles.fecha}>
          {new Date(fecha).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </TouchableOpacity>
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
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  tipo: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
  },
  monto: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
  },
  numero: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  estadoIcon: {
    marginRight: 4,
  },
  estadoText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  banco: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
  },
  motivoRechazo: {
    fontSize: Layout.fontSize.xs,
    color: Colors.error,
    marginTop: Layout.spacing.xs,
  },
  fecha: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
  },
});
