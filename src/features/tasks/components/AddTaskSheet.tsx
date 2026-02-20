import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
  KeyboardEvent,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import GradientButton from '../../../components/atoms/GradientButton';
import InputFloatingLabel from '../../../components/atoms/InputFloatingLabel';
import { Colors, Spacing, Radius, Typography } from '../../../theme';
import { validateTaskTitle } from '../../../utils/validators';
import type { Priority, Task, Subtask } from '../../../types';

// ─── Priority Selector ────────────────────────────────────────────────────────

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
const PRIORITY_COLORS: Record<Priority, string> = {
  LOW:    Colors.priorityLow,
  MEDIUM: Colors.priorityMedium,
  HIGH:   Colors.priorityHigh,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddTaskSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id'>) => void;
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AddTaskSheet: React.FC<AddTaskSheetProps> = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const { height: screenHeight } = useWindowDimensions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [tags, setTags] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // Deadline — default to tomorrow at noon
  const defaultDeadline = (): Date => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  };
  const [deadlineDate, setDeadlineDate] = useState<Date>(defaultDeadline);
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [showTimePicker,  setShowTimePicker]  = useState(false);
  const [deadlineError,   setDeadlineError]   = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  // When keyboard is open: shrink sheet to sit entirely above the keyboard.
  // When closed: cap at 90% of screen so the overlay remains visible.
  const statusBarHeight = StatusBar.currentHeight ?? 0;
  const sheetMaxHeight = keyboardHeight > 0
    ? screenHeight - keyboardHeight - statusBarHeight
    : screenHeight * 0.9;

  const formatPickerDate = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const formatPickerTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const onDateChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(false);
    if (!selected) return;
    setDeadlineDate(prev => {
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

  const onTimeChange = useCallback((_: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(false);
    if (!selected) return;
    setDeadlineDate(prev => {
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

  const reset = useCallback(() => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setTags('');
    setDeadlineDate(defaultDeadline());
    setTitleError(null);
    setDeadlineError(null);
    setSubtasks([]);
    setSubtaskInput('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const addSubtask = useCallback(() => {
    const trimmed = subtaskInput.trim();
    if (!trimmed) return;
    const newSubtask: Subtask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: trimmed,
      isCompleted: false,
    };
    setSubtasks(prev => [...prev, newSubtask]);
    setSubtaskInput('');
  }, [subtaskInput]);

  const removeSubtask = useCallback((id: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleSubmit = useCallback(() => {
    const error = validateTaskTitle(title);
    if (error) {
      setTitleError(error);
      return;
    }

    // Commit any un-confirmed subtask input
    const finalSubtasks = subtaskInput.trim()
      ? [
          ...subtasks,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: subtaskInput.trim(),
            isCompleted: false,
          },
        ]
      : subtasks;

    const parsedTags = tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const task: Omit<Task, 'id'> = {
      title: title.trim(),
      description: description.trim(),
      priority,
      deadline: deadlineDate.getTime(),
      status: 'PENDING',
      createdAt: Date.now(),
      tags: parsedTags,
      subtasks: finalSubtasks,
    };

    try {
      onSubmit(task);
    } finally {
      reset();
    }
  }, [title, description, priority, tags, deadlineDate, subtasks, subtaskInput, onSubmit, reset]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={[styles.sheetWrapper, keyboardHeight > 0 && { bottom: keyboardHeight }]}>
        <View style={[styles.sheet, { height: sheetMaxHeight }]}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Task</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="x" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Title */}
            <InputFloatingLabel
              label="Task Title *"
              value={title}
              onChangeText={t => { setTitle(t); setTitleError(null); }}
              error={titleError}
              returnKeyType="next"
              maxLength={120}
              autoFocus={false}
            />

            {/* Description */}
            <InputFloatingLabel
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              containerStyle={{ marginTop: Spacing.sm }}
            />

            {/* Priority */}
            <Text style={styles.sectionLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityBtn,
                    {
                      borderColor: PRIORITY_COLORS[p],
                      backgroundColor:
                        priority === p ? `${PRIORITY_COLORS[p]}22` : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.priorityBtnText, { color: PRIORITY_COLORS[p] }]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Deadline */}
            <Text style={styles.sectionLabel}>Deadline</Text>

            {/* Date picker row */}
            <TouchableOpacity
              style={styles.pickerRow}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Icon name="calendar" size={16} color={Colors.secondary} />
              <Text style={styles.pickerRowText}>{formatPickerDate(deadlineDate)}</Text>
              <Icon name="chevron-down" size={14} color={Colors.muted} />
            </TouchableOpacity>

            {/* Time picker row */}
            <TouchableOpacity
              style={[styles.pickerRow, { marginTop: Spacing.xs }, deadlineError ? styles.pickerRowError : null]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Icon name="clock" size={16} color={deadlineError ? Colors.error : Colors.secondary} />
              <Text style={styles.pickerRowText}>{formatPickerTime(deadlineDate)}</Text>
              <Icon name="chevron-down" size={14} color={Colors.muted} />
            </TouchableOpacity>
            {deadlineError ? (
              <Text style={styles.deadlineErrorText}>{deadlineError}</Text>
            ) : null}

            {showDatePicker && (
              <DateTimePicker
                value={deadlineDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={deadlineDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour={false}
                onChange={onTimeChange}
              />
            )}

            {/* Tags */}
            <InputFloatingLabel
              label="Tags (comma separated)"
              value={tags}
              onChangeText={setTags}
              autoCapitalize="none"
              containerStyle={{ marginTop: Spacing.sm }}
            />

            {/* ── Subtasks ── */}
            <Text style={styles.sectionLabel}>Subtasks</Text>

            {subtasks.map(s => (
              <View key={s.id} style={styles.subtaskRow}>
                <Icon name="check-square" size={14} color={Colors.secondary} />
                <Text style={styles.subtaskText} numberOfLines={1}>{s.title}</Text>
                <TouchableOpacity onPress={() => removeSubtask(s.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="x" size={14} color={Colors.muted} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.subtaskInputRow}>
              <TextInput
                style={styles.subtaskInput}
                placeholder="Add a subtask…"
                placeholderTextColor={Colors.muted}
                value={subtaskInput}
                onChangeText={setSubtaskInput}
                onSubmitEditing={addSubtask}
                returnKeyType="done"
                blurOnSubmit={false}
                maxLength={120}
              />
              <TouchableOpacity
                onPress={addSubtask}
                style={styles.subtaskAddBtn}
                disabled={!subtaskInput.trim()}
              >
                <Icon
                  name="plus"
                  size={16}
                  color={subtaskInput.trim() ? Colors.primary : Colors.border}
                />
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <GradientButton
              label="Add Task"
              onPress={handleSubmit}
              loading={loading}
              style={{ marginTop: Spacing.lg, marginBottom: Spacing.md }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...(Typography.h2 as object),
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  sectionLabel: {
    ...(Typography.label as object),
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  priorityBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pickerRow: {
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
  pickerRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
  },
  pickerRowError: {
    borderColor: Colors.error,
    backgroundColor: `${Colors.error}10`,
  },
  deadlineErrorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    marginBottom: 6,
  },
  subtaskText: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
    paddingVertical: 10,
  },
  subtaskAddBtn: {
    padding: 6,
  },
});

export default AddTaskSheet;
