import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdminSidebar } from './AdminSidebar';
import { AdminTabBar } from './AdminTabBar';
import { Colors } from '../../constants/colors';
import { useResponsive } from '../../hooks/useResponsive';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <View style={styles.containerMobile}>
        <View style={styles.content}>{children}</View>
        <AdminTabBar />
      </View>
    );
  }

  return (
    <View style={styles.containerDesktop}>
      <AdminSidebar />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerMobile: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Colors.background,
  },
  containerDesktop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
});
