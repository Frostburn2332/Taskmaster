import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, Radius, Typography } from '../../theme';

interface ProgressBarProps {
  progress: number; // 0–100
  color?: string;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = Colors.secondary,
  showLabel = true,
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const animWidth = useSharedValue(0);

  useEffect(() => {
    if (trackWidth > 0) {
      animWidth.value = withTiming((progress / 100) * trackWidth, { duration: 450 });
    }
  }, [progress, trackWidth, animWidth]);

  const animStyle = useAnimatedStyle(() => ({
    width: animWidth.value,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      <View style={styles.track} onLayout={onLayout}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, animStyle]} />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color }]}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: `${Colors.border}80`,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  label: {
    ...(Typography.caption as object),
    fontSize: 11,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },
});

export default ProgressBar;
