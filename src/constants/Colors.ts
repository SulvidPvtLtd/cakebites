const tintColorLight = '#2F80ED';
const tintColorDark = '#4C9AFF';

export default {
  light: {
    // Core
    text: '#111111',
    background: '#F9F9F9',
    tint: tintColorLight,

    // Navigation
    tabIconDefault: '#BDBDBD',
    tabIconSelected: tintColorLight,

    // UI Surfaces
    card: '#FFFFFF',
    border: '#E5E5E5',
    placeholder: '#E5E5E5',

    // Text variants
    textPrimary: '#111111',
    textSecondary: '#666666',

    // States
    error: '#D32F2F',
    success: '#2E7D32',
    warning: '#ED6C02',
  },

  dark: {
    // Core
    text: '#FFFFFF',
    background: '#0E0E0E',
    tint: tintColorDark,

    // Navigation
    tabIconDefault: '#777777',
    tabIconSelected: tintColorDark,

    // UI Surfaces
    card: '#1A1A1A',
    border: '#2A2A2A',
    placeholder: '#2A2A2A',

    // Text variants
    textPrimary: '#FFFFFF',
    textSecondary: '#AAAAAA',

    // States
    error: '#EF5350',
    success: '#66BB6A',
    warning: '#FF9800',
  },
};
