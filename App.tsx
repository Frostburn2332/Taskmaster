import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { bootstrapNotifications } from './src/services/NotificationService';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { store, persistor } from './src/store/store';
import AuthProvider from './src/navigation/AuthProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { Colors, Typography } from './src/theme';

// ─── Custom Toast Config ──────────────────────────────────────────────────────

const toastConfig: ToastConfig = {
  success: props => (
    <BaseToast
      {...props}
      style={toastStyles.success}
      contentContainerStyle={toastStyles.content}
      text1Style={toastStyles.text1}
      text2Style={toastStyles.text2}
    />
  ),
  error: props => (
    <ErrorToast
      {...props}
      style={toastStyles.error}
      contentContainerStyle={toastStyles.content}
      text1Style={toastStyles.text1}
      text2Style={toastStyles.text2}
    />
  ),
};

const toastStyles = StyleSheet.create({
  success: {
    borderLeftColor: Colors.secondary,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    height: 'auto' as unknown as number,
    paddingVertical: 10,
  },
  error: {
    borderLeftColor: Colors.error,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    height: 'auto' as unknown as number,
    paddingVertical: 10,
  },
  content: {
    paddingHorizontal: 16,
  },
  text1: {
    ...(Typography.h3 as object),
    fontSize: 14,
    color: Colors.onBackground,
  },
  text2: {
    ...(Typography.caption as object),
    color: Colors.muted,
  },
});

// ─── Loading Fallback ─────────────────────────────────────────────────────────

const LoadingFallback: React.FC = () => (
  <View style={appStyles.loader}>
    <ActivityIndicator color={Colors.primary} size="large" />
  </View>
);

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  useEffect(() => { bootstrapNotifications(); }, []);
  return (
  <GestureHandlerRootView style={appStyles.flex}>
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={<LoadingFallback />} persistor={persistor}>
          <NavigationContainer>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </NavigationContainer>
          <Toast config={toastConfig} topOffset={56} />
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
  );
};

const appStyles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
