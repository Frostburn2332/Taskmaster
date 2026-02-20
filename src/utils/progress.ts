import type { Subtask } from '../types';

/**
 * Returns the completion percentage of a subtask list.
 * Result is in [0, 100]. Returns 0 when the list is empty.
 */
export function getSubtaskProgress(subtasks: Subtask[]): number {
  if (!subtasks.length) return 0;
  const completed = subtasks.filter(s => s.isCompleted).length;
  return (completed / subtasks.length) * 100;
}
