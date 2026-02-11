import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { StatusBadge } from '../../../src/components/admin/StatusBadge';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminDashboardService } from '../../../src/services/adminDashboard.service';
import type { RecentClient, RawRecentRecarga, RawRecentRetiro } from '../../../src/types/admin';

function extractRecentClients(
  recargas: RawRecentRecarga[],
  retiros: RawRecentRetiro[]
): RecentClient[] {
  const clientMap = new Map<string, RecentClient>();

  for (const r of recargas) {
    const existing = clientMap.get(r.user_id);
    if (!existing || new Date(r.created_at) > new Date(existing.lastOpDate)) {
      clientMap.set(r.user_id, {
        id: r.user_id,
        email: r.user.email,
        nombres: r.user.nombres,
        apellidos: r.user.apellidos,
        lastOpType: 'recarga',
        lastOpDate: r.created_at,
        lastOpAmount: r.monto_depositado,
        lastOpStatus: r.estado,
      });
    }
  }

  for (const r of retiros) {
    const existing = clientMap.get(r.user_id);
    if (!existing || new Date(r.created_at) > new Date(existing.lastOpDate)) {
      clientMap.set(r.user_id, {
        id: r.user_id,
        email: r.user.email,
        nombres: r.user.nombres,
        apellidos: r.user.apellidos,
        lastOpType: 'retiro',
        lastOpDate: r.created_at,
        lastOpAmount: r.monto,
        lastOpStatus: r.estado,
      });
    }
  }

  return Array.from(clientMap.values()).sort(
    (a, b) => new Date(b.lastOpDate).getTime() - new Date(a.lastOpDate).getTime()
  );
}

export default function AdminRecientesScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<RecentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await adminDashboardService.getRecentActivity(50);
    if (res.success && res.data) {
      setClients(extractRecentClients(res.data.recargas_recientes, res.data.retiros_recientes));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (val: number | string) => `S/. ${Number(val).toFixed(2)}`;
  const formatDate = (val: string) =>
    new Date(val).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const renderItem = ({ item }: { item: RecentClient }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(admin)/clientes/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardUser}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={Colors.gray} />
          </View>
          <View style={styles.cardUserInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.nombres} {item.apellidos}</Text>
            <Text style={styles.cardEmail} numberOfLines={1}>{item.email}</Text>
          </View>
        </View>
        <StatusBadge status={item.lastOpStatus} />
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.opInfo}>
          <Ionicons
            name={item.lastOpType === 'recarga' ? 'arrow-up-circle' : 'arrow-down-circle'}
            size={16}
            color={item.lastOpType === 'recarga' ? Colors.success : Colors.primary}
          />
          <Text style={styles.opText}>
            {item.lastOpType === 'recarga' ? 'Recarga' : 'Retiro'} {formatCurrency(item.lastOpAmount)}
          </Text>
        </View>
        <Text style={styles.dateText}>{formatDate(item.lastOpDate)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Recientes" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="Recientes" />
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No hay actividad reciente</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xxl,
  },
  listContent: {
    padding: Layout.spacing.lg,
    gap: Layout.spacing.md,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  cardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Layout.spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
  },
  cardUserInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  cardEmail: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  opText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
    fontWeight: '500',
  },
  dateText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
  },
});
