import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
} from '@react-native-firebase/firestore';
import {
  scheduleTaskNotifications,
  cancelTaskNotifications,
} from '../services/NotificationService';
import type { Task, TasksState, Subtask } from '../types';

// Initialize Firestore instance
const db = getFirestore();

// ─── Async Thunks ─────────────────────────────────────────────────────────────

/** Fetch all tasks for the current user from Firestore */
export const fetchTasks = createAsyncThunk<Task[], string, { rejectValue: string }>(
  'tasks/fetchTasks',
  async (uid, { rejectWithValue }) => {
    try {
      // Modular way to query: collection -> query -> getDocs
      const tasksRef = collection(db, 'users', uid, 'tasks');
      const q = query(tasksRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(document => ({ 
        id: document.id, 
        ...document.data() 
      } as Task));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch tasks.';
      return rejectWithValue(message);
    }
  },
);

/** Add a new task for the current user in Firestore */
export const addTask = createAsyncThunk<
  Task,
  { uid: string; task: Omit<Task, 'id'> },
  { rejectValue: string }
>('tasks/addTask', async ({ uid, task }, { rejectWithValue }) => {
  try {
    const tasksRef = collection(db, 'users', uid, 'tasks');
    // Use the client-side createdAt (already set in AddTaskSheet) so Firestore's
    // orderBy query always has a concrete value and onSnapshot fires immediately
    // with the local write — no pending serverTimestamp sentinel that could
    // temporarily exclude the document from ordered query snapshots.
    const docRef = await addDoc(tasksRef, { ...task });
    const saved: Task = { id: docRef.id, ...task };
    scheduleTaskNotifications(saved).catch(() => null);
    return saved;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add task.';
    return rejectWithValue(message);
  }
});

/** Update an existing task */
export const updateTask = createAsyncThunk<
  Task,
  { uid: string; task: Task },
  { rejectValue: string }
>('tasks/updateTask', async ({ uid, task }, { rejectWithValue }) => {
  try {
    const { id, ...data } = task;
    const taskRef = doc(db, 'users', uid, 'tasks', id);
    await updateDoc(taskRef, { ...data });
    // Cancel stale triggers then reschedule with the new deadline
    cancelTaskNotifications(task.id).catch(() => null);
    scheduleTaskNotifications(task).catch(() => null);
    return task;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update task.';
    return rejectWithValue(message);
  }
});

/** Delete a task */
export const deleteTask = createAsyncThunk<
  string,
  { uid: string; taskId: string },
  { rejectValue: string }
>('tasks/deleteTask', async ({ uid, taskId }, { rejectWithValue }) => {
  try {
    const taskRef = doc(db, 'users', uid, 'tasks', taskId);
    await deleteDoc(taskRef);
    cancelTaskNotifications(taskId).catch(() => null);
    return taskId;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete task.';
    return rejectWithValue(message);
  }
});

/** Toggle a single subtask's completion within a task */
export const toggleSubtask = createAsyncThunk<
  { taskId: string; updatedSubtasks: Subtask[] },
  { uid: string; taskId: string; subtaskId: string; subtasks: Subtask[] },
  { rejectValue: string }
>('tasks/toggleSubtask', async ({ uid, taskId, subtaskId, subtasks }, { rejectWithValue }) => {
  try {
    const updatedSubtasks = subtasks.map(s =>
      s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s,
    );
    const taskRef = doc(db, 'users', uid, 'tasks', taskId);
    await updateDoc(taskRef, { subtasks: updatedSubtasks });
    return { taskId, updatedSubtasks };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle subtask.';
    return rejectWithValue(message);
  }
});

/** Toggle task completion status */
export const toggleTaskStatus = createAsyncThunk<
  Task,
  { uid: string; task: Task },
  { rejectValue: string }
>('tasks/toggleTaskStatus', async ({ uid, task }, { rejectWithValue }) => {
  try {
    const newStatus   = task.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
    const completedAt = newStatus === 'COMPLETED' ? Date.now() : null;
    const taskRef     = doc(db, 'users', uid, 'tasks', task.id);
    await updateDoc(taskRef, { status: newStatus, completedAt });
    const updated = { ...task, status: newStatus, completedAt: completedAt ?? undefined };
    if (newStatus === 'COMPLETED') {
      // Task done — remove pending notifications
      cancelTaskNotifications(task.id).catch(() => null);
    } else {
      // Reverted to pending — reschedule if deadline still in future
      scheduleTaskNotifications(updated as Task).catch(() => null);
    }
    return updated;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle status.';
    return rejectWithValue(message);
  }
});

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: TasksState = {
  tasks: [],
  loading: false,
  error: null,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearTasks(state) {
      state.tasks = [];
    },
    clearTasksError(state) {
      state.error = null;
    },
    setTasks(state, action: PayloadAction<Task[]>) {
      state.tasks = action.payload;
      state.loading = false;
    },
    setTasksLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
  extraReducers: builder => {
    // ── Fetch ──
    builder.addCase(fetchTasks.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTasks.fulfilled, (state, action) => {
      state.loading = false;
      state.tasks = action.payload;
    });
    builder.addCase(fetchTasks.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? 'Fetch failed.';
    });

    // ── Add ──
    // We do NOT optimistically unshift here. The onSnapshot listener in
    // AuthProvider is the single source of truth and will update the store
    // almost immediately after the local Firestore write completes.
    builder.addCase(addTask.pending, state => {
      state.error = null;
    });
    builder.addCase(addTask.fulfilled, state => {
      state.loading = false;
    });
    builder.addCase(addTask.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? 'Add failed.';
    });

    // ── Update ──
    builder.addCase(updateTask.fulfilled, (state, action) => {
      const idx = state.tasks.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) state.tasks[idx] = action.payload;
    });
    builder.addCase(updateTask.rejected, (state, action) => {
      state.error = action.payload ?? 'Update failed.';
    });

    // ── Delete ──
    builder.addCase(deleteTask.fulfilled, (state, action) => {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    });
    builder.addCase(deleteTask.rejected, (state, action) => {
      state.error = action.payload ?? 'Delete failed.';
    });

    // ── Toggle Subtask ──
    builder.addCase(toggleSubtask.fulfilled, (state, action) => {
      const { taskId, updatedSubtasks } = action.payload;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) task.subtasks = updatedSubtasks;
    });
    builder.addCase(toggleSubtask.rejected, (state, action) => {
      state.error = action.payload ?? 'Subtask toggle failed.';
    });

    // ── Toggle Status ──
    builder.addCase(toggleTaskStatus.fulfilled, (state, action) => {
      const idx = state.tasks.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) state.tasks[idx] = action.payload;
    });
    builder.addCase(toggleTaskStatus.rejected, (state, action) => {
      state.error = action.payload ?? 'Toggle failed.';
    });
  },
});

export const { clearTasks, clearTasksError, setTasks, setTasksLoading } = tasksSlice.actions;
export default tasksSlice.reducer;