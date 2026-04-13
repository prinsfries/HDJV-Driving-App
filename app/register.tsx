import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { UI } from '@/constants/ui';
import { register } from '@/utils/auth';

type AccountRole = 'driver' | 'passenger';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AccountRole>('driver');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        suffix: suffix.trim() || undefined,
        email: email.trim(),
        username: username.trim() || undefined,
        password,
        contact: contact.trim() || undefined,
        role,
      });
      router.replace('/login');
    } catch (err: any) {
      setError(err?.message || 'Registration failed');
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
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Choose account type and complete details.</Text>

            <View style={styles.roleWrap}>
              <Pressable
                style={[styles.roleBtn, role === 'driver' && styles.roleBtnActive]}
                onPress={() => setRole('driver')}>
                <Text style={[styles.roleText, role === 'driver' && styles.roleTextActive]}>Driver</Text>
              </Pressable>
              <Pressable
                style={[styles.roleBtn, role === 'passenger' && styles.roleBtnActive]}
                onPress={() => setRole('passenger')}>
                <Text style={[styles.roleText, role === 'passenger' && styles.roleTextActive]}>Passenger</Text>
              </Pressable>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.requiredLabel}>First Name <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              placeholder="First Name"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
            />
            <Text style={styles.fieldLabel}>Middle Name</Text>
            <TextInput
              placeholder="Middle Name"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              value={middleName}
              onChangeText={setMiddleName}
            />
            <Text style={styles.requiredLabel}>Last Name <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              placeholder="Last Name"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
            />
            <Text style={styles.fieldLabel}>Suffix</Text>
            <TextInput
              placeholder="Suffix"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              value={suffix}
              onChangeText={setSuffix}
            />
            <Text style={styles.requiredLabel}>Email <Text style={styles.requiredStar}>*</Text></Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Text style={styles.fieldLabel}>Username (optional)</Text>
            <TextInput
              placeholder="Username"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <Text style={styles.fieldLabel}>Contact Number</Text>
            <TextInput
              placeholder="Contact Number"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              keyboardType="phone-pad"
              value={contact}
              onChangeText={setContact}
            />

            <Text style={styles.requiredLabel}>Password <Text style={styles.requiredStar}>*</Text></Text>
            <View style={styles.inputWrap}>
              <TextInput
                placeholder="Password"
                placeholderTextColor={UI.colors.placeholder}
                style={[styles.input, styles.inputPassword]}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <Pressable style={styles.inputIconBtn} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={UI.colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.requiredLabel}>Confirm Password <Text style={styles.requiredStar}>*</Text></Text>
            <View style={styles.inputWrap}>
              <TextInput
                placeholder="Confirm Password"
                placeholderTextColor={UI.colors.placeholder}
                style={[styles.input, styles.inputPassword]}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable style={styles.inputIconBtn} onPress={() => setShowConfirmPassword((v) => !v)}>
                <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color={UI.colors.textMuted} />
              </Pressable>
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}>
              {loading ? <ActivityIndicator color={UI.colors.white} /> : <Text style={styles.buttonText}>Register</Text>}
            </Pressable>

            <Pressable onPress={() => router.replace('/login')}>
              <Text style={styles.linkText}>Already have an account? Log in</Text>
            </Pressable>
          </View>
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
    paddingHorizontal: 18,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  card: {
    gap: 10,
    padding: 18,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.soft,
  },
  title: {
    fontSize: 24,
    fontFamily: UI.fonts.heading,
    color: UI.colors.text,
  },
  subtitle: {
    marginBottom: 6,
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  roleWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  roleBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.inputBackground,
  },
  roleBtnActive: {
    backgroundColor: UI.colors.green,
    borderColor: UI.colors.green,
  },
  roleText: {
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  roleTextActive: {
    color: UI.colors.white,
  },
  fieldLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  requiredLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  requiredStar: {
    color: UI.colors.danger,
    fontFamily: UI.fonts.bodyMedium,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.md,
    paddingHorizontal: 12,
    backgroundColor: UI.colors.inputBackground,
    color: UI.colors.text,
    fontFamily: UI.fonts.body,
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
    right: 8,
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    marginTop: 4,
    height: 48,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.medium,
  },
  buttonDisabled: {
    backgroundColor: UI.colors.textMuted,
    opacity: 0.7,
  },
  buttonText: {
    color: UI.colors.white,
    fontSize: 16,
    fontFamily: UI.fonts.bodyMedium,
  },
  linkText: {
    marginTop: 6,
    textAlign: 'center',
    color: UI.colors.green,
    fontSize: 13,
    fontFamily: UI.fonts.bodyMedium,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: UI.radius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: UI.colors.danger,
    fontSize: 13,
    fontFamily: UI.fonts.bodyMedium,
  },
});
