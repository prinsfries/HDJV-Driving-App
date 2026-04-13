import React, { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { UI } from '@/constants/ui';
import logo from '../assets/images/HDJV_OFFICIAL_LOGO_1.png';
import { loginAndInitializeSession } from '@/features/auth/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await loginAndInitializeSession(email, password);
      if (result.needsPasswordChange) {
        router.replace('/force-change-password');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CornerTriangles />
      <KeyboardAvoidingView
        enabled
        behavior="padding"
        keyboardVerticalOffset={0}
        style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <Card style={styles.card}>

            <View style={styles.hero}>
              <Image source={logo} style={[styles.logo, {width:350, height:250}]} resizeMode="contain" />
              <Text style={styles.title}>HDJV Transpo App </Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <Input
              ref={emailInputRef}
              label="Email or Username"
              placeholder="Email or Username"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              returnKeyType="next"
            />
            <Input
              ref={passwordInputRef}
              label="Password"
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
              right={
                <Pressable style={styles.inputIconBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={UI.colors.textMuted} />
                </Pressable>
              }
            />
            <PrimaryButton title="Login" isLoading={loading} onPress={handleLogin} style={styles.button} />
            <Pressable onPress={() => router.push('/register')}>
              <Text style={styles.linkText}>No account yet? Register</Text>
            </Pressable>
            <Text style={styles.helperText}>Use your company credentials to continue.</Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI.colors.background,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  logoWrap: {
    width: 172,
    height: 172,
    borderRadius: UI.radius.xl,
    backgroundColor: UI.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.soft,
  },
  logo: {
    width: 140,
    height: 90,
  },
  title: {
    fontSize: 26,
    fontFamily: UI.fonts.heading,
    color: UI.colors.text,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 14,
    color: UI.colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    fontFamily: UI.fonts.body,
  },
  card: {
    gap: 12,
    padding: 18,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.soft,
  },
  label: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.md,
    paddingHorizontal: 14,
    backgroundColor: UI.colors.inputBackground,
    color: UI.colors.text,
    fontFamily: UI.fonts.body,
  },
  button: {
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    textAlign: 'center',
    fontFamily: UI.fonts.body,
  },
  linkText: {
    marginTop: 4,
    textAlign: 'center',
    color: UI.colors.green,
    fontSize: 13,
    fontFamily: UI.fonts.bodyMedium,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: UI.radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: UI.colors.danger,
    fontSize: 14,
    fontFamily: UI.fonts.bodyMedium,
    flex: 1,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputPassword: {
    paddingRight: 42,
  },
  inputIconBtn: {
    position: 'absolute',
    right: 10,
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
