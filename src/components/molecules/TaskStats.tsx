import React from 'react';
import { useTick } from '../../hooks/useTick';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import useAppSelector from '../../hooks/useAppSelector';
import { selectPendingTasks, selectCompletedTasks, selectConsistencyScore } from '../../utils/smartSort';
import { Colors, Spacing, Radius, Typography } from '../../theme';

// ─── Bento Tile ───────────────────────────────────────────────────────────────

interface TileProps {
  iconName: string;
  value: string | number;
  label: string;
  sublabel?: string;
  accentColor: string;
  style?: object;
}

const BentoTile: React.FC<TileProps> = ({
  iconName,
  value,
  label,
  sublabel,
  accentColor,
  style,
}) => (
  <View style={[styles.tile, { borderColor: `${accentColor}28` }, style]}>
    <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
      <Icon name={iconName} size={16} color={accentColor} />
    </View>
    <Text style={[styles.tileValue, { color: accentColor }]}>{value}</Text>
    <Text style={styles.tileLabel}>{label}</Text>
    {sublabel ? <Text style={styles.tileSublabel}>{sublabel}</Text> : null}
  </View>
);

// ─── TaskStats ────────────────────────────────────────────────────────────────

const TaskStats: React.FC = () => {
  const pending          = useAppSelector(selectPendingTasks);
  const completed        = useAppSelector(selectCompletedTasks);
  const consistencyScore = useAppSelector(selectConsistencyScore);

  const now          = useTick(5_000, pending.length > 0);
  const highCount    = pending.filter(t => t.priority === 'HIGH').length;
  const overdueCount = pending.filter(t => t.deadline < now).length;

  const scoreLabel =
    consistencyScore >= 80 ? 'On Track' :
    consistencyScore >= 50 ? 'Needs Attention' : 'At Risk';

  return (
    <Animated.View entering={FadeInDown.duration(320).springify()} style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
        {/* Tile 1 — Large: Pending tasks */}
        <BentoTile
          iconName="clock"
          value={pending.length}
          label="Pending"
          sublabel={`${completed.length} done`}
          accentColor={Colors.primary}
          style={styles.tileLarge}
        />

        {/* Tile 3 — Small: High Priority */}
        <BentoTile
          iconName="zap"
          value={highCount}
          label="High Priority"
          accentColor={Colors.priorityHigh}
          style={styles.tileSmall}
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        {/* Tile 2 — Wide: On-Time Consistency */}
        <BentoTile
          iconName="trending-up"
          value={`${consistencyScore}%`}
          label="On-Time Score"
          sublabel={scoreLabel}
          accentColor={Colors.secondary}
          style={styles.tileWide}
        />

        {/* Tile 4 — Small: Overdue */}
        <BentoTile
          iconName="alert-circle"
          value={overdueCount}
          label="Overdue"
          accentColor={Colors.error}
          style={styles.tileSmall}
        />
      </View>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tile: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  tileLarge: {
    flex: 3,
    minHeight: 100,
  },
  tileWide: {
    flex: 3,
  },
  tileSmall: {
    flex: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tileValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 32,
  },
  tileLabel: {
    ...(Typography.caption as object),
    color: Colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  tileSublabel: {
    fontSize: 10,
    color: Colors.border,
    fontWeight: '500',
    marginTop: 1,
  },
});

export default TaskStats;
