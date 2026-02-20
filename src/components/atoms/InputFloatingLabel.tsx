import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TextInputProps,
  TouchableWithoutFeedback,
  ViewStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../theme';

interface InputFloatingLabelProps extends TextInputProps {
  label: string;
  error?: string | null;
  containerStyle?: ViewStyle;
}

const InputFloatingLabel: React.FC<InputFloatingLabelProps> = ({
  label,
  error,
  containerStyle,
  value,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const animatedLabel = useRef(
    new Animated.Value(value ? 1 : 0),
  ).current;

  const hasValue = Boolean(value);
  const isFloating = isFocused || hasValue;

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setIsFocused(true);
    Animated.timing(animatedLabel, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    if (!hasValue) {
      Animated.timing(animatedLabel, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }
    onBlur?.(e);
  };

  const labelTop = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [16, -8],
  });

  const labelFontSize = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 12],
  });

  const labelColor = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.muted, isFocused ? Colors.primary : Colors.muted],
  });

  const borderColor = error
    ? Colors.error
    : isFocused
    ? Colors.primary
    : Colors.border;

  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View style={[styles.container, containerStyle]}>
        <View style={[styles.inputWrapper, { borderColor }]}>
          <Animated.Text
            style={[
              styles.floatingLabel,
              {
                top: labelTop,
                fontSize: labelFontSize,
                color: labelColor,
                backgroundColor: isFloating ? Colors.surface : 'transparent',
                paddingHorizontal: isFloating ? 4 : 0,
              },
            ]}
            pointerEvents="none"
          >
            {label}
          </Animated.Text>
          <TextInput
            ref={inputRef}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={styles.input}
            placeholderTextColor={Colors.muted}
            selectionColor={Colors.primary}
            cursorColor={Colors.primary}
            {...rest}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md + 4,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    position: 'relative',
  },
  floatingLabel: {
    position: 'absolute',
    left: Spacing.md,
    fontWeight: '500',
    zIndex: 1,
  },
  input: {
    ...(Typography.body as object),
    color: Colors.onSurface,
    padding: 0,
    margin: 0,
    minHeight: 28,
  },
  error: {
    ...(Typography.caption as object),
    color: Colors.error,
    marginTop: 4,
    marginLeft: Spacing.sm,
  },
});

export default InputFloatingLabel;
