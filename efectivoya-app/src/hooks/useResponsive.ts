import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();
  return { isMobile: width < 768, screenWidth: width };
}
