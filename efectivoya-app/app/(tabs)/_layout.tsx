import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { FontSize } from '../../src/constants/layout';

type TabIcon = keyof typeof Ionicons.glyphMap;

const DESKTOP_MAX_WIDTH = 860;

const tabs: Array<{
  name: string;
  title: string;
  icon: TabIcon;
  iconFocused: TabIcon;
}> = [
  { name: 'index',    title: 'Inicio',   icon: 'home-outline',              iconFocused: 'home' },
  { name: 'recargas', title: 'Recargas', icon: 'arrow-up-circle-outline',   iconFocused: 'arrow-up-circle' },
  { name: 'retiros',  title: 'Retiros',  icon: 'arrow-down-circle-outline', iconFocused: 'arrow-down-circle' },
  { name: 'chat',     title: 'Chat',     icon: 'chatbubble-outline',        iconFocused: 'chatbubble' },
  { name: 'perfil',   title: 'Perfil',   icon: 'person-outline',            iconFocused: 'person' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  // IMPORTANTE: siempre renderizamos el mismo árbol (wrapper → inner → Tabs).
  // Cambiar entre dos árboles distintos desmontaría el Tabs navigator y
  // perdería la navegación inferior en mobile al redimensionar.
  return (
    <View style={[styles.wrapper, isDesktop && styles.wrapperDesktop]}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
        <Tabs
          screenOptions={{
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.white,
            headerTitleStyle: { fontWeight: 'bold' },
            tabBarStyle: {
              backgroundColor: Colors.background,
              borderTopColor: Colors.inputBorder,
              borderTopWidth: 1,
              height: isDesktop ? 64 : 60 + insets.bottom,
              paddingBottom: isDesktop ? 10 : 8 + insets.bottom,
              paddingTop: 4,
            },
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.gray,
            tabBarLabelStyle: {
              fontSize: FontSize.small,
              fontWeight: '500',
            },
          }}
        >
          {tabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarIcon: ({ focused, color, size }) => (
                  <Ionicons
                    name={focused ? tab.iconFocused : tab.icon}
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
          ))}
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  wrapperDesktop: {
    alignItems: 'center',
  },
  inner: {
    flex: 1,
  },
  innerDesktop: {
    width: DESKTOP_MAX_WIDTH,
    maxWidth: '100%' as any,
  },
});
