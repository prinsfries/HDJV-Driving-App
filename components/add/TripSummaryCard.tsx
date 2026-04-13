import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UI } from '@/constants/ui';

interface TripSummaryCardProps {
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  locationPending: boolean;
  locationError: string | null;
  onRetryLocation?: () => void;
  statusLabel: string;
  hasStarted: boolean;
  hasLocation: boolean;
  isStarted: boolean;
  isCompleted: boolean;
}

export function TripSummaryCard({
  dateLabel,
  timeLabel,
  locationLabel,
  locationPending,
  locationError,
  onRetryLocation,
  statusLabel,
  hasStarted,
  hasLocation,
  isStarted,
  isCompleted,
}: TripSummaryCardProps) {
  const showRetry = Boolean(locationError) && onRetryLocation;
  const locationText = locationPending
    ? 'Location pending...'
    : locationError
      ? locationError
      : locationLabel;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderInfo}>
          <View style={styles.cardLabel}>
            <Ionicons name="calendar-outline" size={16} color={UI.colors.text} />
            <Text style={[styles.cardText, !hasStarted ? styles.cardTextPlaceholder : null]}>
              {dateLabel}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusPill,
            isCompleted
              ? styles.statusPillCompleted
              : isStarted
                ? styles.statusPillStarted
                : styles.statusPillIdle,
          ]}>
          <Text
            style={[
              styles.statusText,
              isCompleted
                ? styles.statusTextCompleted
                : isStarted
                  ? styles.statusTextStarted
                  : styles.statusTextIdle,
            ]}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color={UI.colors.text} />
        <Text style={[styles.infoText, !hasStarted ? styles.infoTextPlaceholder : null]}>
          {timeLabel}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={16} color={UI.colors.text} />
        <Text
          style={[
            styles.infoText,
            !hasLocation || locationPending || locationError ? styles.infoTextPlaceholder : null,
          ]}>
          {locationText}
        </Text>
        {showRetry && (
          <Pressable style={styles.retryButton} onPress={onRetryLocation}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.lg,
    padding: 16,
    gap: 12,
    ...UI.shadow.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderInfo: {
    gap: 6,
  },
  cardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardText: {
    fontSize: 12,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  cardTextPlaceholder: {
    color: UI.colors.placeholder,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: UI.radius.pill,
  },
  statusPillIdle: {
    backgroundColor: UI.colors.blueSoft,
  },
  statusPillStarted: {
    backgroundColor: UI.colors.greenSoft,
  },
  statusPillCompleted: {
    backgroundColor: UI.colors.surfaceAlt,
  },
  statusText: {
    fontSize: 11,
    fontFamily: UI.fonts.bodyMedium,
    letterSpacing: 0.3,
  },
  statusTextIdle: {
    color: UI.colors.blueDark,
  },
  statusTextStarted: {
    color: UI.colors.greenDark,
  },
  statusTextCompleted: {
    color: UI.colors.textMuted,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  infoTextPlaceholder: {
    color: UI.colors.placeholder,
  },
  retryButton: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: UI.radius.pill,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surfaceAlt,
  },
  retryText: {
    fontSize: 11,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
  },
});
