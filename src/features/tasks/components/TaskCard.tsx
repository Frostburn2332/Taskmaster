import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Animated, {
  FadeInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Feather';
import { Colors, Spacing, Radius, Typography } from '../../../theme';
import type { ScoredTask, Priority } from '../../../types';

// ─── Priority Config ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  HIGH:   { color: Colors.priorityHigh,   label: 'HIGH'   },
  MEDIUM: { color: Colors.priorityMedium, label: 'MED'    },
  LOW:    { color: Colors.priorityLow,    label: 'LOW'    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: ScoredTask;
  now: number;
  onToggle: (task: ScoredTask) => void;
  onDelete: (task: ScoredTask) => void;
  onPress?: (task: ScoredTask) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = -80;

const TaskCard: React.FC<TaskCardProps> = ({ task, now, onToggle, onDelete, onPress }) => {
  const translateX    = useSharedValue(0);
  const deleteOpacity = useSharedValue(0);

  const triggerDelete = useCallback(() => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel', onPress: () => { translateX.value = withTiming(0); } },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(task) },
    ]);
  }, [task, onDelete, translateX]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate(e => {
      const clampedX = Math.max(e.translationX, -120);
      if (clampedX <= 0) {
        translateX.value = clampedX;
        deleteOpacity.value = Math.min(Math.abs(clampedX) / 80, 1);
      }
    })
    .onEnd(() => {
      if (translateX.value < SWIPE_THRESHOLD) {
        runOnJS(triggerDelete)();
      } else {
        translateX.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
        deleteOpacity.value = withTiming(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: deleteOpacity.value,
  }));

  const isCompleted = task.status === 'COMPLETED';
  const overdue     = !isCompleted && task.deadline < now;
  const priority    = PRIORITY_CONFIG[task.priority];

  // Animated scale for the overdue badge — springs in the moment it becomes true
  const badgeScale = useSharedValue(overdue ? 1 : 0);
  useEffect(() => {
    badgeScale.value = overdue
      ? withSpring(1, { damping: 10, stiffness: 180 })
      : withTiming(0, { duration: 150 });
  }, [overdue, badgeScale]);
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const titleStyle = isCompleted
    ? [styles.title, styles.titleCompleted]
    : [styles.title];

  return (
    <Animated.View
      entering={FadeInRight.duration(300).springify()}
      exiting={SlideOutLeft.duration(250)}
      style={styles.container}
    >
      {/* Delete hint revealed on swipe */}
      <Animated.View style={[styles.deleteHint, deleteStyle]}>
        <Icon name="trash-2" size={22} color={Colors.onBackground} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          {/* Left accent bar (priority colour) */}
          <View style={[styles.accentBar, { backgroundColor: priority.color }]} />

          <TouchableOpacity
            style={styles.content}
            onPress={() => onPress?.(task)}
            activeOpacity={0.85}
          >
            {/* Header row */}
            <View style={styles.row}>
              <View style={[styles.priorityChip, { borderColor: priority.color }]}>
                <Text style={[styles.priorityLabel, { color: priority.color }]}>
                  {priority.label}
                </Text>
              </View>

              {(overdue || badgeScale.value > 0) && (
                <Animated.View style={[styles.overdueChip, badgeStyle]}>
                  <Icon name="alert-circle" size={11} color={Colors.error} />
                  <Text style={styles.overdueLabel}>OVERDUE</Text>
                </Animated.View>
              )}

              <TouchableOpacity
                onPress={() => onToggle(task)}
                style={styles.checkButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isCompleted }}
              >
                <Icon
                  name={isCompleted ? 'check-circle' : 'circle'}
                  size={22}
                  color={isCompleted ? Colors.secondary : Colors.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={titleStyle} numberOfLines={2}>
              {task.title}
            </Text>

            {/* Description */}
            {Boolean(task.description) && (
              <Text style={styles.description} numberOfLines={2}>
                {task.description}
              </Text>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.deadlineRow}>
                <Icon
                  name="clock"
                  size={12}
                  color={overdue ? Colors.error : Colors.muted}
                />
                <Text
                  style={[
                    styles.deadlineText,
                    overdue && { color: Colors.error },
                  ]}
                >
                  {formatDeadline(task.deadline)}
                </Text>
              </View>

              {/* Tags */}
              <View style={styles.tagsRow}>
                {task.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    position: 'relative',
  },
  deleteHint: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 70,
    backgroundColor: Colors.error,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priorityChip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${Colors.error}20`,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  overdueLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: 0.6,
  },
  checkButton: {
    marginLeft: 'auto',
  },
  title: {
    ...(Typography.h3 as object),
    color: Colors.onSurface,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.muted,
  },
  description: {
    ...(Typography.body as object),
    color: Colors.muted,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    ...(Typography.caption as object),
    color: Colors.muted,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
    marginLeft: Spacing.sm,
  },
  tag: {
    backgroundColor: `${Colors.primary}18`,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default TaskCard;
