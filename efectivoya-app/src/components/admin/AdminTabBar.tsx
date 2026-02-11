import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

interface Tab {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  path: string;
}

const tabs: Tab[] = [
  { label: 'Inicio', icon: 'home-outline', iconActive: 'home', path: '/(admin)/' },
  { label: 'Chats', icon: 'chatbubbles-outline', iconActive: 'chatbubbles', path: '/(admin)/chats' },
  { label: 'Recientes', icon: 'time-outline', iconActive: 'time', path: '/(admin)/clientes/recientes' },
  { label: 'Alertas', icon: 'warning-outline', iconActive: 'warning', path: '/(admin)/alertas' },
  { label: 'Clientes', icon: 'people-outline', iconActive: 'people', path: '/(admin)/clientes' },
];

export function AdminTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (tab: Tab): boolean => {
    if (tab.path === '/(admin)/') {
      // Inicio: active on /, /recargas/*, /retiros/*, /config/* (NOT /clientes/*, /alertas/*, /chats/*)
      return (
        pathname === '/' ||
        pathname === '/(admin)' ||
        pathname.startsWith('/recargas') ||
        pathname.startsWith('/retiros') ||
        pathname.startsWith('/config')
      ) && !pathname.startsWith('/clientes') && !pathname.startsWith('/alertas') && !pathname.startsWith('/chats');
    }
    if (tab.path === '/(admin)/chats') {
      return pathname.startsWith('/chats');
    }
    if (tab.path === '/(admin)/alertas') {
      return pathname.startsWith('/alertas');
    }
    if (tab.path === '/(admin)/clientes/recientes') {
      return pathname === '/clientes/recientes';
    }
    // Clientes: active on /clientes and /clientes/[id] (NOT recientes)
    return (
      pathname === '/clientes' ||
      (pathname.startsWith('/clientes/') && pathname !== '/clientes/recientes')
    );
  };

  return (
    <View style={[styles.container, { height: 60 + insets.bottom, paddingBottom: 8 + insets.bottom }]}>
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <TouchableOpacity
            key={tab.path}
            style={styles.tab}
            onPress={() => router.push(tab.path as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? tab.iconActive : tab.icon}
              size={24}
              color={active ? Colors.primary : Colors.gray}
            />
            <Text style={[styles.label, { color: active ? Colors.primary : Colors.gray }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.inputBorder,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
