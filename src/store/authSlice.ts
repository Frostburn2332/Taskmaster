import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { firebaseAuth } from '../services/firebaseConfig';
import type { AuthState, User } from '../types';

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk<
  User,
  { email: string; password: string },
  { rejectValue: string }
>('auth/loginUser', async ({ email, password }, { rejectWithValue }) => {
  try {
    const credential = await firebaseAuth.signInWithEmailAndPassword(email, password);
    const { uid, email: userEmail, displayName } = credential.user;
    return {
      uid,
      email: userEmail ?? '',
      displayName: displayName ?? undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed.';
    return rejectWithValue(message);
  }
});

export const registerUser = createAsyncThunk<
  User,
  { email: string; password: string; displayName?: string },
  { rejectValue: string }
>('auth/registerUser', async ({ email, password, displayName }, { rejectWithValue }) => {
  try {
    const credential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    if (displayName) {
      await credential.user.updateProfile({ displayName });
    }
    return {
      uid: credential.user.uid,
      email: credential.user.email ?? '',
      displayName: displayName ?? undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed.';
    return rejectWithValue(message);
  }
});

export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await firebaseAuth.signOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logout failed.';
      return rejectWithValue(message);
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    // ── Login ──
    builder.addCase(loginUser.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? 'Login failed.';
    });

    // ── Register ──
    builder.addCase(registerUser.pending, state => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload;
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? 'Registration failed.';
    });

    // ── Logout ──
    builder.addCase(logoutUser.fulfilled, state => {
      state.user = null;
      state.loading = false;
      state.error = null;
    });
    builder.addCase(logoutUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload ?? 'Logout failed.';
    });
  },
});

export const { setUser, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
