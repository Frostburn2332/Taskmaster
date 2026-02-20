import React, { useCallback, useState } from 'react';
import { useTick } from '../../../hooks/useTick';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Animated, { FadeIn } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import TaskCard from '../components/TaskCard';
import AddTaskSheet from '../components/AddTaskSheet';
import TaskStats from '../../../components/molecules/TaskStats';
import { addTask, deleteTask, toggleTaskStatus } from '../../../store/tasksSlice';
import { logoutUser } from '../../../store/authSlice';
import useAppDispatch from '../../../hooks/useAppDispatch';
import useAppSelector from '../../../hooks/useAppSelector';
import {
  selectSmartSortedTasks,
  selectPendingTasks,
  selectCompletedTasks,
} from '../../../utils/smartSort';
import { Colors, Spacing, Typography, Radius } from '../../../theme';
import type { ScoredTask, Task, RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'PENDING' | 'COMPLETED';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'PENDING',   label: 'Pending'   },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'ALL',       label: 'All'       },
];

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
    <Icon name="inbox" size={56} color={Colors.border} />
    <Text style={styles.emptyTitle}>No tasks yet</Text>
    <Text style={styles.emptySubtitle}>
      Tap the + button to add your first task.
    </Text>
  </Animated.View>
);

// ─── Component ────────────────────────────────────────────────────────────────

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const user    = useAppSelector(state => state.auth.user);
  const loading = useAppSelector(state => state.tasks.loading);

  const allTasks       = useAppSelector(selectSmartSortedTasks);
  const pendingTasks   = useAppSelector(selectPendingTasks);
  const completedTasks = useAppSelector(selectCompletedTasks);

  const [activeTab, setActiveTab]       = useState<FilterTab>('PENDING');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Tick every 60s so overdue badges update live; only runs when there are pending tasks
  const now = useTick(5_000, pendingTasks.length > 0);

  const displayedTasks: ScoredTask[] =
    activeTab === 'ALL'
      ? allTasks
      : activeTab === 'PENDING'
      ? pendingTasks
      : completedTasks;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddTask = useCallback(
    (task: Omit<Task, 'id'>) => {
      if (!user) return;

      // Close modal immediately — the task appears via onSnapshot (local write)
      // without any loading gate so a second task can be added right away.
      setSheetVisible(false);
      dispatch(addTask({ uid: user.uid, task })).then(result => {
        if (addTask.rejected.match(result)) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save task.' });
        }
      });
    },
    [dispatch, user],
  );

  const handleToggle = useCallback(
    async (task: ScoredTask) => {
      if (!user) return;
      const result = await dispatch(toggleTaskStatus({ uid: user.uid, task }));
      if (toggleTaskStatus.rejected.match(result)) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not update task.' });
      }
    },
    [dispatch, user],
  );

  const handleDelete = useCallback(
    async (task: ScoredTask) => {
      if (!user) return;
      const result = await dispatch(deleteTask({ uid: user.uid, taskId: task.id }));
      if (deleteTask.fulfilled.match(result)) {
        Toast.show({ type: 'success', text1: 'Deleted', text2: task.title });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Could not delete task.' });
      }
    },
    [dispatch, user],
  );

  const handleLogout = useCallback(async () => {
    setSettingsOpen(false);
    await dispatch(logoutUser());
  }, [dispatch]);

  const handlePress = useCallback(
    (task: ScoredTask) => {
      navigation.navigate('TaskDetail', { taskId: task.id });
    },
    [navigation],
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.displayName?.split(' ')[0] ?? 'there'} 👋
          </Text>
          <Text style={styles.taskCount}>
            {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} pending
          </Text>
        </View>

        {/* Settings button + dropdown */}
        <View style={styles.settingsWrapper}>
          <TouchableOpacity
            onPress={() => setSettingsOpen(o => !o)}
            style={styles.settingsBtn}
            accessibilityLabel="Settings"
          >
            <Icon name="settings" size={22} color={Colors.muted} />
          </TouchableOpacity>

          {settingsOpen && (
            <>
              {/* Dismiss overlay */}
              <TouchableOpacity
                style={styles.dropdownOverlay}
                onPress={() => setSettingsOpen(false)}
                activeOpacity={1}
              />
              <View style={styles.dropdown}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={handleLogout}
                >
                  <Icon name="log-out" size={16} color={Colors.error} />
                  <Text style={styles.dropdownItemText}>Log Out</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Stats ── */}
      <TaskStats />

      {/* ── Filter Tabs ── */}
      <View style={styles.tabsRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      {loading && displayedTasks.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlashList
          data={displayedTasks}
          keyExtractor={item => item.id}
          extraData={now}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              now={now}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onPress={handlePress}
            />
          )}
          estimatedItemSize={130}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.85}
        accessibilityLabel="Add new task"
      >
        <Icon name="plus" size={28} color={Colors.onBackground} />
      </TouchableOpacity>

      {/* ── Add Task Sheet ── */}
      <AddTaskSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSubmit={handleAddTask}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greeting: {
    ...(Typography.h2 as object),
    color: Colors.onBackground,
  },
  taskCount: {
    ...(Typography.caption as object),
    color: Colors.muted,
    marginTop: 2,
  },
  settingsWrapper: {
    position: 'relative',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 10,
  },
  dropdown: {
    position: 'absolute',
    top: 46,
    right: 0,
    minWidth: 150,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: `${Colors.primary}22`,
    borderColor: Colors.primary,
  },
  tabText: {
    ...(Typography.caption as object),
    fontWeight: '600',
    color: Colors.muted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  listContent: {
    paddingBottom: 100,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  emptyTitle: {
    ...(Typography.h3 as object),
    color: Colors.muted,
  },
  emptySubtitle: {
    ...(Typography.body as object),
    color: Colors.border,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
});

export default HomeScreen;
