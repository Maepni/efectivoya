import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { StatusBadge } from '../../../src/components/admin/StatusBadge';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminUsersService } from '../../../src/services/adminUsers.service';
import type { AdminUserDetail } from '../../../src/types/admin';

interface OperationItem {
  id: string;
  type: 'recarga' | 'retiro';
  numero_operacion: string;
  monto: number | string;
  estado: string;
  created_at: string;
  detail: string;
}

function mergeOperations(data: AdminUserDetail): OperationItem[] {
  const ops: OperationItem[] = [];

  for (const r of data.user.recargas) {
    ops.push({
      id: r.id,
      type: 'recarga',
      numero_operacion: r.numero_operacion,
      monto: r.monto_depositado,
      estado: r.estado,
      created_at: r.created_at,
      detail: r.banco_origen,
    });
  }

  for (const r of data.user.retiros) {
    ops.push({
      id: r.id,
      type: 'retiro',
      numero_operacion: r.numero_operacion,
      monto: r.monto,
      estado: r.estado,
      created_at: r.created_at,
      detail: r.banco?.banco ?? '',
    });
  }

  return ops.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function AdminClienteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const res = await adminUsersService.getDetail(id);
    if (res.success && res.data) {
      setData(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleStatus = () => {
    if (!data || !id) return;
    const isActive = data.user.is_active;
    const action = isActive ? 'suspender' : 'activar';

    const doToggle = async () => {
      setToggling(true);
      const res = await adminUsersService.toggleStatus(id);
      if (res.success) {
        fetchData();
      } else {
        if (Platform.OS === 'web') {
          alert(res.message || `Error al ${action} usuario`);
        } else {
          Alert.alert('Error', res.message || `Error al ${action} usuario`);
        }
      }
      setToggling(false);
    };

    if (Platform.OS === 'web') {
      if (confirm(`¿Deseas ${action} a este usuario?`)) doToggle();
    } else {
      Alert.alert(
        'Confirmar',
        `¿Deseas ${action} a este usuario?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: isActive ? 'Suspender' : 'Activar', style: isActive ? 'destructive' : 'default', onPress: doToggle },
        ]
      );
    }
  };

  const formatCurrency = (val: number | string) => `S/. ${Number(val).toFixed(2)}`;
  const formatDate = (val: string) =>
    new Date(val).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatDateTime = (val: string) =>
    new Date(val).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Cliente" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Cliente" />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Usuario no encontrado</Text>
        </View>
      </View>
    );
  }

  const { user, estadisticas } = data;
  const operations = mergeOperations(data);

  return (
    <View style={styles.container}>
      <AdminHeader title={`${user.nombres} ${user.apellidos}`} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Card 1: Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información</Text>
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="DNI" value={user.dni} />
          <InfoRow label="WhatsApp" value={user.whatsapp} />
          <InfoRow label="Código referido" value={user.codigo_referido} />
          <InfoRow label="Saldo" value={formatCurrency(user.saldo_actual)} highlight />
          <InfoRow label="Registrado" value={formatDate(user.created_at)} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.statusDot, { backgroundColor: user.is_active ? Colors.success : Colors.gray }]}>
                <Text style={styles.statusDotText}>{user.is_active ? 'Activo' : 'Inactivo'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: user.is_active ? `${Colors.error}20` : `${Colors.success}20`, borderColor: user.is_active ? Colors.error : Colors.success }]}
                onPress={handleToggleStatus}
                disabled={toggling}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: user.is_active ? Colors.error : Colors.success }}>
                  {toggling ? '...' : user.is_active ? 'Suspender' : 'Activar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Card 2: Estadísticas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estadísticas</Text>
          <View style={styles.statsRow}>
            <StatBox label="Recargado" value={formatCurrency(estadisticas.total_recargado)} color={Colors.success} />
            <StatBox label="Retirado" value={formatCurrency(estadisticas.total_retirado)} color={Colors.primary} />
            <StatBox label="Saldo" value={formatCurrency(estadisticas.saldo_actual)} color={Colors.secondary} />
          </View>
        </View>

        {/* Card 3: Operaciones */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Operaciones</Text>
          {operations.length === 0 ? (
            <Text style={styles.emptyText}>Sin operaciones</Text>
          ) : (
            operations.map((op) => (
              <TouchableOpacity
                key={`${op.type}-${op.id}`}
                style={styles.opItem}
                onPress={() => {
                  if (op.type === 'recarga') {
                    router.push(`/(admin)/recargas/${op.id}` as any);
                  } else {
                    router.push(`/(admin)/retiros/${op.id}` as any);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.opLeft}>
                  <Ionicons
                    name={op.type === 'recarga' ? 'arrow-up-circle' : 'arrow-down-circle'}
                    size={24}
                    color={op.type === 'recarga' ? Colors.success : Colors.primary}
                  />
                  <View style={styles.opInfo}>
                    <Text style={styles.opNum}>{op.numero_operacion}</Text>
                    <Text style={styles.opDetail}>{op.detail} | {formatDateTime(op.created_at)}</Text>
                  </View>
                </View>
                <View style={styles.opRight}>
                  <Text style={styles.opMonto}>{formatCurrency(op.monto)}</Text>
                  <StatusBadge status={op.estado} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, highlight && infoStyles.highlight]}>{value}</Text>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 13,
    color: Colors.gray,
  },
  value: {
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '500',
  },
  highlight: {
    color: Colors.secondary,
    fontWeight: '700',
  },
});

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  value: {
    fontSize: Layout.fontSize.md,
    fontWeight: '700',
  },
  label: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
  },
  cardTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: Layout.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.gray,
  },
  statusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  opItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  opLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Layout.spacing.md,
  },
  opInfo: {
    marginLeft: Layout.spacing.md,
    flex: 1,
  },
  opNum: {
    fontSize: Layout.fontSize.xs,
    color: Colors.accent,
    fontWeight: '600',
  },
  opDetail: {
    fontSize: 11,
    color: Colors.gray,
    marginTop: 2,
  },
  opRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  opMonto: {
    fontSize: Layout.fontSize.xs,
    color: Colors.accent,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    textAlign: 'center',
    padding: Layout.spacing.lg,
  },
});
