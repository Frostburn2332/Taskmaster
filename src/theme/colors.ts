export const Colors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceAlt: '#2C2C2C',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  error: '#CF6679',
  onSurface: '#E1E1E1',
  onBackground: '#FFFFFF',
  muted: '#888888',
  border: '#333333',

  // Priority chips
  priorityHigh: '#FF6B6B',
  priorityMedium: '#FFD93D',
  priorityLow: '#6BCB77',

  // Gradients
  gradientPrimary: ['#BB86FC', '#7B2FFF'] as [string, string],
  gradientSecondary: ['#03DAC6', '#018786'] as [string, string],
  gradientSurface: ['#2C2C2C', '#1E1E1E'] as [string, string],
} as const;
