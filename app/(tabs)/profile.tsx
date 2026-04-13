import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { UI } from '@/constants/ui';
import {
  checkAccountStatus,
  getUser,
  logout,
  updateUserPreferences,
  type User,
  type UserPreferences,
} from '@/utils/auth';
import { formatDate } from '@/utils/date';

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const currentPrefs: UserPreferences = {
    date_format: user?.preferences?.date_format ?? 'long',
    time_format: user?.preferences?.time_format ?? '12h',
  };

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      const active = await checkAccountStatus();
      if (!active) {
        router.replace('/login');
        return;
      }
      const u = await getUser();
      if (isMounted) setUser(u);
    }
    loadUser();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const displayName = user?.full_name || user?.name || user?.username || 'Driver';
  const roleLabel = user?.role
    ? `HDJV ${String(user.role).charAt(0).toUpperCase()}${String(user.role).slice(1)}`
    : 'HDJV Driver';
  const initials = displayName
    ? String(displayName).split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
    : '??';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CornerTriangles />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 12 }]}>
        <ScreenHeader title="Profile" />

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.role}>{roleLabel}</Text>
          </View>
        </Card>

        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact</Text>
            <Text style={styles.detailValue}>{user?.contact || 'N/A'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Join Date</Text>
            <Text style={styles.detailValue}>{user?.created_at ? (currentPrefs.date_format === 'short' ? new Date(user.created_at).toLocaleDateString('en-CA') : formatDate(new Date(user.created_at))) : 'N/A'}</Text>
          </View>
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date Format</Text>
            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segmentButton, currentPrefs.date_format === 'long' ? styles.segmentActive : null]}
                onPress={async () => {
                  if (savingPrefs) return;
                  setSavingPrefs(true);
                  setPrefsError(null);
                  try {
                    const updated = await updateUserPreferences({
                      ...currentPrefs,
                      date_format: 'long',
                    });
                    setUser(updated);
                  } catch {
                    setPrefsError('Unable to save preference');
                  } finally {
                    setSavingPrefs(false);
                  }
                }}>
                <Text style={styles.segmentText}>Long</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, currentPrefs.date_format === 'short' ? styles.segmentActive : null]}
                onPress={async () => {
                  if (savingPrefs) return;
                  setSavingPrefs(true);
                  setPrefsError(null);
                  try {
                    const updated = await updateUserPreferences({
                      ...currentPrefs,
                      date_format: 'short',
                    });
                    setUser(updated);
                  } catch {
                    setPrefsError('Unable to save preference');
                  } finally {
                    setSavingPrefs(false);
                  }
                }}>
                <Text style={styles.segmentText}>Short</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time Format</Text>
            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segmentButton, currentPrefs.time_format === '12h' ? styles.segmentActive : null]}
                onPress={async () => {
                  if (savingPrefs) return;
                  setSavingPrefs(true);
                  setPrefsError(null);
                  try {
                    const updated = await updateUserPreferences({
                      ...currentPrefs,
                      time_format: '12h',
                    });
                    setUser(updated);
                  } catch {
                    setPrefsError('Unable to save preference');
                  } finally {
                    setSavingPrefs(false);
                  }
                }}>
                <Text style={styles.segmentText}>12-hour</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, currentPrefs.time_format === '24h' ? styles.segmentActive : null]}
                onPress={async () => {
                  if (savingPrefs) return;
                  setSavingPrefs(true);
                  setPrefsError(null);
                  try {
                    const updated = await updateUserPreferences({
                      ...currentPrefs,
                      time_format: '24h',
                    });
                    setUser(updated);
                  } catch {
                    setPrefsError('Unable to save preference');
                  } finally {
                    setSavingPrefs(false);
                  }
                }}>
                <Text style={styles.segmentText}>24-hour</Text>
              </Pressable>
            </View>
          </View>
          {!!prefsError && (
            <Text style={styles.errorText}>{prefsError}</Text>
          )}
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.divider} />
          <Pressable style={styles.securityButton} onPress={() => router.push('/change-password')}>
            <Text style={styles.securityButtonText}>Change Password</Text>
          </Pressable>
        </Card>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI.colors.background,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: UI.colors.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.colors.border,
  },
  avatarText: {
    fontSize: 18,
    color: UI.colors.greenDark,
    fontFamily: UI.fonts.heading,
  },
  profileText: {
    gap: 4,
  },
  name: {
    fontSize: 20,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  role: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  detailsCard: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: UI.fonts.bodyMedium,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  divider: {
    height: 1,
    backgroundColor: UI.colors.border,
    opacity: 0.6,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: UI.radius.md,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surface,
  },
  segmentActive: {
    backgroundColor: UI.colors.blueSoft,
    borderColor: UI.colors.blue,
  },
  segmentText: {
    color: UI.colors.text,
    fontSize: 12,
    fontFamily: UI.fonts.bodyMedium,
  },
  errorText: {
    color: UI.colors.danger,
    fontSize: 12,
    fontFamily: UI.fonts.bodyMedium,
    textAlign: 'right',
  },
  securityButton: {
    height: 46,
    borderRadius: UI.radius.md,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityButtonText: {
    color: UI.colors.text,
    fontSize: 14,
    fontFamily: UI.fonts.bodyMedium,
  },
  logoutButton: {
    marginTop: 10,
    height: 48,
    backgroundColor: UI.colors.danger,
    borderRadius: UI.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.soft,
  },
  logoutText: {
    color: UI.colors.white,
    fontSize: 15,
    fontFamily: UI.fonts.bodyMedium,
  },
});
