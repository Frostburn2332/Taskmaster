import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import useAppSelector from '../hooks/useAppSelector';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import HomeScreen from '../features/tasks/screens/HomeScreen';
import TaskDetailScreen from '../features/tasks/screens/TaskDetailScreen';
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const user = useAppSelector(state => state.auth.user);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'ios_from_right',
        contentStyle: { backgroundColor: '#121212' },
      }}
    >
      {user ? (
        // ── Authenticated Stack ──────────────────────────────────────────────
        <>
          <Stack.Screen name="Home"       component={HomeScreen}       />
          <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        </>
      ) : (
        // ── Auth Stack ───────────────────────────────────────────────────────
        <>
          <Stack.Screen name="Login"    component={LoginScreen}    />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
