/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * App color theme system - centralized for easy maintenance
 */

// Primary brand colors - using the darker blue from the login button
export const PRIMARY_COLORS = {
  primary: '#192549', // Darker blue used in the sidebar/login button
  primaryDark: '#13193a', // Even darker variant
  primaryLight: '#2b3a6a', // Lighter variant
  primaryAccent: '#0a7ea4', // Original bus logo blue (as an accent color)
};

// Neutral colors for text, backgrounds, etc.
export const NEUTRAL_COLORS = {
  text: {
    primary: '#11181C',
    secondary: '#687076',
    tertiary: '#9BA1A6',
    inverse: '#FFFFFF',
  },
  background: {
    main: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F3F4F6',
  },
  border: {
    light: '#E6E8EB',
    medium: '#D2D6DB',
  },
};

// Semantic colors for notifications, alerts, etc.
export const SEMANTIC_COLORS = {
  success: '#4CAF50',
  error: '#E53935',
  warning: '#FFC107',
  info: '#2196F3',
};

// Theme definition for light mode
export const LightTheme = {
  colors: {
    ...PRIMARY_COLORS,
    text: NEUTRAL_COLORS.text,
    background: NEUTRAL_COLORS.background,
    border: NEUTRAL_COLORS.border,
    ...SEMANTIC_COLORS,
    tabIconDefault: NEUTRAL_COLORS.text.tertiary,
    tabIconSelected: PRIMARY_COLORS.primary,
    // Adding the old colors for backward compatibility
    tint: PRIMARY_COLORS.primary,
    icon: NEUTRAL_COLORS.text.secondary,
  },
};

// Theme definition for dark mode - we'll use the light theme for now
export const DarkTheme = {
  colors: {
    ...PRIMARY_COLORS,
    text: {
      primary: '#ECEDEE',
      secondary: '#9BA1A6',
      tertiary: '#687076',
      inverse: '#11181C',
    },
    background: {
      main: '#151718',
      secondary: '#1C1F20',
      tertiary: '#2A2E30',
    },
    border: {
      light: '#2A2E30',
      medium: '#3A3F42',
    },
    ...SEMANTIC_COLORS,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',
    // Adding the old colors for backward compatibility
    tint: '#FFFFFF',
    icon: '#9BA1A6',
  },
};

// For backward compatibility
const tintColorLight = PRIMARY_COLORS.primary;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: NEUTRAL_COLORS.text.primary,
    background: NEUTRAL_COLORS.background.main,
    tint: tintColorLight,
    icon: NEUTRAL_COLORS.text.secondary,
    tabIconDefault: NEUTRAL_COLORS.text.tertiary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// Current theme - this can be switched based on user preference
export const Theme = LightTheme;
