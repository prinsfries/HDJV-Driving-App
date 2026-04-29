import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { UI } from '@/constants/ui';
import {
  fetchHomePage,
  fetchWeeklyStats,
  type RequestCard,
  type TripCard,
  type WeeklyStats,
} from '@/features/home/homeQueries';
import { firebaseService, usingMockFirebase } from '@/services/firebaseServiceSelector';

export default function HomeScreen() {
  const [role, setRole] = useState<string>('driver');
  const [trips, setTrips] = useState<TripCard[]>([]);
  const [requests, setRequests] = useState<RequestCard[]>([]);
  const [driverRequests, setDriverRequests] = useState<RequestCard[]>([]);
  const [couponLeft, setCouponLeft] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statsLoading, setStatsLoading] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({ trips: 0, distanceKm: 0, hours: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Test Firebase function
  const testFirebase = async () => {
    try {
      const result = await firebaseService.testFirebase();
      Alert.alert(
        'Firebase Test Results',
        `Initialized: ${result.initialized ? 'YES' : 'NO'}\nToken: ${result.token ? 'YES' : 'NO'}\nPermissions: ${result.permissions ? 'YES' : 'NO'}\n\n${result.message}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Firebase Test Error', error?.message || 'Unknown Firebase test error', [{ text: 'OK' }]);
    }
  };

  const isPassenger = role === 'passenger' || role === 'krpassenger';
  const isKrPassenger = role === 'krpassenger';

  const sortRequestsLatestFirst = useCallback((items: RequestCard[]) => {
    return [...items].sort((left, right) => right.sortTime - left.sortTime);
  }, []);

  const loadHome = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!append) {
        setIsLoading(true);
        setCurrentPage(1);
        setHasMore(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const payload = await fetchHomePage(page);
        if (!isMountedRef.current) return;

        setRole(payload.role);
        setUnreadCount(payload.unreadCount);
        setCouponLeft(payload.couponLeft);
        setHasMore(payload.hasMore);

        if (payload.isPassenger) {
          if (append) {
            setRequests((prev) => {
              const existingIds = new Set(prev.map((r) => r.id));
              const newItems = payload.requests.filter((item) => !existingIds.has(item.id));
              return sortRequestsLatestFirst([...prev, ...newItems]);
            });
          } else {
            setRequests(sortRequestsLatestFirst(payload.requests));
          }
          setTrips([]);
          setDriverRequests([]);
          setStatsLoading(false);
        } else {
          if (append) {
            setTrips((prev) => {
              const existingIds = new Set(prev.map((t) => t.id));
              const newItems = payload.trips.filter((item) => !existingIds.has(item.id));
              return [...prev, ...newItems];
            });
          } else {
            setTrips(payload.trips);
          }
          setRequests([]);
          setDriverRequests(payload.driverRequests);

          setStatsLoading(true);
          fetchWeeklyStats()
            .then((stats) => {
              if (!isMountedRef.current) return;
              setWeeklyStats(stats);
            })
            .finally(() => {
              if (isMountedRef.current) setStatsLoading(false);
            });
        }

        if (isMountedRef.current) setCurrentPage(page);
      } catch (error: any) {
        if (String(error?.message || '') === 'AUTH_INACTIVE') {
          router.replace('/login');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      // Clear all data when screen focuses (handles user change)
      setTrips([]);
      setRequests([]);
      setDriverRequests([]);
      setIsLoading(true);
      setCurrentPage(1);
      setHasMore(true);

      loadHome(1, false);

      return () => {};
    }, [loadHome])
  );

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    
    await loadHome(currentPage + 1, true);
  };

  const tripStatusStyles = useMemo(
    () => ({
      Completed: {
        pill: styles.statusPillCompleted,
        text: styles.statusTextCompleted,
      },
      Started: {
        pill: styles.statusPillStarted,
        text: styles.statusTextStarted,
      },
      'Not Started': {
        pill: styles.statusPillUpcoming,
        text: styles.statusTextUpcoming,
      },
    }),
    []
  );

  const requestStatusStyles = useMemo(
    () => ({
      pending: {
        pill: styles.requestStatusPending,
        text: styles.requestStatusTextPending,
      },
      accepted: {
        pill: styles.requestStatusAccepted,
        text: styles.requestStatusTextAccepted,
      },
      rejected: {
        pill: styles.requestStatusRejected,
        text: styles.requestStatusTextRejected,
      },
      assigned: {
        pill: styles.requestStatusAssigned,
        text: styles.requestStatusTextAssigned,
      },
      in_progress: {
        pill: styles.requestStatusInProgress,
        text: styles.requestStatusTextInProgress,
      },
      completed: {
        pill: styles.requestStatusCompleted,
        text: styles.requestStatusTextCompleted,
      },
    }),
    []
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CornerTriangles />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 12 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              if (isLoading) return;
              setIsRefreshing(true);
              try {
                await loadHome(1, false);
              } finally {
                setIsRefreshing(false);
              }
            }}
            tintColor={UI.colors.green}
          />
        }
      >
        <View style={styles.header}>
          <ScreenHeader
            title={isPassenger ? 'Your Requests' : 'Your Tracks'}
            right={
              <View style={styles.headerActions}>
                <Pressable style={styles.notificationButton} onPress={() => router.push('/notifications')}>
                  <Ionicons name="notifications-outline" size={20} color={UI.colors.blueDark} />
                  {unreadCount > 0 && <View style={styles.notificationDot} />}
                </Pressable>
                {!usingMockFirebase && (
                  <Pressable style={styles.testButton} onPress={testFirebase}>
                    <Ionicons name="flame-outline" size={20} color={UI.colors.green} />
                  </Pressable>
                )}
                <View style={styles.countPill}>
                  <Ionicons
                    name={isPassenger ? 'paper-plane-outline' : 'time-outline'}
                    size={14}
                    color={UI.colors.blue}
                  />
                  <Text style={styles.countText}>
                    {isPassenger ? `${requests.length} requests` : `${trips.length} trips`}
                  </Text>
                </View>
              </View>
            }
          />
        </View>

        {isPassenger && isKrPassenger && (
          <Card style={styles.couponCard}>
            <View>
              <Text style={styles.couponTitle}>Coupon Balance</Text>
              <Text style={styles.couponSubtitle}>Resets monthly</Text>
            </View>
            <View style={styles.couponPill}>
              <Ionicons name="ticket-outline" size={16} color={UI.colors.green} />
              <Text style={styles.couponPillText}>{couponLeft ?? 0} left</Text>
            </View>
          </Card>
        )}

        {isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{isPassenger ? 'Loading requests...' : 'Loading trips...'}</Text>
            <Text style={styles.emptySubtitle}>Fetching your latest records.</Text>
          </View>
        )}

        {!isLoading && isPassenger && requests.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to create your first request.</Text>
          </View>
        )}

        {!isLoading && !isPassenger && trips.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to create your first trip.</Text>
          </View>
        )}

        {!isLoading &&
          !isPassenger && (
            <Card style={styles.analyticsCard}>
              <Text style={styles.sectionLabel}>This Week</Text>
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsValue}>
                    {statsLoading ? '-' : weeklyStats.trips}
                  </Text>
                  <Text style={styles.analyticsLabel}>Trips</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsValue}>
                    {statsLoading ? '-' : weeklyStats.distanceKm.toFixed(1)}
                  </Text>
                  <Text style={styles.analyticsLabel}>KM</Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsValue}>
                    {statsLoading ? '-' : weeklyStats.hours.toFixed(1)}
                  </Text>
                  <Text style={styles.analyticsLabel}>Hours</Text>
                </View>
              </View>
            </Card>
          )}

        {!isLoading &&
          isPassenger &&
          requests.map((item) => {
            const statusStyle = requestStatusStyles[item.status];
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.cardPressable, pressed ? styles.cardPressed : null]}
                onPress={() =>
                  router.push({ pathname: '/request-details', params: { requestId: String(item.id) } })
                }>
                <Card style={styles.card}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTitle}>{item.title}</Text>
                    <View style={[styles.requestStatusPill, statusStyle.pill]}>
                      <Text style={[styles.requestStatusText, statusStyle.text]}>{item.statusLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={18} color={UI.colors.textMuted} />
                    <Text style={styles.infoText}>{item.persons}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={UI.colors.textMuted} />
                    <Text style={styles.infoText}>{item.dateTime}</Text>
                  </View>
                  {!!item.purpose && (
                    <View style={styles.infoRow}>
                      <Ionicons name="chatbubble-ellipses-outline" size={18} color={UI.colors.textMuted} />
                      <Text style={styles.infoText}>{item.purpose}</Text>
                    </View>
                  )}
                  {item.couponUsed && (
                    <View style={styles.infoRow}>
                      <Ionicons name="ticket-outline" size={18} color={UI.colors.textMuted} />
                      <Text style={styles.infoText}>Coupon used</Text>
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })}

        {!isLoading &&
          !isPassenger &&
          driverRequests.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Assigned Requests</Text>
              {driverRequests.map((item) => {
                const statusStyle = requestStatusStyles[item.status];
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.cardPressable, pressed ? styles.cardPressed : null]}
                    onPress={() =>
                      router.push({ pathname: '/trip-details', params: { requestId: String(item.id) } })
                    }>
                    <Card style={styles.card}>
                      <View style={styles.requestHeader}>
                        <Text style={styles.requestTitle}>{item.title}</Text>
                        <View style={[styles.requestStatusPill, statusStyle.pill]}>
                          <Text style={[styles.requestStatusText, statusStyle.text]}>{item.statusLabel}</Text>
                        </View>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="people-outline" size={18} color={UI.colors.textMuted} />
                        <Text style={styles.infoText}>{item.persons}</Text>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={18} color={UI.colors.textMuted} />
                        <Text style={styles.infoText}>{item.dateTime}</Text>
                      </View>
                      {!!item.purpose && (
                        <View style={styles.infoRow}>
                          <Ionicons name="chatbubble-ellipses-outline" size={18} color={UI.colors.textMuted} />
                          <Text style={styles.infoText}>{item.purpose}</Text>
                        </View>
                      )}
                      {item.couponUsed && (
                        <View style={styles.infoRow}>
                          <Ionicons name="ticket-outline" size={18} color={UI.colors.textMuted} />
                          <Text style={styles.infoText}>Coupon used</Text>
                        </View>
                      )}
                    </Card>
                  </Pressable>
                );
              })}
            </>
          )}

        {!isLoading &&
          !isPassenger &&
          trips.map((item) => {
            const statusStyle = tripStatusStyles[item.status];
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [styles.cardPressable, pressed ? styles.cardPressed : null]}
                onPress={() =>
                  router.push({ pathname: '/trip-details', params: { tripId: item.id, saved: '1' } })
                }>
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.dateText}>{item.date}</Text>
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={15} color={UI.colors.textMuted} />
                        <Text style={styles.timeText}>{item.time}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusPill, statusStyle.pill]}>
                      <Text style={[styles.statusText, statusStyle.text]}>{item.status}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={UI.colors.text} />
                    <Text style={styles.infoText}>{item.route}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={16} color={UI.colors.text} />
                    <Text style={styles.infoText}>{item.passengers}</Text>
                  </View>
                </Card>
              </Pressable>
            );
          })}

        {!isLoading && hasMore && (
          <Pressable 
            style={styles.loadMoreButton} 
            onPress={handleLoadMore}
            disabled={isLoadingMore}
          >
            <Ionicons 
              name={isLoadingMore ? 'hourglass-outline' : 'chevron-down-outline'} 
              size={16} 
              color={UI.colors.green} 
            />
            <Text style={styles.loadMoreText}>
              {isLoadingMore ? 'Loading...' : 'Load more'}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => router.push(isPassenger ? '/request-new' : '/trip-details')}>
        <Ionicons name="add" size={26} color={UI.colors.white} />
      </Pressable>
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
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.border,
    backgroundColor: UI.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.soft,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: UI.colors.danger,
  },
  testButton: {
    width: 48,
    height: 48,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.green,
    backgroundColor: UI.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...UI.shadow.soft,
  },
  kicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
  },
  heading: {
    fontSize: 22,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: UI.colors.blueSoft,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: {
    fontSize: 12,
    color: UI.colors.blueDark,
    fontFamily: UI.fonts.bodyMedium,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
  },
  analyticsCard: {
    padding: 16,
    borderRadius: UI.radius.lg,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    gap: 12,
    ...UI.shadow.soft,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  analyticsValue: {
    fontSize: 20,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  analyticsLabel: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  couponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.lg,
    ...UI.shadow.soft,
  },
  couponTitle: {
    fontSize: 14,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  couponSubtitle: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  couponPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: UI.radius.pill,
    backgroundColor: UI.colors.greenSoft,
  },
  couponPillText: {
    fontSize: 13,
    color: UI.colors.greenDark,
    fontFamily: UI.fonts.bodyMedium,
  },
  card: {
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.lg,
    padding: 16,
    gap: 12,
    ...UI.shadow.soft,
  },
  cardPressable: {
    borderRadius: UI.radius.lg,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  requestTitle: {
    flex: 1,
    fontSize: 20,
    color: UI.colors.text,
    fontFamily: UI.fonts.heading,
  },
  requestStatusPill: {
    borderRadius: UI.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requestStatusText: {
    fontSize: 14,
    textTransform: 'lowercase',
    fontFamily: UI.fonts.bodyMedium,
  },
  requestStatusPending: {
    backgroundColor: UI.colors.border,
  },
  requestStatusTextPending: {
    color: UI.colors.textMuted,
  },
  requestStatusAccepted: {
    backgroundColor: UI.colors.blueSoft,
  },
  requestStatusTextAccepted: {
    color: UI.colors.blueDark,
  },
  requestStatusRejected: {
    backgroundColor: UI.colors.dangerSoft,
  },
  requestStatusTextRejected: {
    color: UI.colors.danger,
  },
  requestStatusAssigned: {
    backgroundColor: UI.colors.blueSoft,
  },
  requestStatusTextAssigned: {
    color: UI.colors.blueDark,
  },
  requestStatusInProgress: {
    backgroundColor: UI.colors.greenSoft,
  },
  requestStatusTextInProgress: {
    color: UI.colors.greenDark,
  },
  requestStatusCompleted: {
    backgroundColor: UI.colors.greenSoft,
  },
  requestStatusTextCompleted: {
    color: UI.colors.greenDark,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 15,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  timeText: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  statusPill: {
    borderRadius: UI.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillStarted: {
    backgroundColor: UI.colors.greenSoft,
  },
  statusPillCompleted: {
    backgroundColor: UI.colors.border,
  },
  statusPillUpcoming: {
    backgroundColor: UI.colors.blueSoft,
  },
  statusText: {
    fontSize: 11,
    fontFamily: UI.fonts.bodyMedium,
    letterSpacing: 0.3,
  },
  statusTextStarted: {
    color: UI.colors.greenDark,
  },
  statusTextCompleted: {
    color: UI.colors.textMuted,
  },
  statusTextUpcoming: {
    color: UI.colors.blueDark,
  },
  divider: {
    height: 1,
    backgroundColor: UI.colors.border,
    opacity: 0.6,
  },
  infoText: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  emptyState: {
    padding: 20,
    backgroundColor: UI.colors.surface,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.border,
    gap: 6,
    ...UI.shadow.soft,
  },
  emptyTitle: {
    fontSize: 15,
    color: UI.colors.text,
    fontFamily: UI.fonts.bodyMedium,
  },
  emptySubtitle: {
    fontSize: 13,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: UI.colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: UI.colors.greenDark,
    ...UI.shadow.medium,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.border,
    borderRadius: UI.radius.lg,
    ...UI.shadow.soft,
  },
  loadMoreText: {
    fontSize: 14,
    color: UI.colors.green,
    fontFamily: UI.fonts.bodyMedium,
  },
});
