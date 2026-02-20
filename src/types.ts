// ─── Domain Models ───────────────────────────────────────────────────────────

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'COMPLETED';

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: number; // Unix timestamp (ms) — serialisable for Redux / Firestore
  status: TaskStatus;
  createdAt: number; // Unix timestamp (ms)
  tags: string[];
  subtasks: Subtask[]; // default [] — backward compatible
  completedAt?: number; // Unix timestamp (ms) — set when COMPLETED, cleared on revert
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  TaskDetail: { taskId: string };
};

// ─── Redux State Slices ───────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

export interface RootState {
  auth: AuthState;
  tasks: TasksState;
}

// ─── Smart Sort ───────────────────────────────────────────────────────────────

export interface ScoredTask extends Task {
  score: number;
}
