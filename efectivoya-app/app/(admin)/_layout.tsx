import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAdminAuthStore } from '../../src/store/adminAuthStore';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { AdminLayout } from '../../src/components/admin/AdminLayout';
import { adminSocketService } from '../../src/services/adminSocket.service';

export default function AdminRootLayout() {
  const { isAuthenticated, isLoading, isInitialized, initialize } = useAdminAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Conectar/desconectar socket admin
  useEffect(() => {
    if (isAuthenticated) {
      adminSocketService.connect();
    } else {
      adminSocketService.disconnect();
    }
    return () => {
      adminSocketService.disconnect();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isInitialized) return;

    const isLoginPage = segments[segments.length - 1] === 'login';

    if (isAuthenticated && isLoginPage) {
      router.replace('/(admin)');
    } else if (!isAuthenticated && !isLoginPage) {
      router.replace('/(admin)/login');
    }
  }, [isAuthenticated, isInitialized, segments, router]);

  if (isLoading && !isInitialized) {
    return <LoadingScreen />;
  }

  const isLoginPage = segments[segments.length - 1] === 'login';

  if (isLoginPage || !isAuthenticated) {
    return (
      <>
        <StatusBar style="light" />
        <Slot />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AdminLayout>
        <Slot />
      </AdminLayout>
    </>
  );
}
