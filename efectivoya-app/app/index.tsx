import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
