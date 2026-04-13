import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { UI } from '@/constants/ui';
import { listRequests } from '@/utils/requestApi';
import { formatDate, formatTime } from '@/utils/date';
import { getUser } from '@/utils/auth';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type CalendarItem = {
  id: number;
  dateKey: string;
  timestamp: number;
  timeLabel: string;
  title: string;
  status: string;
};

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function CalendarScreen() {
  const router = useRouter();
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>('driver');
  const [prefs, setPrefs] = useState<{ date_format: 'long' | 'short'; time_format: '12h' | '24h' }>({
    date_format: 'long',
    time_format: '12h',
  });

  useEffect(() => {
    let active = true;
    getUser()
      .then((u) => {
        if (!active) return;
        const p = u?.preferences || {};
        setRole(u?.role ?? 'driver');
        setPrefs({ date_format: p.date_format ?? 'long', time_format: p.time_format ?? '12h' });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const limit = 200;
      const firstPage = await listRequests(1, limit);
      const all = Array.isArray(firstPage) ? firstPage : [];
      const resolveHistoryTimestamp = (req: any, status: string) => {
        const histories = Array.isArray(req?.status_histories) ? req.status_histories : [];
        const match = histories.find((item: any) => item?.status === status);
        return match?.created_at || null;
      };

      const resolveEventDate = (req: any) => {
        if (req?.status === 'completed') {
          return (
            req.completed_at ||
            req.trip?.completed_at ||
            resolveHistoryTimestamp(req, 'completed') ||
            req.requested_at ||
            req.created_at
          );
        }

        // For upcoming/scheduled work, anchor to the requested schedule date first.
        return (
          req.requested_at ||
          req.assigned_at ||
          req.accepted_at ||
          req.started_at ||
          resolveHistoryTimestamp(req, req?.status || 'pending') ||
          req.created_at
        );
      };

      setItems(
        all
          .map((req) => {
            const rawDate = resolveEventDate(req);
            if (!rawDate) return null;
            const dt = new Date(rawDate);
            if (Number.isNaN(dt.getTime())) return null;
            const timeLabel = formatTime(dt, { timeFormat: prefs.time_format });
            const title = `${req.departure_place ?? '--'} -> ${req.destination ?? '--'}`;
            return {
              id: req.id,
              dateKey: toDateKey(dt),
              timestamp: dt.getTime(),
              timeLabel,
              title,
              status: req.status ?? 'pending',
            } as CalendarItem;
          })
          .filter(Boolean) as CalendarItem[]
      );
    } catch (e: any) {
      setError(e?.message || 'Unable to load schedule.');
    } finally {
      setLoading(false);
    }
  }, [prefs.time_format]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    items.forEach((item) => {
      if (!map[item.dateKey]) map[item.dateKey] = [];
      map[item.dateKey].push(item);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.timestamp - b.timestamp));
    return map;
  }, [items]);


  const daysGrid = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ date: null, key: `pad-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, key: toDateKey(date) });
    }
    return cells;
  }, [monthDate]);

  const selectedKey = toDateKey(selectedDate);
  const selectedItems = itemsByDate[selectedKey] || [];
  const statusStyles = useMemo(
    () => ({
      pending: {
        pill: styles.statusPending,
        text: styles.statusTextPending,
      },
      accepted: {
        pill: styles.statusAccepted,
        text: styles.statusTextAccepted,
      },
      rejected: {
        pill: styles.statusRejected,
        text: styles.statusTextRejected,
      },
      assigned: {
        pill: styles.statusAssigned,
        text: styles.statusTextAssigned,
      },
      in_progress: {
        pill: styles.statusInProgress,
        text: styles.statusTextInProgress,
      },
      completed: {
        pill: styles.statusCompleted,
        text: styles.statusTextCompleted,
      },
    }),
    []
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CornerTriangles />
      <View style={[styles.headerWrap, { paddingTop: 12 }]}>
        <ScreenHeader title="Calendar" />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <Pressable
              style={styles.navButton}
              onPress={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
            >
              <Ionicons name="chevron-back" size={18} color={UI.colors.green} />
            </Pressable>
            <Text style={styles.monthTitle}>{getMonthLabel(monthDate)}</Text>
            <Pressable
              style={styles.navButton}
              onPress={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color={UI.colors.green} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={styles.weekLabel}>{day}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {daysGrid.map((cell) => {
              if (!cell.date) {
                return <View key={cell.key} style={styles.dayCell} />;
              }
              const dayKey = toDateKey(cell.date);
              const isSelected = dayKey === selectedKey;
              const dayItems = itemsByDate[dayKey] || [];
              const hasItems = dayItems.length > 0;
              const hasRejected = dayItems.some((item) => item.status === 'rejected');
              const dotStyle = hasRejected ? styles.dotRejected : styles.dot;
              return (
                <Pressable
                  key={cell.key}
                  style={[styles.dayCell, isSelected ? styles.dayCellSelected : null]}
                  onPress={() => setSelectedDate(cell.date as Date)}
                >
                  <Text style={[styles.dayText, isSelected ? styles.dayTextSelected : null]}>
                    {cell.date.getDate()}
                  </Text>
                  {hasItems && <View style={dotStyle} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.listCard}>
          <Text style={styles.sectionTitle}>
            {formatDate(selectedDate, { dateFormat: prefs.date_format })}
          </Text>
          {loading && <Text style={styles.listEmpty}>Loading schedule...</Text>}
          {!loading && selectedItems.length === 0 && (
            <Text style={styles.listEmpty}>No trips for this day.</Text>
          )}
          {!loading && selectedItems.map((item) => {
            const statusLabel = String(item.status || 'pending').replace('_', ' ');
            const statusStyle = statusStyles[item.status as keyof typeof statusStyles] ?? {
              pill: styles.statusPending,
              text: styles.statusTextPending,
            };
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.listItem, pressed ? styles.listItemPressed : null]}
                onPress={() => {
                  const isPassenger = role === 'passenger' || role === 'krpassenger';
                  router.push({
                    pathname: isPassenger ? '/request-details' : '/trip-details',
                    params: { requestId: String(item.id) },
                  });
                }}
              >
                <View style={styles.listTime}>
                  <Ionicons name="time-outline" size={14} color={UI.colors.textMuted} />
                  <Text style={styles.listTimeText}>{item.timeLabel}</Text>
                </View>
                <View style={styles.listBody}>
                  <Text style={styles.listTitleText}>{item.title}</Text>
                </View>
                <View style={[styles.badgeBase, statusStyle.pill]}>
                  <Text style={[styles.badgeText, statusStyle.text]}>{statusLabel}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
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
  calendarCard: {
    padding: 16,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surface,
    gap: 12,
    ...UI.shadow.soft,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitle: {
    fontSize: 16,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: UI.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.surface,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekLabel: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 11,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(39, 174, 96, 0.12)',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 13,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  dayTextSelected: {
    color: UI.colors.green,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: UI.colors.green,
  },
  dotRejected: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: UI.colors.danger,
  },
  listCard: {
    padding: 16,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surface,
    gap: 12,
    ...UI.shadow.soft,
  },
  sectionTitle: {
    fontSize: 14,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  listEmpty: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  listItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI.colors.border,
  },
  listItemPressed: {
    opacity: 0.7,
  },
  listTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listTimeText: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  listBody: {
    flex: 1,
    gap: 2,
  },
  listTitleText: {
    fontSize: 13,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  listMeta: {
    fontSize: 11,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  badgeBase: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: UI.fonts.bodyMedium,
  },
  statusPending: {
    backgroundColor: UI.colors.border,
  },
  statusTextPending: {
    color: UI.colors.textMuted,
  },
  statusAccepted: {
    backgroundColor: UI.colors.blueSoft,
  },
  statusTextAccepted: {
    color: UI.colors.blueDark,
  },
  statusRejected: {
    backgroundColor: UI.colors.dangerSoft,
  },
  statusTextRejected: {
    color: UI.colors.danger,
  },
  statusAssigned: {
    backgroundColor: UI.colors.blueSoft,
  },
  statusTextAssigned: {
    color: UI.colors.blueDark,
  },
  statusInProgress: {
    backgroundColor: UI.colors.greenSoft,
  },
  statusTextInProgress: {
    color: UI.colors.greenDark,
  },
  statusCompleted: {
    backgroundColor: UI.colors.greenSoft,
  },
  statusTextCompleted: {
    color: UI.colors.greenDark,
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
