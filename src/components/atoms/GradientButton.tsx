import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '../../theme';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  colors?: [string, string];
  style?: ViewStyle;
  textStyle?: TextStyle;
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

const GradientButton: React.FC<GradientButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  colors = Colors.gradientPrimary,
  style,
  textStyle,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.wrapper, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={isDisabled ? ['#555555', '#333333'] : colors}
        start={start}
        end={end}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.onBackground} size="small" />
        ) : (
          <Text style={[styles.label, textStyle]}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  label: {
    ...(Typography.h3 as object),
    color: Colors.onBackground,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default GradientButton;
