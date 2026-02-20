import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './authSlice';
import tasksReducer from './tasksSlice';

// ─── Persist Configuration ────────────────────────────────────────────────────

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['user'], // only persist the user object, not loading/error
};

const tasksPersistConfig = {
  key: 'tasks',
  storage: AsyncStorage,
  whitelist: ['tasks'], // only persist task data, not loading/error
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  tasks: persistReducer(tasksPersistConfig, tasksReducer),
});

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches non-serialisable actions internally
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// ─── Typed Helpers ────────────────────────────────────────────────────────────

export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
