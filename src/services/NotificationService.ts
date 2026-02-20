import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import type { Task } from '../types';

const CHANNEL_ID  = 'task-reminders';
const ONE_HOUR_MS = 60 * 60 * 1000;

const REMINDER_SUFFIX = '-reminder';
const DEADLINE_SUFFIX = '-deadline';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Call once on app launch.
 * Creates the Android notification channel and requests permission (Android 13+).
 */
export async function bootstrapNotifications(): Promise<void> {
  await notifee.requestPermission();
  await notifee.createChannel({
    id:         CHANNEL_ID,
    name:       'Task Reminders',
    importance: AndroidImportance.HIGH,
    sound:      'default',
  });
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

/**
 * Schedules two notifications for a task:
 *  1. Reminder  — 1 hour before the deadline.
 *  2. Deadline  — exactly at the deadline, using alarmManager so it fires
 *                 even when the device is in Android Doze mode.
 *
 * Silently skips any trigger whose time is already in the past.
 * Requests permission before scheduling to handle Android 13+ requirements.
 */
export async function scheduleTaskNotifications(task: Task): Promise<void> {
  const settings = await notifee.requestPermission();
  // authorizationStatus 1 = AUTHORIZED, on Android this is always 1 after granting
  if (!settings || settings.authorizationStatus < 1) return;

  const now          = Date.now();
  const reminderTime = task.deadline - ONE_HOUR_MS;
  const deadlineTime = task.deadline;

  const promises: Promise<string>[] = [];

  // ── 1-hour reminder ──
  if (reminderTime > now) {
    const reminderTrigger: TimestampTrigger = {
      type:      TriggerType.TIMESTAMP,
      timestamp: reminderTime,
    };
    promises.push(
      notifee.createTriggerNotification(
        {
          id:    `${task.id}${REMINDER_SUFFIX}`,
          title: '⏰ Task Due Soon',
          body:  `"${task.title}" is due in 1 hour`,
          android: {
            channelId:   CHANNEL_ID,
            importance:  AndroidImportance.HIGH,
            pressAction: { id: 'default' },
            smallIcon:   'ic_launcher',
          },
        },
        reminderTrigger,
      ),
    );
  }

  // ── Deadline alert (alarmManager ensures delivery through Doze) ──
  if (deadlineTime > now) {
    const deadlineTrigger: TimestampTrigger = {
      type:         TriggerType.TIMESTAMP,
      timestamp:    deadlineTime,
      alarmManager: { allowWhileIdle: true },
    };
    promises.push(
      notifee.createTriggerNotification(
        {
          id:    `${task.id}${DEADLINE_SUFFIX}`,
          title: '🔔 Task Deadline Reached',
          body:  `"${task.title}" is due right now!`,
          android: {
            channelId:   CHANNEL_ID,
            importance:  AndroidImportance.HIGH,
            pressAction: { id: 'default' },
            smallIcon:   'ic_launcher',
          },
        },
        deadlineTrigger,
      ),
    );
  }

  await Promise.all(promises);
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

/**
 * Cancels both the reminder and deadline notifications for a task.
 * Call when a task is deleted or marked as completed.
 */
export async function cancelTaskNotifications(taskId: string): Promise<void> {
  await Promise.all([
    notifee.cancelTriggerNotification(`${taskId}${REMINDER_SUFFIX}`),
    notifee.cancelTriggerNotification(`${taskId}${DEADLINE_SUFFIX}`),
  ]);
}

// ─── Legacy aliases (keeps App.tsx bootstrapNotifications call intact) ────────
export { bootstrapNotifications as default };
