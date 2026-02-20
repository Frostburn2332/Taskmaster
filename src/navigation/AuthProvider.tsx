import React, { useEffect, useRef, ReactNode } from 'react';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
} from '@react-native-firebase/firestore';
import { setUser } from '../store/authSlice';
import { clearTasks, setTasks, setTasksLoading } from '../store/tasksSlice';
import useAppDispatch from '../hooks/useAppDispatch';
import type { Task } from '../types';

interface AuthProviderProps {
  children: ReactNode;
}

const db = getFirestore();

/**
 * Listens to Firebase Auth state changes and syncs the Redux store.
 * On sign-in → sets up a real-time Firestore onSnapshot listener that
 *   pushes task updates to Redux whenever data changes in Firestore.
 * On sign-out → unsubscribes the listener and clears state.
 */
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const tasksUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      getAuth(),
      (firebaseUser: FirebaseAuthTypes.User | null) => {
        // Always tear down the previous snapshot listener first
        if (tasksUnsubscribeRef.current) {
          tasksUnsubscribeRef.current();
          tasksUnsubscribeRef.current = null;
        }

        if (firebaseUser) {
          dispatch(
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? undefined,
            }),
          );

          // Show loading while waiting for the first snapshot
          dispatch(setTasksLoading(true));

          const tasksRef = collection(db, 'users', firebaseUser.uid, 'tasks');
          const q = query(tasksRef, orderBy('createdAt', 'desc'));

          tasksUnsubscribeRef.current = onSnapshot(q, snapshot => {
            const tasks: Task[] = snapshot.docs.map(document => {
              const data = document.data();
              return {
                ...data,
                id: document.id,
                // serverTimestamp() comes back as a Firestore Timestamp — convert to ms
                createdAt:
                  data.createdAt?.toMillis?.() ?? data.createdAt ?? Date.now(),
              } as Task;
            });
            dispatch(setTasks(tasks));
          });
        } else {
          dispatch(setUser(null));
          dispatch(clearTasks());
        }
      },
    );

    return () => {
      unsubscribeAuth();
      if (tasksUnsubscribeRef.current) {
        tasksUnsubscribeRef.current();
      }
    };
  }, [dispatch]);

  return <>{children}</>;
};

export default AuthProvider;
