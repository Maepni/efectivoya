import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { FilterBar } from '../../../src/components/admin/FilterBar';
import { DataTable, Column } from '../../../src/components/admin/DataTable';
import { Pagination } from '../../../src/components/admin/Pagination';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminChatService } from '../../../src/services/adminChat.service';
import { adminSocketService } from '../../../src/services/adminSocket.service';
import { useResponsive } from '../../../src/hooks/useResponsive';
import type { AdminChatListItem, AdminPagination } from '../../../src/types/admin';

const estadoOptions = [
  { label: 'Todos', value: '' },
  { label: 'Abiertos', value: 'abierto' },
  { label: 'Cerrados', value: 'cerrado' },
];

export default function AdminChatsScreen() {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [chats, setChats] = useState<AdminChatListItem[]>([]);
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    const res = await adminChatService.getAll({
      page,
      limit: 20,
      estado: estado || undefined,
    });
    if (res.success && res.data) {
      setChats(res.data.chats);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, [page, estado]);

  useEffect(() => { fetchChats(); }, [fetchChats]);
  useEffect(() => { setPage(1); }, [estado, search]);

  // Refrescar lista cuando llega un nuevo mensaje via socket
  useEffect(() => {
    const unsubscribe = adminSocketService.onMessage(() => {
      fetchChats();
    });
    return unsubscribe;
  }, [fetchChats]);

  const formatDate = (val: string) =>
    new Date(val).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Filtro local por búsqueda
  const filteredChats = search
    ? chats.filter((c) => {
        const term = search.toLowerCase();
        return (
          c.user.email.toLowerCase().includes(term) ||
          c.user.nombres.toLowerCase().includes(term) ||
          c.user.apellidos.toLowerCase().includes(term)
        );
      })
    : chats;

  const columns: Column<AdminChatListItem>[] = [
    {
      key: 'usuario',
      title: 'Usuario',
      flex: 1.5,
      render: (item) => (
        <Text style={styles.cellText} numberOfLines={1}>
          {item.user.nombres} {item.user.apellidos}
        </Text>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      flex: 1.5,
      render: (item) => (
        <Text style={styles.cellText} numberOfLines={1}>{item.user.email}</Text>
      ),
    },
    {
      key: 'mensajes',
      title: 'Mensajes',
      flex: 0.8,
      render: (item) => (
        <Text style={styles.cellText}>{item._count.mensajes}</Text>
      ),
    },
    {
      key: 'no_leidos',
      title: 'No leídos',
      flex: 0.8,
      render: (item) => (
        item.mensajes_no_leidos > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.mensajes_no_leidos}</Text>
          </View>
        ) : (
          <Text style={styles.cellTextGray}>0</Text>
        )
      ),
    },
    {
      key: 'estado',
      title: 'Estado',
      flex: 0.8,
      render: (item) => (
        <View style={[styles.statusBadge, item.estado === 'abierto' ? styles.statusOpen : styles.statusClosed]}>
          <Text style={[styles.statusText, item.estado === 'abierto' ? styles.statusTextOpen : styles.statusTextClosed]}>
            {item.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
          </Text>
        </View>
      ),
    },
    {
      key: 'updated_at',
      title: 'Última actividad',
      flex: 1.2,
      render: (item) => (
        <Text style={styles.cellText}>{formatDate(item.updated_at)}</Text>
      ),
    },
  ];

  // Columnas reducidas para móvil
  const mobileColumns: Column<AdminChatListItem>[] = [
    columns[0], // Usuario
    columns[3], // No leídos
    columns[4], // Estado
  ];

  return (
    <View style={styles.container}>
      <AdminHeader title="Chats" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nombre o email..."
          estadoOptions={estadoOptions}
          estadoValue={estado}
          onEstadoChange={setEstado}
        />

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <>
            <DataTable
              columns={isMobile ? mobileColumns : columns}
              data={filteredChats}
              onRowPress={(item) => router.push(`/(admin)/chats/${item.id}` as any)}
              emptyMessage="No se encontraron chats"
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
  centered: {
    padding: Layout.spacing.xxl,
    alignItems: 'center',
  },
  cellText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
  },
  cellTextGray: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusOpen: {
    backgroundColor: `${Colors.success}20`,
  },
  statusClosed: {
    backgroundColor: `${Colors.gray}20`,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextOpen: {
    color: Colors.success,
  },
  statusTextClosed: {
    color: Colors.gray,
  },
});
