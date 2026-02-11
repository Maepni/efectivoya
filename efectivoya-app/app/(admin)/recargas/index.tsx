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
import { adminRecargasService } from '../../../src/services/adminRecargas.service';
import { useResponsive } from '../../../src/hooks/useResponsive';
import type { AdminRecargaListItem, AdminRecargaStats, AdminPagination } from '../../../src/types/admin';

const bancoOptions = [
  { label: 'Todos', value: '' },
  { label: 'BCP', value: 'BCP' },
  { label: 'Interbank', value: 'Interbank' },
  { label: 'Scotiabank', value: 'Scotiabank' },
  { label: 'BBVA', value: 'BBVA' },
];

export default function AdminRecargasScreen() {
  const router = useRouter();
  const [recargas, setRecargas] = useState<AdminRecargaListItem[]>([]);
  const [stats, setStats] = useState<AdminRecargaStats | null>(null);
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();

  // Filters
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [banco, setBanco] = useState('');
  const [page, setPage] = useState(1);

  const fetchRecargas = useCallback(async () => {
    setLoading(true);
    const res = await adminRecargasService.getAll({
      page,
      limit: 20,
      estado: estado || undefined,
      banco: banco || undefined,
      busqueda: search || undefined,
    });
    if (res.success && res.data) {
      setRecargas(res.data.recargas);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [page, estado, banco, search]);

  const fetchStats = useCallback(async () => {
    const res = await adminRecargasService.getStats();
    if (res.success && res.data) setStats(res.data);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchRecargas(); }, [fetchRecargas]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [estado, banco, search]);

  const formatCurrency = (val: number | string) => `S/. ${Number(val).toFixed(2)}`;
  const formatDate = (val: string) =>
    new Date(val).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const columns: Column<AdminRecargaListItem>[] = [
    { key: 'numeroOperacion', title: 'Operación', flex: 1.2 },
    {
      key: 'usuario',
      title: 'Usuario',
      flex: 1.5,
      render: (item) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {item.usuario.nombres} {item.usuario.apellidos}
        </Text>
      ),
    },
    { key: 'bancoOrigen', title: 'Banco', flex: 1 },
    {
      key: 'montoDepositado',
      title: 'Monto',
      flex: 1,
      render: (item) => (
        <Text style={styles.cellText}>{formatCurrency(item.montoDepositado)}</Text>
      ),
    },
    {
      key: 'estado',
      title: 'Estado',
      flex: 0.8,
      render: (item) => <StatusBadge status={item.estado} />,
    },
    {
      key: 'fecha',
      title: 'Fecha',
      flex: 1.2,
      render: (item) => (
        <Text style={styles.cellText}>{formatDate(item.fecha)}</Text>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <AdminHeader title="Recargas" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Stats */}
        {stats && (
          <View style={[styles.metricsRow, isMobile && styles.metricsRowMobile]}>
            <MetricCard
              title="Pendientes"
              value={stats.pendientes}
              accentColor={Colors.warning}
            />
            <MetricCard
              title="Aprobadas Hoy"
              value={stats.hoy.aprobadas}
              accentColor={Colors.success}
            />
            <MetricCard
              title="Rechazadas Hoy"
              value={stats.hoy.rechazadas}
              accentColor={Colors.error}
            />
            <MetricCard
              title="Monto Mes"
              value={formatCurrency(stats.mes.montoTotal)}
              subtitle={`${stats.mes.totalAprobadas} aprobadas`}
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
          bancoOptions={bancoOptions}
          bancoValue={banco}
          onBancoChange={setBanco}
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
              data={recargas}
              onRowPress={(item) => router.push(`/(admin)/recargas/${item.id}` as any)}
              emptyMessage="No se encontraron recargas"
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
