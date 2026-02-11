import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { MetricCard } from '../../../src/components/admin/MetricCard';
import { FilterBar } from '../../../src/components/admin/FilterBar';
import { DataTable, Column } from '../../../src/components/admin/DataTable';
import { StatusBadge } from '../../../src/components/admin/StatusBadge';
import { Pagination } from '../../../src/components/admin/Pagination';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminRetirosService } from '../../../src/services/adminRetiros.service';
import { useResponsive } from '../../../src/hooks/useResponsive';
import type { AdminRetiroListItem, AdminRetiroStats, AdminPagination } from '../../../src/types/admin';

export default function AdminRetirosScreen() {
  const router = useRouter();
  const [retiros, setRetiros] = useState<AdminRetiroListItem[]>([]);
  const [stats, setStats] = useState<AdminRetiroStats | null>(null);
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  // Filters
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);

  const fetchRetiros = useCallback(async () => {
    setLoading(true);
    const res = await adminRetirosService.getAll({
      page,
      limit: 20,
      estado: estado || undefined,
    });
    if (res.success && res.data) {
      setRetiros(res.data.retiros);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [page, estado]);

  const fetchStats = useCallback(async () => {
    const res = await adminRetirosService.getStats();
    if (res.success && res.data) setStats(res.data);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchRetiros(); }, [fetchRetiros]);

  useEffect(() => { setPage(1); }, [estado, search]);

  const formatCurrency = (val: number | string) => `S/. ${Number(val).toFixed(2)}`;
  const formatDate = (val: string) =>
    new Date(val).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Filter client-side by search (since backend doesn't support busqueda for retiros)
  const filteredRetiros = search
    ? retiros.filter((r) => {
        const term = search.toLowerCase();
        return (
          r.numero_operacion.toLowerCase().includes(term) ||
          r.usuario?.email?.toLowerCase().includes(term) ||
          r.usuario?.dni?.toLowerCase().includes(term) ||
          r.usuario?.nombres?.toLowerCase().includes(term)
        );
      })
    : retiros;

  const statsData = stats?.stats;

  const columns: Column<AdminRetiroListItem>[] = [
    { key: 'numero_operacion', title: 'Operación', flex: 1.2 },
    {
      key: 'usuario',
      title: 'Usuario',
      flex: 1.5,
      render: (item) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {item.usuario ? `${item.usuario.nombres} ${item.usuario.apellidos}` : '-'}
        </Text>
      ),
    },
    {
      key: 'banco',
      title: 'Banco Destino',
      flex: 1.2,
      render: (item) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {item.banco ? `${item.banco.banco} - ${item.banco.numero_cuenta}` : '-'}
        </Text>
      ),
    },
    {
      key: 'monto',
      title: 'Monto',
      flex: 1,
      render: (item) => (
        <Text style={styles.cellText}>{formatCurrency(item.monto)}</Text>
      ),
    },
    {
      key: 'estado',
      title: 'Estado',
      flex: 0.8,
      render: (item) => <StatusBadge status={item.estado} />,
    },
    {
      key: 'created_at',
      title: 'Fecha',
      flex: 1.2,
      render: (item) => (
        <Text style={styles.cellText}>{formatDate(item.created_at)}</Text>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <AdminHeader title="Retiros" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Stats */}
        {statsData && (
          <View style={[styles.metricsRow, isMobile && styles.metricsRowMobile]}>
            <MetricCard
              title="Pendientes"
              value={statsData.pendientes}
              accentColor={Colors.warning}
            />
            <MetricCard
              title="Aprobados"
              value={statsData.aprobados}
              accentColor={Colors.success}
            />
            <MetricCard
              title="Rechazados"
              value={statsData.rechazados}
              accentColor={Colors.error}
            />
            <MetricCard
              title="Monto Aprobado"
              value={formatCurrency(statsData.monto_total_aprobado)}
              subtitle={`${statsData.total_retiros} total`}
              accentColor={Colors.secondary}
            />
          </View>
        )}

        {/* Filters */}
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por operación, email o DNI..."
          estadoValue={estado}
          onEstadoChange={setEstado}
        />

        {/* Table */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={filteredRetiros}
              onRowPress={(item) => router.push(`/(admin)/retiros/${item.id}` as any)}
              emptyMessage="No se encontraron retiros"
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
  centered: {
    padding: Layout.spacing.xxl,
    alignItems: 'center',
  },
  cellText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
  },
});
