import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import GradientButton from '../../../components/atoms/GradientButton';
import InputFloatingLabel from '../../../components/atoms/InputFloatingLabel';
import { updateTask, deleteTask, toggleTaskStatus, toggleSubtask } from '../../../store/tasksSlice';
import useAppDispatch from '../../../hooks/useAppDispatch';
import useAppSelector from '../../../hooks/useAppSelector';
import { computeTimeHealth } from '../../../utils/smartSort';
import { useTick } from '../../../hooks/useTick';
import { getSubtaskProgress } from '../../../utils/progress';
import { validateTaskTitle } from '../../../utils/validators';
import ProgressBar from '../../../components/atoms/ProgressBar';
import { Colors, Spacing, Radius, Typography } from '../../../theme';
import type { RootStackParamList, Priority, Task, Subtask } from '../../../types';

// ─── Types & Config ───────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetail'>;

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  HIGH:   { color: Colors.priorityHigh,   label: 'HIGH' },
  MEDIUM: { color: Colors.priorityMedium, label: 'MED'  },
  LOW:    { color: Colors.priorityLow,    label: 'LOW'  },
};

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];

// Deadline picker helpers
function deadlineToDate(ts: number): Date {
  return new Date(ts);
}

function formatPickerDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPickerTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  });
}

function formatRelative(ts: number, now: number): string {
  const diff    = ts - now;
  const absDiff = Math.abs(diff);
  const hours   = Math.floor(absDiff / (1000 * 60 * 60));
  const days    = Math.floor(hours / 24);

  if (diff < 0) {
    if (days > 0)  return `${days}d overdue`;
    if (hours > 0) return `${hours}h overdue`;
    return 'Just overdue';
  }
  if (days > 0)  return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  return 'Due soon';
}

// ─── Component ────────────────────────────────────────────────────────────────

const TaskDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { taskId } = route.params;
  const dispatch   = useAppDispatch();
  const user       = useAppSelector(state => state.auth.user);
  const task       = useAppSelector(state =>
    state.tasks.tasks.find(t => t.id === taskId),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  // Once the task is found in the store, remember it so a transient onSnapshot
  // update that temporarily removes it does not trigger a premature goBack().
  const taskFoundRef = useRef(false);
  if (task) taskFoundRef.current = true;

  // Live tick — updates every 60s so relative time and overdue status stay fresh
  const now = useTick(5_000, task?.status === 'PENDING');

  // ── Edit form state ──────────────────────────────────────────────────────────
  const [editTitle,       setEditTitle]       = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority,    setEditPriority]    = useState<Priority>('MEDIUM');
  const [editTags,        setEditTags]        = useState('');
  const [editDeadline,    setEditDeadline]    = useState<Date>(new Date());
  const [deadlineError,   setDeadlineError]   = useState<string | null>(null);
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [showTimePicker,  setShowTimePicker]  = useState(false);
  const [titleError,      setTitleError]      = useState<string | null>(null);
  const [editSubtasks,    setEditSubtasks]    = useState<Subtask[]>([]);
  const [subtaskInput,    setSubtaskInput]    = useState('');

  // ── Animated check button ────────────────────────────────────────────────────
  const checkScale = useSharedValue(1);
  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  // Navigate back only when the task is genuinely gone (deleted), not during a
  // transient onSnapshot cycle.  taskFoundRef ensures we never goBack() before
  // the task has loaded, and never during the brief window where Firestore
  // replaces the store after a write before the new snapshot arrives.
  useEffect(() => {
    if (!task && !deleting && taskFoundRef.current) {
      navigation.goBack();
    }
  }, [task, navigation, deleting]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const enterEditMode = useCallback(() => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditTags(task.tags.join(', '));
    setEditDeadline(deadlineToDate(task.deadline));
    setShowDatePicker(false);
    setShowTimePicker(false);
    setTitleError(null);
    setDeadlineError(null);
    setEditSubtasks(task.subtasks ?? []);
    setSubtaskInput('');
    setIsEditing(true);
  }, [task]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setTitleError(null);
    setDeadlineError(null);
    setSubtaskInput('');
    setShowDatePicker(false);
    setShowTimePicker(false);
  }, []);

  const onEditDateChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
    if (!selected) return;
    setEditDeadline(prev => {
      const merged = new Date(selected);
      merged.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      if (merged.getTime() <= Date.now()) {
        setDeadlineError('Please choose a date and time in the future.');
        return prev;
      }
      setDeadlineError(null);
      return merged;
    });
  }, []);

  const onEditTimeChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(false);
    if (!selected) return;
    setEditDeadline(prev => {
      const merged = new Date(prev);
      merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      if (merged.getTime() <= Date.now()) {
        setDeadlineError('Please choose a time in the future.');
        return prev;
      }
      setDeadlineError(null);
      return merged;
    });
  }, []);

  const addEditSubtask = useCallback(() => {
    const trimmed = subtaskInput.trim();
    if (!trimmed) return;
    setEditSubtasks(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: trimmed,
        isCompleted: false,
      },
    ]);
    setSubtaskInput('');
  }, [subtaskInput]);

  const removeEditSubtask = useCallback((id: string) => {
    setEditSubtasks(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleSave = useCallback(async () => {
    if (!task || !user) return;
    const err = validateTaskTitle(editTitle);
    if (err) { setTitleError(err); return; }

    const parsedTags = editTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    // Commit any un-confirmed subtask still in the input box
    const finalSubtasks = subtaskInput.trim()
      ? [
          ...editSubtasks,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: subtaskInput.trim(),
            isCompleted: false,
          },
        ]
      : editSubtasks;

    const updated: Task = {
      ...task,
      title:       editTitle.trim(),
      description: editDescription.trim(),
      priority:    editPriority,
      tags:        parsedTags,
      deadline:    editDeadline.getTime(),
      subtasks:    finalSubtasks,
    };

    // Navigate home immediately (optimistic) then dispatch in the background
    navigation.navigate('Home');
    Toast.show({ type: 'success', text1: 'Task updated!' });
    dispatch(updateTask({ uid: user.uid, task: updated })).catch(() => {
      Toast.show({ type: 'error', text1: 'Sync Error', text2: 'Changes may not have saved.' });
    });
  }, [task, user, editTitle, editDescription, editPriority, editTags, editDeadline, editSubtasks, subtaskInput, dispatch, navigation]);

  const handleToggle = useCallback(async () => {
    if (!task || !user) return;
    navigation.goBack();
    dispatch(toggleTaskStatus({ uid: user.uid, task }));
  }, [task, user, dispatch, navigation]);

  const handleSubtaskToggle = useCallback((subtaskId: string) => {
    if (!task || !user) return;
    dispatch(toggleSubtask({
      uid: user.uid,
      taskId: task.id,
      subtaskId,
      subtasks: task.subtasks ?? [],
    }));
  }, [task, user, dispatch]);

  const handleDelete = useCallback(() => {
    if (!task || !user) return;
    Alert.alert(
      'Delete Task',
      `Delete "${task.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const result = await dispatch(deleteTask({ uid: user.uid, taskId: task.id }));
              if (deleteTask.fulfilled.match(result)) {
                Toast.show({ type: 'success', text1: 'Task deleted.' });
                navigation.goBack();
              } else {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Could not delete task.' });
              }
            } catch (error) {
              console.error(error);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [task, user, dispatch, navigation]);

  // Show loader while deleting or if task is missing from slice temporarily
  if (!task || deleting) {
    return (
      <View style={[styles.safe, styles.loaderContainer]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const timeHealth  = computeTimeHealth(task);
  const priority    = PRIORITY_CONFIG[task.priority];
  const isCompleted = task.status === 'COMPLETED';
  const overdue     = !isCompleted && task.deadline < now;

  // ── Edit Mode ─────────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Edit header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={cancelEdit} style={styles.headerBtn}>
              <Icon name="x" size={22} color={Colors.muted} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Task</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.saveChip}
            >
              <Text style={styles.saveChipText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.editScrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.editScrollContent}
          >
            <InputFloatingLabel
              label="Task Title *"
              value={editTitle}
              onChangeText={t => { setEditTitle(t); setTitleError(null); }}
              error={titleError}
              returnKeyType="next"
              maxLength={120}
            />

            <InputFloatingLabel
              label="Description (optional)"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              containerStyle={{ marginTop: Spacing.sm }}
            />

            <Text style={styles.editSectionLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setEditPriority(p)}
                  style={[
                    styles.selectorBtn,
                    {
                      borderColor: PRIORITY_CONFIG[p].color,
                      backgroundColor:
                        editPriority === p
                          ? `${PRIORITY_CONFIG[p].color}22`
                          : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.selectorBtnText, { color: PRIORITY_CONFIG[p].color }]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.editSectionLabel}>Deadline</Text>

            {/* Date picker row */}
            <TouchableOpacity
              style={styles.editPickerRow}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Icon name="calendar" size={16} color={Colors.secondary} />
              <Text style={styles.editPickerRowText}>{formatPickerDate(editDeadline)}</Text>
              <Icon name="chevron-down" size={14} color={Colors.muted} />
            </TouchableOpacity>

            {/* Time picker row */}
            <TouchableOpacity
              style={[styles.editPickerRow, { marginTop: Spacing.xs }, deadlineError ? styles.editPickerRowError : null]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Icon name="clock" size={16} color={deadlineError ? Colors.error : Colors.secondary} />
              <Text style={styles.editPickerRowText}>{formatPickerTime(editDeadline)}</Text>
              <Icon name="chevron-down" size={14} color={Colors.muted} />
            </TouchableOpacity>
            {deadlineError ? (
              <Text style={styles.deadlineErrorText}>{deadlineError}</Text>
            ) : null}

            {showDatePicker && (
              <DateTimePicker
                value={editDeadline}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={onEditDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={editDeadline}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour={false}
                onChange={onEditTimeChange}
              />
            )}

            <InputFloatingLabel
              label="Tags (comma separated)"
              value={editTags}
              onChangeText={setEditTags}
              autoCapitalize="none"
              containerStyle={{ marginTop: Spacing.sm }}
            />

            {/* ── Subtasks ── */}
            <Text style={styles.editSectionLabel}>Subtasks</Text>

            {editSubtasks.map(s => (
              <View key={s.id} style={styles.editSubtaskRow}>
                <Icon
                  name={s.isCompleted ? 'check-square' : 'square'}
                  size={14}
                  color={s.isCompleted ? Colors.secondary : Colors.muted}
                />
                <Text
                  style={[styles.editSubtaskText, s.isCompleted && styles.editSubtaskTextDone]}
                  numberOfLines={1}
                >
                  {s.title}
                </Text>
                <TouchableOpacity
                  onPress={() => removeEditSubtask(s.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="x" size={14} color={Colors.muted} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.editSubtaskInputRow}>
              <TextInput
                style={styles.editSubtaskInput}
                placeholder="Add a subtask…"
                placeholderTextColor={Colors.muted}
                value={subtaskInput}
                onChangeText={setSubtaskInput}
                onSubmitEditing={addEditSubtask}
                returnKeyType="done"
                blurOnSubmit={false}
                maxLength={120}
              />
              <TouchableOpacity
                onPress={addEditSubtask}
                style={styles.editSubtaskAddBtn}
                disabled={!subtaskInput.trim()}
              >
                <Icon
                  name="plus"
                  size={16}
                  color={subtaskInput.trim() ? Colors.primary : Colors.border}
                />
              </TouchableOpacity>
            </View>

            <GradientButton
              label="Save Changes"
              onPress={handleSave}
              style={{ marginTop: Spacing.xl }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── View Mode ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Detail</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={enterEditMode}
            style={styles.headerBtn}
            accessibilityLabel="Edit task"
          >
            <Icon name="edit-2" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerBtn}
            disabled={deleting}
            accessibilityLabel="Delete task"
          >
            <Icon name="trash-2" size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeIn.duration(280)}>

          {/* Title card */}
          <View style={[styles.titleCard, { borderLeftColor: priority.color }]}>
            <View style={styles.titleCardBadges}>
              <View style={[styles.priorityChip, { borderColor: priority.color }]}>
                <Text style={[styles.priorityChipText, { color: priority.color }]}>
                  {priority.label}
                </Text>
              </View>
              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: isCompleted
                      ? `${Colors.secondary}22`
                      : `${Colors.primary}22`,
                  },
                ]}
              >
                <Icon
                  name={isCompleted ? 'check-circle' : 'clock'}
                  size={11}
                  color={isCompleted ? Colors.secondary : Colors.primary}
                />
                <Text
                  style={[
                    styles.statusChipText,
                    { color: isCompleted ? Colors.secondary : Colors.primary },
                  ]}
                >
                  {isCompleted ? 'COMPLETED' : 'PENDING'}
                </Text>
              </View>
            </View>
            <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
              {task.title}
            </Text>
            {(task.subtasks ?? []).length > 0 && (
              <ProgressBar
                progress={getSubtaskProgress(task.subtasks ?? [])}
                color={isCompleted ? Colors.secondary : Colors.primary}
              />
            )}
          </View>

          {/* On-Time Score */}
          {!isCompleted && (
            <Animated.View
              entering={SlideInDown.delay(80).duration(280)}
              style={[
                styles.scoreCard,
                timeHealth < 25 && { borderColor: `${Colors.error}40`, backgroundColor: `${Colors.error}0A` },
              ]}
            >
              <View style={styles.scoreLeft}>
                <Icon
                  name="trending-up"
                  size={16}
                  color={timeHealth >= 50 ? Colors.primary : Colors.error}
                />
                <Text style={[styles.scoreLabel, timeHealth < 50 && { color: Colors.error }]}>
                  On-Time Score
                </Text>
              </View>
              <Text style={[styles.scoreValue, timeHealth < 50 && { color: Colors.error }]}>
                {timeHealth}%
              </Text>
            </Animated.View>
          )}

          {/* Description */}
          {Boolean(task.description) && (
            <Animated.View
              entering={SlideInDown.delay(120).duration(280)}
              style={styles.infoCard}
            >
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.descriptionText}>{task.description}</Text>
            </Animated.View>
          )}

          {/* Deadline */}
          <Animated.View
            entering={SlideInDown.delay(160).duration(280)}
            style={styles.infoCard}
          >
            <Text style={styles.infoLabel}>Deadline</Text>
            <View style={styles.deadlineInfo}>
              <Icon
                name="clock"
                size={16}
                color={overdue ? Colors.error : Colors.secondary}
              />
              <View>
                <Text
                  style={[styles.deadlineDateText, overdue && { color: Colors.error }]}
                >
                  {formatDate(task.deadline)}
                </Text>
                <Text
                  style={[styles.deadlineRelativeText, overdue && { color: Colors.error }]}
                >
                  {formatRelative(task.deadline, now)}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Tags */}
          {task.tags.length > 0 && (
            <Animated.View
              entering={SlideInDown.delay(200).duration(280)}
              style={styles.infoCard}
            >
              <Text style={styles.infoLabel}>Tags</Text>
              <View style={styles.tagsRow}>
                {task.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Subtasks */}
          {(task.subtasks ?? []).length > 0 && (
            <Animated.View
              entering={SlideInDown.delay(220).duration(280)}
              style={styles.infoCard}
            >
              {/* Header row */}
              <View style={styles.subtaskHeader}>
                <Text style={styles.infoLabel}>
                  Subtasks
                </Text>
                <Text style={styles.subtaskCounter}>
                  {(task.subtasks ?? []).filter(s => s.isCompleted).length} / {(task.subtasks ?? []).length}
                </Text>
              </View>

              {/* Progress bar */}
              <ProgressBar
                progress={getSubtaskProgress(task.subtasks ?? [])}
                color={Colors.secondary}
                showLabel={false}
              />

              {/* Subtask rows */}
              <View style={styles.subtaskList}>
                {(task.subtasks ?? []).map(subtask => (
                  <TouchableOpacity
                    key={subtask.id}
                    style={[styles.subtaskRow, subtask.isCompleted && styles.subtaskRowDone]}
                    onPress={() => handleSubtaskToggle(subtask.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.subtaskCheck, subtask.isCompleted && styles.subtaskCheckDone]}>
                      {subtask.isCompleted && <Icon name="check" size={11} color={Colors.background} />}
                    </View>
                    <Text style={[styles.subtaskTitle, subtask.isCompleted && styles.subtaskTitleDone]}>
                      {subtask.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Created at */}
          <Animated.View
            entering={SlideInDown.delay(240).duration(280)}
            style={styles.infoCard}
          >
            <Text style={styles.infoLabel}>Created</Text>
            <Text style={styles.createdText}>{formatDate(task.createdAt)}</Text>
          </Animated.View>

        </Animated.View>
      </ScrollView>

      {/* Toggle Completion CTA */}
      <View style={styles.ctaContainer}>
        <Animated.View style={checkAnimStyle}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              isCompleted ? styles.ctaPending : styles.ctaComplete,
            ]}
            onPress={handleToggle}
            activeOpacity={0.85}
          >
            <Icon
              name={isCompleted ? 'rotate-ccw' : 'check'}
              size={20}
              color={Colors.onBackground}
            />
            <Text style={styles.ctaText}>
              {isCompleted ? 'Mark as Pending' : 'Mark as Complete'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...(Typography.h3 as object),
    color: Colors.onBackground,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  saveChip: {
    backgroundColor: `${Colors.primary}22`,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  saveChipText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── View mode scroll ──
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 120,
  },

  // ── Title card ──
  titleCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderLeftWidth: 4,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  titleCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priorityChip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  taskTitle: {
    ...(Typography.h2 as object),
    color: Colors.onBackground,
    lineHeight: 30,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.muted,
  },

  // ── Score card ──
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${Colors.primary}12`,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scoreLabel: {
    ...(Typography.label as object),
    color: Colors.primary,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  // ── Info cards (view mode) ──
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  descriptionText: {
    ...(Typography.body as object),
    color: Colors.onSurface,
    lineHeight: 24,
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  deadlineDateText: {
    ...(Typography.body as object),
    color: Colors.onSurface,
    fontWeight: '600',
  },
  deadlineRelativeText: {
    ...(Typography.caption as object),
    color: Colors.muted,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    backgroundColor: `${Colors.primary}18`,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  createdText: {
    ...(Typography.body as object),
    color: Colors.muted,
  },

  // ── CTA ──
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
  },
  ctaComplete: {
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaPending: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onBackground,
  },

  // ── Edit mode ──
  editScrollView: {
    flex: 1,
  },
  editScrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  editSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  editPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
  },
  editPickerRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  editPickerRowError: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}10`,
  },
  deadlineErrorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectorBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  selectorBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // ── Subtask editor (edit mode) ──
  editSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    marginBottom: 6,
  },
  editSubtaskText: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
  },
  editSubtaskTextDone: {
    textDecorationLine: 'line-through',
    color: Colors.muted,
  },
  editSubtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  editSubtaskInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
    paddingVertical: 10,
  },
  editSubtaskAddBtn: {
    padding: 6,
  },

  // ── Subtask list (view mode) ──
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtaskCounter: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  subtaskList: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.border,
  },
  subtaskRowDone: {
    borderLeftColor: Colors.secondary,
    opacity: 0.7,
  },
  subtaskCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtaskCheckDone: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: '500',
  },
  subtaskTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.muted,
    fontWeight: '400',
  },
});

export default TaskDetailScreen;