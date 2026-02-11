import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { MetricCard } from '../../../src/components/admin/MetricCard';
import { FilterBar } from '../../../src/components/admin/FilterBar';
import { DataTable, Column } from '../../../src/components/admin/DataTable';
import { Pagination } from '../../../src/components/admin/Pagination';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminAlertasService } from '../../../src/services/adminAlertas.service';
import { useResponsive } from '../../../src/hooks/useResponsive';
import type { AdminAlertaListItem, AdminAlertaStats, AdminPagination } from '../../../src/types/admin';

const estadoOptions = [
  { label: 'Todas', value: '' },
  { label: 'Pendientes', value: 'false' },
  { label: 'Revisadas', value: 'true' },
];

const tipoOptions = [
  { label: 'Todos', value: '' },
  { label: 'Frecuencia', value: 'frecuencia_recargas' },
  { label: 'Boucher dup.', value: 'boucher_duplicado' },
  { label: 'Retiro alto', value: 'retiro_alto' },
  { label: 'Monto alto', value: 'monto_alto' },
];

export default function AdminAlertasScreen() {
  const [alertas, setAlertas] = useState<AdminAlertaListItem[]>([]);
  const [stats, setStats] = useState<AdminAlertaStats | null>(null);
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const { isMobile } = useResponsive();

  const [search, setSearch] = useState('');
  const [revisada, setRevisada] = useState('');
  const [tipo, setTipo] = useState('');
  const [page, setPage] = useState(1);

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    const res = await adminAlertasService.getAll({
      page,
      limit: 20,
      revisada: revisada || undefined,
      tipo: tipo || undefined,
    });
    if (res.success && res.data) {
      setAlertas(res.data.alertas);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [page, revisada, tipo]);

  const fetchStats = useCallback(async () => {
    const res = await adminAlertasService.getStats();
    if (res.success && res.data) setStats(res.data);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchAlertas(); }, [fetchAlertas]);
  useEffect(() => { setPage(1); }, [revisada, tipo, search]);

  const formatDate = (val: string) =>
    new Date(val).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const tipoLabel = (t: string) => {
    const map: Record<string, string> = {
      frecuencia_recargas: 'Frecuencia',
      boucher_duplicado: 'Boucher dup.',
      retiro_alto: 'Retiro alto',
      monto_alto: 'Monto alto',
    };
    return map[t] ?? t;
  };

  const handleMarcarRevisada = async (id: string) => {
    const res = await adminAlertasService.marcarRevisada(id);
    if (res.success) {
      fetchAlertas();
      fetchStats();
    }
  };

  const handleMarcarTodas = () => {
    const doMark = async () => {
      setMarking(true);
      const res = await adminAlertasService.marcarTodasRevisadas();
      if (res.success) {
        fetchAlertas();
        fetchStats();
      }
      setMarking(false);
    };

    if (Platform.OS === 'web') {
      if (confirm('¿Marcar todas las alertas como revisadas?')) doMark();
    } else {
      Alert.alert('Confirmar', '¿Marcar todas las alertas como revisadas?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: doMark },
      ]);
    }
  };

  const columns: Column<AdminAlertaListItem>[] = [
    {
      key: 'tipo',
      title: 'Tipo',
      flex: 1,
      render: (item) => <Text style={styles.cellText}>{tipoLabel(item.tipo)}</Text>,
    },
    {
      key: 'user',
      title: 'Usuario',
      flex: 1.5,
      render: (item) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {item.user.nombres} {item.user.apellidos}
        </Text>
      ),
    },
    {
      key: 'revisada',
      title: 'Estado',
      flex: 0.8,
      render: (item) => (
        <View style={[styles.alertBadge, { backgroundColor: item.revisada ? `${Colors.success}20` : `${Colors.warning}20` }]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: item.revisada ? Colors.success : Colors.warning }}>
            {item.revisada ? 'Revisada' : 'Pendiente'}
          </Text>
        </View>
      ),
    },
    {
      key: 'created_at',
      title: 'Fecha',
      flex: 1.2,
      render: (item) => <Text style={styles.cellText}>{formatDate(item.created_at)}</Text>,
    },
  ];

  const topTipo = stats?.por_tipo?.[0];

  return (
    <View style={styles.container}>
      <AdminHeader title="Alertas" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {stats && (
          <View style={[styles.metricsRow, isMobile && styles.metricsRowMobile]}>
            <MetricCard title="Total" value={stats.total} accentColor={Colors.primary} />
            <MetricCard title="Pendientes" value={stats.pendientes} accentColor={Colors.warning} />
            <MetricCard title="Revisadas" value={stats.revisadas} accentColor={Colors.success} />
            {topTipo && (
              <MetricCard
                title="Tipo frecuente"
                value={tipoLabel(topTipo.tipo)}
                subtitle={`${topTipo.cantidad} alertas`}
                accentColor={Colors.secondary}
              />
            )}
          </View>
        )}

        {stats && stats.pendientes > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarcarTodas}
            disabled={marking}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>
              {marking ? 'Marcando...' : `Marcar todas revisadas (${stats.pendientes})`}
            </Text>
          </TouchableOpacity>
        )}

        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por usuario..."
          estadoOptions={estadoOptions}
          estadoValue={revisada}
          onEstadoChange={setRevisada}
          bancoOptions={tipoOptions}
          bancoValue={tipo}
          onBancoChange={setTipo}
        />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={alertas}
              onRowPress={(item) => {
                if (!item.revisada) handleMarcarRevisada(item.id);
              }}
              emptyMessage="No se encontraron alertas"
            />
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.xl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
  metricsRowMobile: {
    flexWrap: 'wrap',
  },
  markAllButton: {
    backgroundColor: `${Colors.primary}20`,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Layout.borderRadius.sm,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.lg,
    alignSelf: 'flex-start',
    marginBottom: Layout.spacing.lg,
  },
  markAllText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  centered: {
    padding: Layout.spacing.xxl,
    alignItems: 'center',
  },
  cellText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
  },
  alertBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
});
