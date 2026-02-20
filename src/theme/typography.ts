import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const Typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.onBackground,
    letterSpacing: 0.3,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onBackground,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: Colors.onSurface,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
