import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminHeader } from '../../src/components/admin/AdminHeader';
import { MetricCard } from '../../src/components/admin/MetricCard';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';
import { adminDashboardService } from '../../src/services/adminDashboard.service';
import { adminRecargasService } from '../../src/services/adminRecargas.service';
import { adminRetirosService } from '../../src/services/adminRetiros.service';
import { useResponsive } from '../../src/hooks/useResponsive';
import type { AdminDashboardMetrics, AdminTrends, AdminRecargaListItem, AdminRetiroListItem } from '../../src/types/admin';

type PendingItem =
  | { type: 'recarga'; id: string; numeroOperacion: string; nombre: string; monto: string; fecha: Date }
  | { type: 'retiro'; id: string; numeroOperacion: string; nombre: string; monto: string; fecha: Date };

export default function AdminDashboardScreen() {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [trends, setTrends] = useState<AdminTrends | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isMobile } = useResponsive();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const promises: Promise<void>[] = [];
    let metricsData: AdminDashboardMetrics | null = null;

    // Siempre fetch metrics
    promises.push(
      adminDashboardService.getMetrics().then((res) => {
        if (res.success && res.data) metricsData = res.data;
      })
    );

    if (isMobile) {
      // Móvil: fetch pendientes en vez de tendencias
      let recargas: AdminRecargaListItem[] = [];
      let retiros: AdminRetiroListItem[] = [];
      promises.push(
        adminRecargasService.getPendientes(1, 50).then((res) => {
          if (res.success && res.data) recargas = res.data.recargas;
        })
      );
      promises.push(
        adminRetirosService.getPendientes().then((res) => {
          if (res.success && res.data) retiros = res.data.retiros;
        })
      );
      await Promise.all(promises);
      setMetrics(metricsData);

      // Unificar y ordenar
      const items: PendingItem[] = [];
      for (const r of recargas) {
        items.push({
          type: 'recarga',
          id: r.id,
          numeroOperacion: r.numeroOperacion,
          nombre: `${r.usuario.nombres} ${r.usuario.apellidos}`,
          monto: String(r.montoDepositado),
          fecha: parseFecha(r.fecha),
        });
      }
      for (const r of retiros) {
        items.push({
          type: 'retiro',
          id: r.id,
          numeroOperacion: r.numero_operacion,
          nombre: r.usuario ? `${r.usuario.nombres} ${r.usuario.apellidos}` : 'Usuario',
          monto: `S/. ${Number(r.monto).toFixed(2)}`,
          fecha: new Date(r.created_at),
        });
      }
      items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      setPendingItems(items);
    } else {
      // Desktop: fetch tendencias
      let trendsData: AdminTrends | null = null;
      promises.push(
        adminDashboardService.getTrends().then((res) => {
          if (res.success && res.data) trendsData = res.data;
        })
      );
      await Promise.all(promises);
      setMetrics(metricsData);
      if (trendsData) setTrends(trendsData);
    }

    setLoading(false);
    setRefreshing(false);
  }, [isMobile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (val: number | string) => `S/. ${Number(val).toFixed(2)}`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AdminHeader title={isMobile ? 'Inicio' : 'Dashboard'} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  // --------------- MÓVIL ---------------
  if (isMobile) {
    const totalPendientes =
      (metrics?.operaciones.recargas.pendientes ?? 0) +
      (metrics?.operaciones.retiros.pendientes ?? 0);
    const totalHoy =
      (metrics?.operaciones.recargas.hoy ?? 0) +
      (metrics?.operaciones.retiros.hoy ?? 0);

    return (
      <View style={styles.container}>
        <AdminHeader title="Inicio" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {/* Mini métricas */}
          <View style={styles.miniMetricsRow}>
            <View style={[styles.miniMetricCard, { borderLeftColor: Colors.warning }]}>
              <Text style={styles.miniMetricValue}>{totalPendientes}</Text>
              <Text style={styles.miniMetricLabel}>Pendientes</Text>
            </View>
            <View style={[styles.miniMetricCard, { borderLeftColor: Colors.success }]}>
              <Text style={styles.miniMetricValue}>{totalHoy}</Text>
              <Text style={styles.miniMetricLabel}>Hoy</Text>
            </View>
            <View style={[styles.miniMetricCard, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.miniMetricValue}>{metrics?.alertas.pendientes ?? 0}</Text>
              <Text style={styles.miniMetricLabel}>Alertas</Text>
            </View>
          </View>

          {/* Lista de pendientes */}
          <Text style={styles.sectionTitle}>Operaciones Pendientes</Text>
          {pendingItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay operaciones pendientes</Text>
            </View>
          ) : (
            pendingItems.map((item) => (
              <Pressable
                key={`${item.type}-${item.id}`}
                style={({ pressed }) => [styles.pendingCard, pressed && styles.pendingCardPressed]}
                onPress={() => {
                  if (item.type === 'recarga') {
                    router.push(`/(admin)/recargas/${item.id}`);
                  } else {
                    router.push(`/(admin)/retiros/${item.id}`);
                  }
                }}
              >
                <View style={styles.pendingCardHeader}>
                  <View style={styles.pendingTypeRow}>
                    <Text style={[
                      styles.pendingTypeBadge,
                      item.type === 'recarga' ? styles.badgeRecarga : styles.badgeRetiro,
                    ]}>
                      {item.type === 'recarga' ? '↑ Recarga' : '↓ Retiro'}
                    </Text>
                    <Text style={styles.pendingOp}>#{item.numeroOperacion}</Text>
                  </View>
                  <Text style={styles.pendingMonto}>{item.monto}</Text>
                </View>
                <View style={styles.pendingCardFooter}>
                  <Text style={styles.pendingNombre} numberOfLines={1}>{item.nombre}</Text>
                  <Text style={styles.pendingFecha}>
                    {item.fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // --------------- DESKTOP ---------------
  return (
    <View style={styles.container}>
      <AdminHeader title="Dashboard" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Métricas principales */}
        <Text style={styles.sectionTitle}>Usuarios</Text>
        <View style={styles.metricsRow}>
          <MetricCard title="Total" value={metrics?.usuarios.total ?? 0} accentColor={Colors.accent} />
          <MetricCard title="Activos" value={metrics?.usuarios.activos ?? 0} accentColor={Colors.success} />
          <MetricCard title="Inactivos" value={metrics?.usuarios.inactivos ?? 0} accentColor={Colors.gray} />
        </View>

        <Text style={styles.sectionTitle}>Operaciones</Text>
        <View style={styles.metricsRow}>
          <MetricCard
            title="Recargas Pendientes"
            value={metrics?.operaciones.recargas.pendientes ?? 0}
            subtitle={`${metrics?.operaciones.recargas.hoy ?? 0} hoy`}
            accentColor={Colors.warning}
          />
          <MetricCard
            title="Retiros Pendientes"
            value={metrics?.operaciones.retiros.pendientes ?? 0}
            subtitle={`${metrics?.operaciones.retiros.hoy ?? 0} hoy`}
            accentColor={Colors.warning}
          />
          <MetricCard title="Alertas" value={metrics?.alertas.pendientes ?? 0} accentColor={Colors.error} />
        </View>

        <Text style={styles.sectionTitle}>Financiero (Este Mes)</Text>
        <View style={styles.metricsRow}>
          <MetricCard title="Total Depositado" value={formatCurrency(metrics?.financiero.este_mes.total_depositado ?? 0)} accentColor={Colors.success} />
          <MetricCard title="Comisiones" value={formatCurrency(metrics?.financiero.este_mes.comisiones_generadas ?? 0)} accentColor={Colors.secondary} />
          <MetricCard title="Total Retirado" value={formatCurrency(metrics?.financiero.este_mes.total_retirado ?? 0)} accentColor={Colors.primary} />
        </View>

        {/* Tendencias */}
        {trends && (
          <>
            <Text style={styles.sectionTitle}>Tendencias (7 días)</Text>
            <View style={styles.tableCard}>
              {renderTrendsTable(trends, formatCurrency)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Parsea fecha "DD/MM/YYYY" del backend de recargas */
function parseFecha(fechaStr: string): Date {
  const parts = fechaStr.split('/');
  if (parts.length === 3) {
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return new Date(fechaStr);
}

function renderTrendsTable(trends: AdminTrends, formatCurrency: (val: number | string) => string) {
  return (
    <>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.cellDate]}>Fecha</Text>
        <Text style={[styles.tableHeaderCell, styles.cellNum]}>Recargas</Text>
        <Text style={[styles.tableHeaderCell, styles.cellNum]}>Monto</Text>
        <Text style={[styles.tableHeaderCell, styles.cellNum]}>Retiros</Text>
        <Text style={[styles.tableHeaderCell, styles.cellNum]}>Monto</Text>
        <Text style={[styles.tableHeaderCell, styles.cellNum]}>Nuevos</Text>
      </View>
      {trends.recargas_por_dia.map((day, i) => {
        const retiro = trends.retiros_por_dia[i];
        const usuario = trends.usuarios_por_dia[i];
        return (
          <View key={day.fecha} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
            <Text style={[styles.tableCell, styles.cellDate]}>
              {new Date(day.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
            </Text>
            <Text style={[styles.tableCell, styles.cellNum]}>{day.cantidad}</Text>
            <Text style={[styles.tableCell, styles.cellNum]}>{formatCurrency(day.monto)}</Text>
            <Text style={[styles.tableCell, styles.cellNum]}>{retiro?.cantidad ?? 0}</Text>
            <Text style={[styles.tableCell, styles.cellNum]}>{formatCurrency(retiro?.monto ?? 0)}</Text>
            <Text style={[styles.tableCell, styles.cellNum]}>{usuario?.cantidad ?? 0}</Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
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
    padding: Layout.spacing.xl,
    paddingBottom: Layout.spacing.xxl,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: Layout.spacing.md,
    marginTop: Layout.spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
  },
  metricsRowMobile: {
    flexWrap: 'wrap',
  },

  // --- Mini métricas (móvil) ---
  miniMetricsRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
  },
  miniMetricCard: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    borderLeftWidth: 3,
    alignItems: 'center',
  },
  miniMetricValue: {
    fontSize: Layout.fontSize.xl,
    fontWeight: '700',
    color: Colors.accent,
  },
  miniMetricLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // --- Tarjetas pendientes (móvil) ---
  pendingCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },
  pendingCardPressed: {
    opacity: 0.7,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.xs,
  },
  pendingTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  pendingTypeBadge: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '700',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
    overflow: 'hidden',
  },
  badgeRecarga: {
    backgroundColor: '#10B98120',
    color: Colors.success,
  },
  badgeRetiro: {
    backgroundColor: '#e8373320',
    color: Colors.primary,
  },
  pendingOp: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
  },
  pendingMonto: {
    fontSize: Layout.fontSize.md,
    fontWeight: '700',
    color: Colors.accent,
  },
  pendingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingNombre: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
    flex: 1,
    marginRight: Layout.spacing.sm,
  },
  pendingFecha: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },

  // --- Empty state ---
  emptyCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
  },

  // --- Tabla tendencias (desktop) ---
  tableCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
  },
  tableHeaderCell: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
    color: Colors.gray,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRowAlt: {
    backgroundColor: `${Colors.lightGray}80`,
  },
  tableCell: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
  },
  cellDate: {
    flex: 1.5,
  },
  cellNum: {
    flex: 1,
    textAlign: 'right',
  },
});
