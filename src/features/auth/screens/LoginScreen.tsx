import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import GradientButton from '../../../components/atoms/GradientButton';
import InputFloatingLabel from '../../../components/atoms/InputFloatingLabel';
import { loginUser, clearAuthError } from '../../../store/authSlice';
import useAppDispatch from '../../../hooks/useAppDispatch';
import useAppSelector from '../../../hooks/useAppSelector';
import { validateEmail, validatePassword } from '../../../utils/validators';
import { Colors, Spacing, Typography } from '../../../theme';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validate = useCallback((): boolean => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    return !eErr && !pErr;
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    dispatch(clearAuthError());
    if (!validate()) return;

    const result = await dispatch(loginUser({ email: email.trim(), password }));
    if (loginUser.rejected.match(result)) {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: result.payload as string,
      });
    }
  }, [dispatch, email, password, validate]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient header */}
        <LinearGradient
          colors={['#1A0533', Colors.background]}
          style={styles.heroGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={styles.logoContainer}>
            <Icon name="check-square" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>Taskmaster</Text>
          <Text style={styles.tagline}>Conquer your day.</Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome back</Text>

          <InputFloatingLabel
            label="Email"
            value={email}
            onChangeText={t => { setEmail(t); setEmailError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            error={emailError}
            containerStyle={{ marginBottom: Spacing.md }}
          />

          <InputFloatingLabel
            label="Password"
            value={password}
            onChangeText={t => { setPassword(t); setPasswordError(null); }}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            error={passwordError}
            containerStyle={{ marginBottom: Spacing.lg }}
          />

          <TouchableOpacity
            style={styles.showPasswordRow}
            onPress={() => setShowPassword(p => !p)}
          >
            <Icon
              name={showPassword ? 'eye-off' : 'eye'}
              size={16}
              color={Colors.muted}
            />
            <Text style={styles.showPasswordText}>
              {showPassword ? 'Hide' : 'Show'} password
            </Text>
          </TouchableOpacity>

          {error ? (
            <Text style={styles.globalError}>{error}</Text>
          ) : null}

          <GradientButton
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: Spacing.md }}
          />

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              Don't have an account?{' '}
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>
                Sign Up
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  heroGradient: {
    alignItems: 'center',
    paddingTop: Spacing.xxl + 16,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    ...(Typography.h1 as object),
    color: Colors.primary,
    fontSize: 34,
    letterSpacing: 1,
  },
  tagline: {
    ...(Typography.body as object),
    color: Colors.muted,
    marginTop: 4,
  },
  form: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  formTitle: {
    ...(Typography.h2 as object),
    marginBottom: Spacing.xl,
  },
  showPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginBottom: Spacing.sm,
  },
  showPasswordText: {
    ...(Typography.caption as object),
    color: Colors.muted,
  },
  globalError: {
    ...(Typography.caption as object),
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  registerLink: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  registerLinkText: {
    ...(Typography.body as object),
    color: Colors.muted,
  },
});

export default LoginScreen;
