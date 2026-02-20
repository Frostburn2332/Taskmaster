import { createSelector } from '@reduxjs/toolkit';
import type { RootState, Task, ScoredTask, Priority } from '../types';

// ─── Weight Constants ─────────────────────────────────────────────────────────

const PRIORITY_WEIGHTS: Record<Priority, number> = {
  HIGH: 100,
  MEDIUM: 50,
  LOW: 10,
};

const URGENCY_MULTIPLIER = 50;
const MS_PER_HOUR = 1000 * 60 * 60;

// ─── Scoring Logic ────────────────────────────────────────────────────────────

/**
 * Calculates the Smart Sort score for a single task.
 *
 * Score = PriorityWeight + UrgencyWeight
 *   PriorityWeight : HIGH=100, MED=50, LOW=10
 *   UrgencyWeight  : (1 / hoursRemaining) * 50
 *
 * Edge cases:
 *   - Past-due tasks receive a large urgency bonus (treated as 0.01 h remaining).
 *   - Completed tasks receive a score of 0 so they sink to the bottom.
 */
export function computeScore(task: Task, now: number = Date.now()): number {
  if (task.status === 'COMPLETED') return 0;

  const priorityWeight = PRIORITY_WEIGHTS[task.priority];

  const msRemaining = task.deadline - now;
  const hoursRemaining = msRemaining > 0 ? msRemaining / MS_PER_HOUR : 0.01;
  const urgencyWeight = (1 / hoursRemaining) * URGENCY_MULTIPLIER;

  return priorityWeight + urgencyWeight;
}

/**
 * Portfolio-level on-time consistency score (0–100).
 *
 * Only tasks that were completed BEFORE their deadline count as successes.
 * Tasks completed late, or still pending past their deadline, count as failures.
 *
 *   score = completedOnTime / (completedOnTime + completedLate + overdue) × 100
 *
 * Returns 0 when there is no history yet (no tasks have been completed or overdue).
 */
export function computeConsistencyScore(tasks: Task[], now: number = Date.now()): number {
  const onTime  = tasks.filter(t =>
    t.status === 'COMPLETED' &&
    t.completedAt != null &&
    t.completedAt <= t.deadline,
  ).length;

  const late    = tasks.filter(t =>
    t.status === 'COMPLETED' &&
    (t.completedAt == null || t.completedAt > t.deadline),
  ).length;

  const overdue = tasks.filter(t =>
    t.status === 'PENDING' && t.deadline < now,
  ).length;

  const total = onTime + late + overdue;
  if (total === 0) return 0;
  return Math.round((onTime / total) * 100);
}

/**
 * Per-task time-health score (0–100).
 *
 * Measures what fraction of the task's allotted time is still remaining.
 * Higher = more runway left = more likely to be finished on time.
 *
 *   score = (deadline − now) / (deadline − createdAt) × 100
 *
 * Completed tasks always return 100. Overdue tasks return 0.
 */
export function computeTimeHealth(task: Task, now: number = Date.now()): number {
  if (task.status === 'COMPLETED') {
    // On-time completion → full marks; late completion → 0
    return task.completedAt != null && task.completedAt <= task.deadline ? 100 : 0;
  }
  const total     = task.deadline - task.createdAt;
  if (total <= 0) return 0;
  const remaining = task.deadline - now;
  return Math.round(Math.max(0, Math.min(100, (remaining / total) * 100)));
}

// ─── Input Selectors ──────────────────────────────────────────────────────────

const selectTasks = (state: RootState) => state.tasks.tasks;

// ─── Memoised Selector ────────────────────────────────────────────────────────

/**
 * Returns all tasks sorted descending by their Smart Sort score.
 * Memoised with reselect — only recomputes when the tasks array changes.
 */
export const selectSmartSortedTasks = createSelector(
  [selectTasks],
  (tasks): ScoredTask[] => {
    const now = Date.now();
    return tasks
      .map<ScoredTask>(task => ({ ...task, score: computeScore(task, now) }))
      .sort((a, b) => b.score - a.score);
  },
);

/** Overall on-time consistency score for the signed-in user (0–100). */
export const selectConsistencyScore = createSelector(
  [selectTasks],
  (tasks): number => computeConsistencyScore(tasks),
);

/** Convenience selectors */
export const selectPendingTasks = createSelector(
  [selectSmartSortedTasks],
  tasks => tasks.filter(t => t.status === 'PENDING'),
);

export const selectCompletedTasks = createSelector(
  [selectSmartSortedTasks],
  tasks => tasks.filter(t => t.status === 'COMPLETED'),
);
