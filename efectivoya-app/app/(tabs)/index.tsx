import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/services/auth.service';
import { Card } from '../../src/components/Card';
import { Colors } from '../../src/constants/colors';
import { FontSize, Spacing } from '../../src/constants/layout';
import type { DashboardData, Operacion } from '../../src/types';

const estadoColor: Record<string, string> = {
  pendiente: Colors.pendiente,
  aprobado: Colors.aprobado,
  rechazado: Colors.rechazado,
};

function formatCurrency(amount: number | string): string {
  return `S/. ${Number(amount).toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { refreshUser } = useAuthStore();

  const fetchDashboard = useCallback(async () => {
    const response = await authService.getDashboard();
    if (response.success && response.data) {
      setDashboard(response.data as DashboardData);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      refreshUser();
    }, [fetchDashboard, refreshUser])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      <Text style={styles.greeting}>
        Hola, {user?.nombres || 'Usuario'}
      </Text>

      {/* Saldo */}
      <Card style={styles.saldoCard}>
        <Text style={styles.saldoLabel}>Saldo disponible</Text>
        <Text style={styles.saldoAmount}>
          {formatCurrency(dashboard?.saldo_disponible ?? user?.saldo_actual ?? 0)}
        </Text>
      </Card>

      {/* Stats del mes */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {dashboard?.este_mes?.cantidad_recargas ?? 0}
          </Text>
          <Text style={styles.statLabel}>Recargas</Text>
          <Text style={styles.statAmount}>
            {formatCurrency(dashboard?.este_mes?.total_recargado ?? 0)}
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {dashboard?.este_mes?.cantidad_retiros ?? 0}
          </Text>
          <Text style={styles.statLabel}>Retiros</Text>
          <Text style={styles.statAmount}>
            {formatCurrency(dashboard?.este_mes?.total_retirado ?? 0)}
          </Text>
        </Card>
      </View>

      {/* Últimas operaciones */}
      <Text style={styles.sectionTitle}>Últimas operaciones</Text>
      {dashboard?.ultimas_operaciones?.length ? (
        dashboard.ultimas_operaciones.map((op: Operacion) => (
          <Card key={op.id} style={styles.operacionCard}>
            <View style={styles.operacionRow}>
              <View>
                <Text style={styles.operacionTipo}>
                  {op.tipo === 'recarga' ? 'Recarga' : 'Retiro'}
                </Text>
                <Text style={styles.operacionFecha}>
                  {formatDate(op.created_at)}
                </Text>
              </View>
              <View style={styles.operacionRight}>
                <Text style={[
                  styles.operacionMonto,
                  { color: op.tipo === 'recarga' ? Colors.aprobado : Colors.primary },
                ]}>
                  {op.tipo === 'recarga' ? '+' : '-'}{formatCurrency(op.monto)}
                </Text>
                <Text style={[
                  styles.operacionEstado,
                  { color: estadoColor[op.estado] || Colors.gray },
                ]}>
                  {op.estado}
                </Text>
              </View>
            </View>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.emptyText}>
            Aún no tienes operaciones. ¡Haz tu primera recarga!
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  greeting: {
    fontSize: FontSize.h3,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.lg,
  },
  saldoCard: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  saldoLabel: {
    fontSize: FontSize.caption,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  saldoAmount: {
    fontSize: FontSize.h1,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.h2,
    fontWeight: 'bold',
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSize.small,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  statAmount: {
    fontSize: FontSize.caption,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.h3,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  operacionCard: {
    marginBottom: Spacing.sm,
  },
  operacionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  operacionTipo: {
    fontSize: FontSize.body,
    color: Colors.white,
    fontWeight: '500',
  },
  operacionFecha: {
    fontSize: FontSize.small,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  operacionRight: {
    alignItems: 'flex-end',
  },
  operacionMonto: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  operacionEstado: {
    fontSize: FontSize.small,
    marginTop: Spacing.xs,
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: FontSize.caption,
    color: Colors.gray,
    textAlign: 'center',
  },
});
