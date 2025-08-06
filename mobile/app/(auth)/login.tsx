import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Checkbox,
  IconButton,
  Surface,
} from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { theme } from '../../src/styles/theme';
import { RootState } from '../../src/store/store';
import { loginUser, loginWithBiometric } from '../../src/store/slices/authSlice';
import { showMessage } from '../../src/utils/message';
import { validateEmail } from '../../src/utils/validation';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const dispatch = useDispatch();
  const router = useRouter();
  const { isLoading, biometricEnabled } = useSelector((state: RootState) => state.auth);

  const scaleAnimation = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
  }));

  const handleLogin = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        scaleAnimation.value = withSpring(0.95);
        const result = await dispatch(loginUser({ email, password, rememberMe }) as any);
        
        if (result.type === 'auth/login/fulfilled') {
          showMessage('Welcome back!', 'success');
          router.replace('/');
        } else {
          showMessage(result.payload?.message || 'Login failed', 'error');
        }
      } catch (error) {
        showMessage('Login failed. Please try again.', 'error');
      } finally {
        scaleAnimation.value = withSpring(1);
      }
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (!hasHardware || supportedTypes.length === 0) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device does not support biometric authentication.'
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in with biometric authentication',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        const loginResult = await dispatch(loginWithBiometric() as any);
        if (loginResult.type === 'auth/biometric/fulfilled') {
          showMessage('Welcome back!', 'success');
          router.replace('/');
        }
      }
    } catch (error) {
      showMessage('Biometric authentication failed', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <Animated.View style={animatedStyle}>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.form}>
                  <TextInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    mode="outlined"
                    style={styles.input}
                    error={!!errors.email}
                    left={<TextInput.Icon icon="email" />}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}

                  <TextInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    mode="outlined"
                    style={styles.input}
                    error={!!errors.password}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                  />
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}

                  <View style={styles.optionsRow}>
                    <View style={styles.checkboxContainer}>
                      <Checkbox
                        status={rememberMe ? 'checked' : 'unchecked'}
                        onPress={() => setRememberMe(!rememberMe)}
                      />
                      <Text style={styles.checkboxLabel}>Remember me</Text>
                    </View>

                    <Link href="/(auth)/forgot-password" asChild>
                      <Button mode="text" compact>
                        Forgot Password?
                      </Button>
                    </Link>
                  </View>

                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.loginButton}
                    contentStyle={styles.buttonContent}
                  >
                    Sign In
                  </Button>

                  {biometricEnabled && (
                    <View style={styles.divider}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  )}

                  {biometricEnabled && (
                    <Surface style={styles.biometricButton} elevation={1}>
                      <IconButton
                        icon="fingerprint"
                        size={32}
                        mode="contained"
                        onPress={handleBiometricLogin}
                        style={styles.biometricIcon}
                      />
                      <Text style={styles.biometricText}>
                        Use biometric authentication
                      </Text>
                    </Surface>
                  )}
                </View>
              </Card.Content>
            </Card>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Button mode="text" compact>
                Sign Up
              </Button>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  card: {
    marginBottom: 24,
    borderRadius: 16,
    elevation: 4,
  },
  cardContent: {
    padding: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'transparent',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    marginLeft: 8,
    color: theme.colors.onSurface,
  },
  loginButton: {
    marginTop: 16,
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.outline,
  },
  dividerText: {
    marginHorizontal: 16,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '500',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
  },
  biometricIcon: {
    margin: 0,
  },
  biometricText: {
    marginLeft: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: theme.colors.onSurfaceVariant,
  },
});