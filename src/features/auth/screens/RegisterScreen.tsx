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
import Icon from 'react-native-vector-icons/Feather';
import GradientButton from '../../../components/atoms/GradientButton';
import InputFloatingLabel from '../../../components/atoms/InputFloatingLabel';
import { registerUser, clearAuthError } from '../../../store/authSlice';
import useAppDispatch from '../../../hooks/useAppDispatch';
import useAppSelector from '../../../hooks/useAppSelector';
import { validateEmail, validatePassword } from '../../../utils/validators';
import { Colors, Spacing, Typography } from '../../../theme';
import type { RootStackParamList } from '../../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(state => state.auth);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const validate = useCallback((): boolean => {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = password !== confirmPassword ? 'Passwords do not match.' : null;
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);

    if (eErr) {
      Toast.show({
        type: 'error',
        text1: 'Invalid email',
        text2: eErr,
        visibilityTime: 4000,
      });
    }

    return !eErr && !pErr && !cErr;
  }, [email, password, confirmPassword]);

  const handleRegister = useCallback(async () => {
    dispatch(clearAuthError());
    if (!validate()) return;

    const normalisedEmail = email.trim().toLowerCase();

    const result = await dispatch(
      registerUser({
        email: normalisedEmail,
        password,
        displayName: displayName.trim() || undefined,
      }),
    );

    if (registerUser.fulfilled.match(result)) {
      Toast.show({
        type: 'success',
        text1: 'Account created!',
        text2: 'Welcome to Taskmaster.',
      });
    } else if (registerUser.rejected.match(result)) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: result.payload as string,
      });
    }
  }, [dispatch, email, password, displayName, validate]);

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
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={Colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create account</Text>
          <Text style={styles.subtitle}>Join Taskmaster and own your schedule.</Text>

          <InputFloatingLabel
            label="Display Name (optional)"
            value={displayName}
            onChangeText={setDisplayName}
            returnKeyType="next"
            containerStyle={{ marginBottom: Spacing.md }}
          />

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
            returnKeyType="next"
            error={passwordError}
            containerStyle={{ marginBottom: Spacing.md }}
          />

          <InputFloatingLabel
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={t => { setConfirmPassword(t); setConfirmError(null); }}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            error={confirmError}
            containerStyle={{ marginBottom: Spacing.sm }}
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
              {showPassword ? 'Hide' : 'Show'} passwords
            </Text>
          </TouchableOpacity>

          {error ? (
            <Text style={styles.globalError}>{error}</Text>
          ) : null}

          <GradientButton
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: Spacing.md }}
          />

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>
                Sign In
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
    paddingTop: Spacing.xxl,
  },
  backBtn: {
    marginLeft: Spacing.lg,
    marginBottom: Spacing.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  form: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  formTitle: {
    ...(Typography.h1 as object),
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...(Typography.body as object),
    color: Colors.muted,
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
  loginLink: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  loginLinkText: {
    ...(Typography.body as object),
    color: Colors.muted,
  },
});

export default RegisterScreen;
