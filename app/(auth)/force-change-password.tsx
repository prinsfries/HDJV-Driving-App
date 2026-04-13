import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { UI } from '@/constants/ui';
import { updateUserPassword } from '@/utils/auth';

export default function ForceChangePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = () => {
    if (!password || !confirm) {
      setError('Please fill in all fields');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password.length > 64) {
      setError('Password must be at most 64 characters');
      return false;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setError('Use uppercase, lowercase, number and special character');
      return false;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await updateUserPassword(password, null, true);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CornerTriangles />
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Set a New Password</Text>
          <Text style={styles.subtitle}>This is required on your first login.</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              placeholder="Enter new password"
              placeholderTextColor={UI.colors.placeholder}
              style={[styles.input, styles.inputPassword]}
              secureTextEntry={!showNew}
              selectionColor={UI.colors.green}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={styles.inputIconBtn} onPress={() => setShowNew((v) => !v)}>
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={18} color={UI.colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              placeholder="Re-enter password"
              placeholderTextColor={UI.colors.placeholder}
              style={[styles.input, styles.inputPassword]}
              secureTextEntry={!showConfirm}
              selectionColor={UI.colors.green}
              value={confirm}
              onChangeText={setConfirm}
            />
            <Pressable style={styles.inputIconBtn} onPress={() => setShowConfirm((v) => !v)}>
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color={UI.colors.textMuted} />
            </Pressable>
          </View>

          <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={UI.colors.white} /> : <Text style={styles.buttonText}>Save Password</Text>}
          </Pressable>
          <Text style={styles.helperText}>Use 8-64 chars with uppercase, lowercase, number and special character.</Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 360,
    maxWidth: '92%',
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.xl,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.soft,
  },
  title: {
    fontSize: 18,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  subtitle: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  label: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
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
    height: 48,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.soft,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: UI.colors.white,
    fontSize: 14,
    fontFamily: UI.fonts.bodyMedium,
  },
  helperText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
    textAlign: 'center',
  },
  errorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.surface,
    borderColor: UI.colors.danger,
    borderWidth: 1,
  },
  errorText: {
    color: UI.colors.danger,
    fontFamily: UI.fonts.body,
    fontSize: 12,
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
