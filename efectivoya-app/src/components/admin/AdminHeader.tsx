import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { useResponsive } from '../../hooks/useResponsive';

interface AdminHeaderProps {
  title: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const { admin, logout } = useAdminAuthStore();
  const { isMobile } = useResponsive();

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {isMobile && (
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.right}>
        {!isMobile ? (
          <Text style={styles.adminName}>{admin?.nombre || admin?.email}</Text>
        ) : null}
        <TouchableOpacity onPress={logout} style={styles.logoutButton} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={Colors.gray} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.xl,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  title: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminName: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginRight: Layout.spacing.md,
  },
  logoutButton: {
    padding: Layout.spacing.sm,
  },
});
