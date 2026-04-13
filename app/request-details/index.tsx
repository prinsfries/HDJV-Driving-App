import React, { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { UI } from '@/constants/ui';
import { getRequest } from '@/utils/requestApi';
import { formatDate, formatTime, formatDateRange } from '@/utils/date';
import { getUser } from '@/utils/auth';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function RequestDetailsScreen() {
  const { requestId: requestIdParamRaw } = useLocalSearchParams();
  const requestIdParam = Array.isArray(requestIdParamRaw)
    ? requestIdParamRaw[0]
    : requestIdParamRaw;
  const [requestId, setRequestId] = useState<number | null>(
    requestIdParam ? Number(requestIdParam) : null
  );
  const [requestedAt, setRequestedAt] = useState<Date | null>(null);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [startLocation, setStartLocation] = useState<string | null>(null);
  const [stopLocation, setStopLocation] = useState<string | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<string | null>(null);
  const [assignedContact, setAssignedContact] = useState<string | null>(null);
  const [statusTimeline, setStatusTimeline] = useState<Array<{ status: string; createdAt?: Date | null }>>([]);
  const [stepperWidth, setStepperWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<{ date_format: 'long' | 'short'; time_format: '12h' | '24h' }>({
    date_format: 'long',
    time_format: '12h',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getUser()
      .then((u) => {
        if (!active) return;
        const p = u?.preferences || {};
        setPrefs({ date_format: p.date_format ?? 'long', time_format: p.time_format ?? '12h' });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setRequestId(requestIdParam ? Number(requestIdParam) : null);
  }, [requestIdParam]);

  useEffect(() => {
    let active = true;
    const loadRequest = async () => {
      if (!requestId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const req = await getRequest(requestId);
        if (!active) return;
        const statusMap = {
          pending: 'Request Pending',
          accepted: 'Request Accepted',
          rejected: 'Request Rejected',
          assigned: 'Request Assigned',
          in_progress: 'In Progress',
          completed: 'Completed',
        };
        const statusLabel = (status: string) => statusMap[status as keyof typeof statusMap] || status;
        setRequestStatus(statusLabel(req.status));
        setRequestedAt(req.requested_at ? new Date(req.requested_at) : null);
        setStartLocation(req.departure_place ?? null);
        setStopLocation(req.destination ?? null);
        const driver = req.assigned_driver;
        if (driver) {
          setAssignedDriver(driver.full_name || driver.name || driver.username || null);
          setAssignedContact(driver.contact || null);
        } else {
          setAssignedDriver(null);
          setAssignedContact(null);
        }
        const histories = Array.isArray(req.status_histories) ? req.status_histories : [];
        const mapped = histories.map((item) => ({
          status: String(item.status ?? ''),
          createdAt: item.created_at ? new Date(item.created_at) : null,
        }));
        if (mapped.length > 0) {
          setStatusTimeline(mapped);
        } else {
          setStatusTimeline([
            {
              status: String(req.status ?? 'pending'),
              createdAt: req.requested_at ? new Date(req.requested_at) : null,
            },
          ]);
        }
      } catch (e: any) {
        if (active) {
          setError(e?.message || 'Unable to load request details.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    loadRequest();
    return () => {
      active = false;
    };
  }, [requestId]);

  const dateLabel = requestedAt
    ? formatDate(requestedAt, { dateFormat: prefs.date_format })
    : 'Pending';
  const timeLabel = requestedAt
    ? formatTime(requestedAt, { timeFormat: prefs.time_format })
    : 'Pending';
  const dateRangeLabel = requestedAt
    ? formatDateRange(requestedAt, requestedAt, { dateFormat: prefs.date_format })
    : 'Pending';

  const formatTimelineStatus = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      accepted: 'Approved',
      rejected: 'Declined',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  const getLatestStatus = () => {
    if (statusTimeline.length > 0) {
      return statusTimeline[statusTimeline.length - 1]?.status ?? 'pending';
    }
    return String(requestStatus ?? 'pending');
  };

  const buildSteps = () => {
    const latest = getLatestStatus();
    const isRejected = latest === 'rejected';
    const normalized = latest === 'in_progress' ? 'assigned' : latest;
    const order = ['pending', isRejected ? 'rejected' : 'accepted', 'assigned', 'completed'];
    const currentIndex = order.indexOf(normalized);
    return order.map((key, index) => ({
      key,
      label: formatTimelineStatus(key),
      done: currentIndex >= index && currentIndex !== -1,
    }));
  };
  const steps = buildSteps();
  const currentIndex = useMemo(() => {
    const latest = getLatestStatus();
    const isRejected = latest === 'rejected';
    const normalized = latest === 'in_progress' ? 'assigned' : latest;
    const order = ['pending', isRejected ? 'rejected' : 'accepted', 'assigned', 'completed'];
    return order.indexOf(normalized);
  }, [statusTimeline, requestStatus]);
  const rowPadding = 6;
  const dotSize = 12;
  const lineHeight = 2;
  const lineTop = (dotSize - lineHeight) / 2;
  const stepCount = Math.max(steps.length, 1);
  const stepItemWidth = stepperWidth > 0 ? Math.max((stepperWidth - rowPadding * 2) / stepCount, 0) : 0;
  const lineInset = rowPadding + stepItemWidth / 2;
  const lineWidth = Math.max(stepperWidth - lineInset * 2, 0);
  const progressRatio = steps.length > 1 ? currentIndex / (steps.length - 1) : 0;
  const clampedProgress = Math.max(0, Math.min(1, progressRatio));
  const statusTimestamps = useMemo(() => {
    const map: Record<string, Date | null> = {};
    statusTimeline.forEach((item) => {
      const key = String(item.status ?? '');
      if (!map[key]) {
        map[key] = item.createdAt ?? null;
      }
    });
    return map;
  }, [statusTimeline]);
  const latestStatus = getLatestStatus();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CornerTriangles />
      <View style={[styles.headerWrap, { paddingTop: 12 }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={UI.colors.green} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Request Details</Text>
            <Text style={styles.headerSubtitle}>Track your request status</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Loading...</Text>
            <Text style={styles.infoText}>Fetching request information.</Text>
          </View>
        )}

        {!isLoading && (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Status Timeline</Text>
              <View style={styles.stepper} onLayout={(e) => setStepperWidth(e.nativeEvent.layout.width)}>
                <View style={[styles.stepperLine, { left: lineInset, width: lineWidth, top: lineTop }]} />
                {steps.length > 1 && currentIndex > 0 && (
                  <View
                    style={[
                      styles.stepperLineProgress,
                      latestStatus === 'rejected'
                        ? styles.stepperLineProgressDeclined
                        : styles.stepperLineProgressApproved,
                      { left: lineInset, width: lineWidth * clampedProgress, top: lineTop },
                    ]}
                  />
                )}
                <View style={styles.stepperRow}>
                  {steps.map((step) => {
                    const isDeclined = step.key === 'rejected';
                    const isApproved = step.key === 'accepted';
                    const isDone = step.done;
                    const isCurrentDeclined = latestStatus === 'rejected' && isDeclined;
                    const isCurrentApproved = latestStatus !== 'rejected' && isApproved && isDone;
                    const dotStyle = isCurrentDeclined
                      ? styles.stepCircleDeclined
                      : isCurrentApproved || isDone
                        ? styles.stepCircleDone
                        : styles.stepCirclePending;
                    const labelStyle = isCurrentDeclined
                      ? styles.stepLabelDeclined
                      : isCurrentApproved || isDone
                        ? styles.stepLabelDone
                        : styles.stepLabelPending;
                    const hasTime = Boolean(statusTimestamps[step.key]);
                    const dateText = hasTime
                      ? formatDate(statusTimestamps[step.key]!, { dateFormat: prefs.date_format })
                      : '--';
                    const timeText = hasTime
                      ? formatTime(statusTimestamps[step.key]!, { timeFormat: prefs.time_format })
                      : '--';
                    return (
                      <View key={step.key} style={styles.stepItem}>
                        <View style={[styles.stepCircle, dotStyle]} />
                        <Text style={[styles.stepLabel, labelStyle]}>{step.label}</Text>
                        <Text style={styles.stepDate}>{dateText}</Text>
                        <Text style={styles.stepTime}>{timeText}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Route</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Meet-up</Text>
                <Text style={styles.infoValue}>{startLocation || 'Pending'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Destination</Text>
                <Text style={styles.infoValue}>{stopLocation || 'Pending'}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Requested Schedule</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{dateLabel}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{timeLabel}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Range</Text>
                <Text style={styles.infoValue}>{dateRangeLabel}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Assigned Driver</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Driver</Text>
                <Text style={styles.infoValue}>{assignedDriver || 'Not assigned yet'}</Text>
              </View>
              {!!assignedContact && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Contact</Text>
                  <Text style={styles.infoValue}>{assignedContact}</Text>
                </View>
              )}
            </View>

          </>
        )}
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
  infoCard: {
    padding: 16,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surface,
    gap: 10,
    ...UI.shadow.soft,
  },
  infoTitle: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusText: {
    fontSize: 16,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  infoValue: {
    fontSize: 12,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
    flex: 1,
    textAlign: 'right',
  },
  infoText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  stepper: {
    marginTop: 10,
    gap: 10,
    position: 'relative',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepperLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: UI.colors.border,
  },
  stepperLineProgress: {
    position: 'absolute',
    height: 2,
  },
  stepperLineProgressApproved: {
    backgroundColor: UI.colors.green,
  },
  stepperLineProgressDeclined: {
    backgroundColor: UI.colors.danger,
  },
  stepCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  stepCircleDone: {
    backgroundColor: UI.colors.green,
    borderColor: UI.colors.green,
  },
  stepCircleDeclined: {
    backgroundColor: UI.colors.danger,
    borderColor: UI.colors.danger,
  },
  stepCirclePending: {
    backgroundColor: UI.colors.surface,
    borderColor: UI.colors.border,
  },
  stepLabel: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: UI.fonts.bodyMedium,
  },
  stepLabelDone: {
    color: UI.colors.text,
  },
  stepLabelDeclined: {
    color: UI.colors.danger,
  },
  stepLabelPending: {
    color: UI.colors.textMuted,
  },
  stepTime: {
    marginTop: 2,
    fontSize: 10,
    textAlign: 'center',
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
    lineHeight: 14,
  },
  stepDate: {
    marginTop: 2,
    fontSize: 10,
    textAlign: 'center',
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
    lineHeight: 14,
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
