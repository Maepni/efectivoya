import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width } = useWindowDimensions();
  return {
    isMobile: width < 768,
    isDesktop: width >= 1024,
    isWide: width >= 1440,
    screenWidth: width,
  };
}
