import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CornerTriangles } from '@/components/layout/corner-triangles';
import { UI } from '@/constants/ui';
import { listNotifications, markNotificationRead, markAllNotificationsRead, type NotificationItem } from '@/utils/notificationApi';
import { formatDate, formatTime } from '@/utils/date';
import { getUser } from '@/utils/auth';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
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
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      
      // Clear notifications when screen focuses (handles user change)
      setNotifications([]);
      setIsLoading(true);
      setCurrentPage(1);
      setHasMore(true);
      
      const load = async (page: number = 1, append: boolean = false) => {
        if (!append) {
          setIsLoading(true);
          setCurrentPage(1);
          setHasMore(true);
        } else {
          setIsLoadingMore(true);
        }
        try {
          const items = await listNotifications(page, 20);
          const sorted = [...(Array.isArray(items) ? items : [])].sort((left, right) => {
            const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
            const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
            return rightTime - leftTime;
          });
          
          if (active) {
            if (append) {
              // Filter out duplicates when appending
              setNotifications((prev) => {
                const existingIds = new Set(prev.map(n => n.id));
                const newItems = sorted.filter(item => !existingIds.has(item.id));
                return [...prev, ...newItems];
              });
            } else {
              setNotifications(sorted);
            }
            setHasMore(sorted.length === 20);
            setCurrentPage(page);
          }
        } catch {
          if (active) {
            if (!append) {
              setNotifications([]);
          }
            setHasMore(false);
          }
        } finally {
          if (active) {
            setIsLoading(false);
            setIsLoadingMore(false);
          }
        }
      };

      load(1, false);

      return () => {
        active = false;
      };
    }, []) // Empty dependency array ensures it runs every time screen focuses
  );

  const unreadCount = useMemo(
    () => notifications.filter((notif) => !notif.read_at).length,
    [notifications]
  );

  const handleOpen = async (item: NotificationItem) => {
    if (!item.read_at) {
      try {
        const updated = await markNotificationRead(item.id);
        setNotifications((prev) => prev.map((n) => (n.id === item.id ? updated : n)));
      } catch {}
    }
    const requestId = item.data?.request_id;
    if (requestId) {
      const isPassenger = role === 'passenger' || role === 'krpassenger';
      router.push({
        pathname: isPassenger ? '/request-details' : '/trip-details',
        params: { requestId: String(requestId) },
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      console.log('Marking all notifications as read...');
      await markAllNotificationsRead();
      console.log('Successfully marked all as read, updating UI...');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const items = await listNotifications(nextPage, 20);
      const sorted = [...(Array.isArray(items) ? items : [])].sort((left, right) => {
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightTime - leftTime;
      });
      
      // Filter out duplicates by ID
      setNotifications((prev) => {
        const existingIds = new Set(prev.map(n => n.id));
        const newItems = sorted.filter(item => !existingIds.has(item.id));
        return [...prev, ...newItems];
      });
      
      setHasMore(sorted.length === 20);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Failed to load more notifications:', error);
    } finally {
      setIsLoadingMore(false);
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
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {isLoading ? 'Loading updates' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
          {!isLoading && unreadCount > 0 && (
            <Pressable 
              style={styles.markAllButton} 
              onPress={() => {
                console.log('Mark all button pressed, unreadCount:', unreadCount);
                handleMarkAllRead();
              }}
            >
              <Ionicons name="checkmark-done" size={16} color={UI.colors.green} />
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading notifications...</Text>
            <Text style={styles.emptySubtitle}>Fetching the latest updates.</Text>
          </View>
        )}

        {!isLoading && notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>Updates will show here as they arrive.</Text>
          </View>
        )}

        {!isLoading &&
          notifications.map((item) => {
            const createdAt = item.created_at ? new Date(item.created_at) : null;
            const timeLabel = createdAt
              ? `${formatDate(createdAt, { dateFormat: prefs.date_format })} - ${formatTime(createdAt, { timeFormat: prefs.time_format })}`
              : null;
            const isUnread = !item.read_at;

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.notificationItem,
                  isUnread ? styles.notificationItemUnread : styles.notificationItemRead,
                  pressed ? styles.notificationItemPressed : null,
                ]}
                onPress={() => handleOpen(item)}
              >
                <View style={[styles.iconWrap, isUnread ? styles.iconWrapUnread : styles.iconWrapRead]}>
                  <Ionicons
                    name={isUnread ? 'notifications' : 'notifications-outline'}
                    size={18}
                    color={isUnread ? UI.colors.blue : UI.colors.textMuted}
                  />
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemTitle, isUnread ? styles.itemTitleUnread : null]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                  {!!item.body && (
                    <Text style={styles.itemBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  )}
                  {timeLabel && <Text style={styles.itemMeta}>{timeLabel}</Text>}
                </View>
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
    gap: 12,
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
  headerTextContainer: {
    flex: 1,
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
  emptyState: {
    padding: 18,
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
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: UI.colors.border,
    ...UI.shadow.soft,
  },
  notificationItemUnread: {
    backgroundColor: UI.colors.surface,
  },
  notificationItemRead: {
    backgroundColor: UI.colors.inputBackground,
  },
  notificationItemPressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.colors.border,
  },
  iconWrapUnread: {
    backgroundColor: UI.colors.blueSoft,
  },
  iconWrapRead: {
    backgroundColor: UI.colors.surface,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    fontSize: 14,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.bodyMedium,
    flex: 1,
  },
  itemTitleUnread: {
    color: UI.colors.text,
  },
  itemBody: {
    fontSize: 12,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  itemMeta: {
    fontSize: 11,
    color: UI.colors.textMuted,
    fontFamily: UI.fonts.body,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: UI.colors.blue,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: UI.colors.surface,
    borderWidth: 1,
    borderColor: UI.colors.green,
  },
  markAllText: {
    fontSize: 12,
    color: UI.colors.green,
    fontFamily: UI.fonts.bodyMedium,
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
