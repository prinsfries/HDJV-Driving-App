import { PassengersSection } from '@/components/add/PassengersSection';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { UI } from '@/constants/ui';
import { getUser } from '@/utils/auth';
import { formatDate, formatTime } from '@/utils/date';
import { createRequest, listRequests } from '@/utils/requestApi';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RequestNewScreen() {
  const insets = useSafeAreaInsets();
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [passengers, setPassengers] = useState(['']);
  const [requestedAt, setRequestedAt] = useState<Date | null>(null);
  const [requestedAtText, setRequestedAtText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [useCoupon, setUseCoupon] = useState(false);
  const [role, setRole] = useState<string>('passenger');
  const [couponLeft, setCouponLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      const u = await getUser();
      if (!active) return;
      setRole(u?.role || 'passenger');
    };
    const loadCoupons = async () => {
      try {
        const items = await listRequests();
        if (!active) return;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const used = items.filter((r) => {
          if (!r.used_coupon || !r.created_at) return false;
          const dt = new Date(r.created_at);
          return dt >= start && dt <= end;
        }).length;
        setCouponLeft(Math.max(4 - used, 0));
      } catch {
        if (active) setCouponLeft(null);
      }
    };
    loadUser();
    loadCoupons();
    return () => {
      active = false;
    };
  }, []);

  const isKrPassenger = role === 'krpassenger';
  const canUseCoupon = isKrPassenger && (couponLeft ?? 0) > 0;

  const validPassengers = useMemo(() => {
    return passengers.filter(name => name.trim().length > 0);
  }, [passengers]);

  const formatDateTimeForApi = (value: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  };

  const requestedAtLabel = requestedAt
    ? `${formatDate(requestedAt)} - ${formatTime(requestedAt)}`
    : 'No date/time selected';

  const handleChangePassenger = (index: number, value: string) => {
    const newPassengers = [...passengers];
    newPassengers[index] = value;
    setPassengers(newPassengers);
  };

  const handleAddPassenger = () => {
    setPassengers([...passengers, '']);
  };

  const handleRemovePassenger = (index: number) => {
    const newPassengers = passengers.filter((_, i) => i !== index);
    setPassengers(newPassengers.length > 0 ? newPassengers : ['']);
  };

  const canRemovePassenger = passengers.length > 1;

  const handleSubmit = async () => {
    setError(null);
    if (!departure.trim() || !destination.trim()) {
      setError('Departure and destination are required.');
      return;
    }
    let requestedAtValue = requestedAt;
    if (Platform.OS === 'web' && requestedAtText) {
      const parsed = new Date(requestedAtText);
      if (Number.isNaN(parsed.getTime())) {
        setError('Requested date/time is invalid. Please use a valid date/time.');
        return;
      }
      requestedAtValue = parsed;
      setRequestedAt(parsed);
    }
    setLoading(true);
    try {
      await createRequest({
        departure_place: departure.trim(),
        destination: destination.trim(),
        purpose: purpose.trim() || undefined,
        persons: Math.max(1, validPassengers.length),
        passenger_names: validPassengers,
        requested_at: requestedAtValue ? formatDateTimeForApi(requestedAtValue) : undefined,
        use_coupon: canUseCoupon ? useCoupon : false,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CornerTriangles />
      <View style={[styles.headerWrap, { paddingTop: 12 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={UI.colors.green} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>New Request</Text>
            <Text style={styles.headerSubtitle}>Send a trip request for approval</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        enabled
        behavior="padding"
        keyboardVerticalOffset={0}
        style={styles.keyboard}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Departure Place</Text>
            <TextInput
              placeholder="Enter departure"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              selectionColor={UI.colors.green}
              value={departure}
              onChangeText={setDeparture}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Destination</Text>
            <TextInput
              placeholder="Enter destination"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              selectionColor={UI.colors.green}
              value={destination}
              onChangeText={setDestination}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Purpose</Text>
            <TextInput
              placeholder="Purpose (optional)"
              placeholderTextColor={UI.colors.placeholder}
              style={styles.input}
              selectionColor={UI.colors.green}
              value={purpose}
              onChangeText={setPurpose}
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Requested Date & Time</Text>
            {Platform.OS === 'web' ? (
              <View style={styles.webDateRow}>
                <TextInput
                  placeholder="Select date & time"
                  placeholderTextColor={UI.colors.placeholder}
                  style={styles.webDateInput}
                  selectionColor={UI.colors.green}
                  value={requestedAtText}
                  onChangeText={setRequestedAtText}
                  inputMode="none"
                  editable={false}
                />
                <input
                  type="datetime-local"
                  value={requestedAtText}
                  onChange={(event) => setRequestedAtText(event.target.value)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                    color: UI.colors.text,
                    fontFamily: UI.fonts.body,
                    fontSize: 14,
                  }}
                />
              </View>
            ) : (
              <View style={styles.dateRow}>
                <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={16} color={UI.colors.greenDark} />
                  <Text style={[styles.dateButtonText, !requestedAt && styles.dateButtonPlaceholder]}>
                    {requestedAt ? formatDate(requestedAt) : 'Select date'}
                  </Text>
                </Pressable>
                <Pressable style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
                  <Ionicons name="time-outline" size={16} color={UI.colors.greenDark} />
                  <Text style={[styles.dateButtonText, !requestedAt && styles.dateButtonPlaceholder]}>
                    {requestedAt ? formatTime(requestedAt) : 'Select time'}
                  </Text>
                </Pressable>
              </View>
            )}
            {Platform.OS !== 'web' && (
              <Text style={styles.helperText}>{requestedAtLabel}</Text>
            )}
          </View>

          <PassengersSection
            passengers={passengers}
            isSaved={false}
            canRemove={canRemovePassenger}
            onChangePassenger={handleChangePassenger}
            onRemovePassenger={handleRemovePassenger}
            onAddPassenger={handleAddPassenger}
          />

          {isKrPassenger && (
            <View style={[styles.sectionCard, styles.couponRow]}>
              <View>
                <Text style={styles.couponTitle}>Use Coupon</Text>
                <Text style={styles.couponSubtitle}>
                  {couponLeft === null ? 'Loading...' : `${couponLeft} left this month`}
                </Text>
              </View>
              <Switch
                value={useCoupon}
                onValueChange={setUseCoupon}
                disabled={!canUseCoupon}
                trackColor={{ false: UI.colors.border, true: UI.colors.greenSoft }}
                thumbColor={useCoupon ? UI.colors.green : UI.colors.borderStrong}
              />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DateTimePicker
          value={requestedAt ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            if (event.type === 'dismissed') {
              setShowDatePicker(false);
              return;
            }
            const base = requestedAt ?? new Date();
            const next = new Date(base);
            if (selected) {
              next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
              setRequestedAt(next);
            }
            if (Platform.OS !== 'ios') {
              setShowDatePicker(false);
            }
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={requestedAt ?? new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            if (event.type === 'dismissed') {
              setShowTimePicker(false);
              return;
            }
            const base = requestedAt ?? new Date();
            const next = new Date(base);
            if (selected) {
              next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
              setRequestedAt(next);
            }
            if (Platform.OS !== 'ios') {
              setShowTimePicker(false);
            }
          }}
        />
      )}
      <View style={[styles.submitWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable style={[styles.submitButton, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.submitButtonText}>{loading ? 'Submitting...' : 'Submit Request'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: UI.colors.background,
    overflow: 'hidden',
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: UI.colors.green,
    backgroundColor: UI.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.soft,
  },
  headerTitle: {
    fontSize: 22,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  headerSubtitle: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  sectionCard: {
    gap: 10,
    padding: 16,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.soft,
  },
  sectionLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
  webDateRow: {
    height: 48,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.inputBackground,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  webDateInput: {
    display: 'none',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.md,
    paddingHorizontal: 12,
    backgroundColor: UI.colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: {
    color: UI.colors.text,
    fontFamily: UI.fonts.body,
    fontSize: 13,
  },
  dateButtonPlaceholder: {
    color: UI.colors.placeholder,
  },
  helperText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
    marginTop: -4,
  },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  couponTitle: {
    fontSize: 13,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  couponSubtitle: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  submitWrap: {
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  submitButton: {
    height: 46,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.colors.greenDark,
    ...UI.shadow.medium,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: UI.colors.white,
    fontSize: 16,
    fontFamily: UI.fonts.bodyMedium,
    letterSpacing: 0.2,
  },
  errorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: UI.radius.md,
    backgroundColor: UI.colors.dangerSoft,
    borderColor: UI.colors.danger,
    borderWidth: 1,
  },
  errorText: {
    color: UI.colors.danger,
    fontFamily: UI.fonts.body,
    fontSize: 12,
  },
});
