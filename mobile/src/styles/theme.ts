import { MD3Theme, configureFonts } from 'react-native-paper';

const fontConfig = {
  web: {
    regular: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'Inter-Medium',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
  },
  ios: {
    regular: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'Inter-Medium',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
  },
  android: {
    regular: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'Inter-Medium',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    },
  },
};

export const theme: MD3Theme = {
  dark: false,
  roundness: 12,
  version: 3,
  isV3: true,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    primary: 'rgb(30, 64, 175)', // Blue-700
    onPrimary: 'rgb(255, 255, 255)',
    primaryContainer: 'rgb(219, 234, 254)', // Blue-100
    onPrimaryContainer: 'rgb(15, 23, 42)',
    
    secondary: 'rgb(79, 70, 229)', // Indigo-600
    onSecondary: 'rgb(255, 255, 255)',
    secondaryContainer: 'rgb(224, 231, 255)', // Indigo-100
    onSecondaryContainer: 'rgb(30, 27, 75)',
    
    tertiary: 'rgb(16, 185, 129)', // Emerald-500
    onTertiary: 'rgb(255, 255, 255)',
    tertiaryContainer: 'rgb(209, 250, 229)', // Emerald-100
    onTertiaryContainer: 'rgb(6, 78, 59)',
    
    error: 'rgb(220, 38, 38)', // Red-600
    onError: 'rgb(255, 255, 255)',
    errorContainer: 'rgb(254, 226, 226)', // Red-100
    onErrorContainer: 'rgb(127, 29, 29)',
    
    warning: 'rgb(245, 158, 11)', // Amber-500
    onWarning: 'rgb(255, 255, 255)',
    warningContainer: 'rgb(254, 243, 199)', // Amber-100
    onWarningContainer: 'rgb(146, 64, 14)',
    
    background: 'rgb(248, 250, 252)', // Slate-50
    onBackground: 'rgb(15, 23, 42)',
    
    surface: 'rgb(255, 255, 255)',
    onSurface: 'rgb(15, 23, 42)',
    surfaceVariant: 'rgb(241, 245, 249)', // Slate-100
    onSurfaceVariant: 'rgb(71, 85, 105)', // Slate-600
    
    outline: 'rgb(203, 213, 225)', // Slate-300
    outlineVariant: 'rgb(226, 232, 240)', // Slate-200
    
    shadow: 'rgb(0, 0, 0)',
    scrim: 'rgb(0, 0, 0)',
    
    inverseSurface: 'rgb(15, 23, 42)',
    inverseOnSurface: 'rgb(248, 250, 252)',
    inversePrimary: 'rgb(147, 197, 253)', // Blue-300
    
    elevation: {
      level0: 'transparent',
      level1: 'rgb(255, 255, 255)',
      level2: 'rgb(254, 254, 255)',
      level3: 'rgb(252, 252, 253)',
      level4: 'rgb(251, 251, 252)',
      level5: 'rgb(250, 250, 251)',
    },
    
    surfaceDisabled: 'rgba(15, 23, 42, 0.12)',
    onSurfaceDisabled: 'rgba(15, 23, 42, 0.38)',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
  animation: {
    scale: 1.0,
  },
};

export const darkTheme: MD3Theme = {
  ...theme,
  dark: true,
  colors: {
    ...theme.colors,
    primary: 'rgb(147, 197, 253)', // Blue-300
    onPrimary: 'rgb(15, 23, 42)',
    primaryContainer: 'rgb(29, 78, 216)', // Blue-700
    onPrimaryContainer: 'rgb(219, 234, 254)',
    
    secondary: 'rgb(165, 180, 252)', // Indigo-300
    onSecondary: 'rgb(30, 27, 75)',
    secondaryContainer: 'rgb(67, 56, 202)', // Indigo-700
    onSecondaryContainer: 'rgb(224, 231, 255)',
    
    tertiary: 'rgb(110, 231, 183)', // Emerald-300
    onTertiary: 'rgb(6, 78, 59)',
    tertiaryContainer: 'rgb(5, 150, 105)', // Emerald-600
    onTertiaryContainer: 'rgb(209, 250, 229)',
    
    error: 'rgb(248, 113, 113)', // Red-400
    onError: 'rgb(127, 29, 29)',
    errorContainer: 'rgb(185, 28, 28)', // Red-700
    onErrorContainer: 'rgb(254, 226, 226)',
    
    warning: 'rgb(251, 191, 36)', // Amber-400
    onWarning: 'rgb(146, 64, 14)',
    warningContainer: 'rgb(217, 119, 6)', // Amber-600
    onWarningContainer: 'rgb(254, 243, 199)',
    
    background: 'rgb(15, 23, 42)', // Slate-900
    onBackground: 'rgb(248, 250, 252)',
    
    surface: 'rgb(30, 41, 59)', // Slate-800
    onSurface: 'rgb(248, 250, 252)',
    surfaceVariant: 'rgb(51, 65, 85)', // Slate-700
    onSurfaceVariant: 'rgb(148, 163, 184)', // Slate-400
    
    outline: 'rgb(100, 116, 139)', // Slate-500
    outlineVariant: 'rgb(71, 85, 105)', // Slate-600
    
    shadow: 'rgb(0, 0, 0)',
    scrim: 'rgb(0, 0, 0)',
    
    inverseSurface: 'rgb(248, 250, 252)',
    inverseOnSurface: 'rgb(15, 23, 42)',
    inversePrimary: 'rgb(30, 64, 175)',
    
    elevation: {
      level0: 'transparent',
      level1: 'rgb(30, 41, 59)',
      level2: 'rgb(39, 50, 67)',
      level3: 'rgb(48, 59, 76)',
      level4: 'rgb(52, 63, 80)',
      level5: 'rgb(57, 68, 85)',
    },
    
    surfaceDisabled: 'rgba(248, 250, 252, 0.12)',
    onSurfaceDisabled: 'rgba(248, 250, 252, 0.38)',
    backdrop: 'rgba(0, 0, 0, 0.4)',
  },
};

// Custom spacing and sizing constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
} as const;

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// Animation durations
export const duration = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;