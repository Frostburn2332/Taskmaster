import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, doc } from '@react-native-firebase/firestore';

/**
 * React Native Firebase v22+ Modular Configuration
 */

// Service Instances (Modular style)
export const firebaseAuth = getAuth();
export const firestoreDB = getFirestore();

// Collection helpers using modular syntax
export const tasksCollection = (uid: string) => {
  // Pattern: collection(database, path, ...segments)
  return collection(firestoreDB, 'users', uid, 'tasks');
};

// If you need a specific task document helper:
export const taskDoc = (uid: string, taskId: string) => {
  return doc(firestoreDB, 'users', uid, 'tasks', taskId);
};