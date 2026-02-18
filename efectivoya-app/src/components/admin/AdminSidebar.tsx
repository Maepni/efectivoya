import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'grid-outline', path: '/(admin)' },
  { label: 'Recargas', icon: 'arrow-up-circle-outline', path: '/(admin)/recargas' },
  { label: 'Retiros', icon: 'arrow-down-circle-outline', path: '/(admin)/retiros' },
  { label: 'Chats', icon: 'chatbubbles-outline', path: '/(admin)/chats' },
  { label: 'Clientes', icon: 'people-outline', path: '/(admin)/clientes' },
  { label: 'Alertas', icon: 'warning-outline', path: '/(admin)/alertas' },
  { label: 'Configuración', icon: 'settings-outline', path: '/(admin)/config' },
];

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/(admin)') {
      return pathname === '/' || pathname === '/(admin)';
    }
    return pathname.startsWith(path.replace('/(admin)', ''));
  };

  return (
    <View style={styles.sidebar}>
      <View style={styles.logoContainer}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.logo}>Efectivo<Text style={styles.logoAccent}>Ya</Text></Text>
            <Text style={styles.logoSub}>Admin</Text>
          </View>
        </View>
      </View>

      <View style={styles.nav}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? Colors.primary : Colors.gray}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: Colors.cardBackground,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingTop: Layout.spacing.xl,
  },
  logoContainer: {
    paddingHorizontal: Layout.spacing.xl,
    paddingBottom: Layout.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Layout.spacing.lg,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  logo: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  logoAccent: {
    color: Colors.primary,
  },
  logoSub: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  nav: {
    paddingHorizontal: Layout.spacing.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.xs,
  },
  navItemActive: {
    backgroundColor: `${Colors.primary}15`,
  },
  navLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginLeft: Layout.spacing.md,
    fontWeight: '500',
  },
  navLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
