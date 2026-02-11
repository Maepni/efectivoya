import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { Pagination } from '../../../src/components/admin/Pagination';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminUsersService } from '../../../src/services/adminUsers.service';
import type { AdminUserListItem, AdminPagination } from '../../../src/types/admin';

export default function AdminClientesScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [pagination, setPagination] = useState<AdminPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (searchVal: string, pageVal: number) => {
    setLoading(true);
    const res = await adminUsersService.getAll({
      search: searchVal || undefined,
      page: pageVal,
      limit: 20,
    });
    if (res.success && res.data) {
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(search, page); }, [page, fetchUsers]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(text, 1);
    }, 400);
  };

  const formatCurrency = (val: number | string) => `S/. ${Number(val).toFixed(2)}`;

  const renderItem = ({ item }: { item: AdminUserListItem }) => (
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
        <View style={[styles.statusDot, { backgroundColor: item.is_active ? Colors.success : Colors.gray }]} />
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.saldoText}>Saldo: {formatCurrency(item.saldo_actual)}</Text>
        <Text style={styles.opsText}>
          {item._count.recargas} recargas | {item._count.retiros} retiros
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AdminHeader title="Clientes" />
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, email o DNI..."
          placeholderTextColor={Colors.gray}
          value={search}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => handleSearchChange('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={Colors.gray} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No se encontraron clientes</Text>
              </View>
            }
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Layout.borderRadius.md,
    marginHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  searchIcon: {
    marginRight: Layout.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Layout.fontSize.sm,
    color: Colors.accent,
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
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saldoText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },
  opsText: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
  },
});
