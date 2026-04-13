import { Platform } from 'react-native';

export const UI = {
  colors: {
    background: '#F5FBF8',
    surface: '#FFFFFF',
    surfaceAlt: '#EAF8F1',
    inputBackground: '#F7FCFA',
    border: '#D3E3DC',
    borderStrong: '#B6CBC0',
    text: '#1A2420',
    textMuted: '#566762',
    placeholder: '#8FA39B',
    green: '#1FB066',
    greenDark: '#16985B',
    greenSoft: '#DDF2E8',
    blue: '#0B4AA8',
    blueDark: '#083C87',
    blueSoft: '#E3ECFB',
    danger: '#E53935',
    dangerSoft: '#FEE2E2',
    white: '#FFFFFF',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  fonts: {
    heading: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-condensed',
      default: 'sans-serif-condensed',
    }),
    body: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
    bodyMedium: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'sans-serif-medium',
      default: 'sans-serif-medium',
    }),
  },
  shadow: {
    soft: {
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
      boxShadow: '0px 5px 12px rgba(0, 0, 0, 0.1)',
    },
    medium: {
      shadowColor: '#000000',
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 7 },
      elevation: 5,
      boxShadow: '0px 7px 16px rgba(0, 0, 0, 0.16)',
    },
  },
};
