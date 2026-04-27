import { checkAccountStatus, getUser } from '@/utils/auth';
import { formatDate, formatDateRange, formatTime } from '@/utils/date';
import { listNotifications } from '@/utils/notificationApi';
import { getMonthlyCouponLeft, listRequests, type RideRequest } from '@/utils/requestApi';
import { listTrips, type Trip } from '@/utils/tripApi';

export type DatePreferences = {
  date_format: 'long' | 'short';
  time_format: '12h' | '24h';
};

export type TripCard = {
  id: string;
  date: string;
  time: string;
  route: string;
  passengers: string;
  status: 'Completed' | 'Started' | 'Not Started';
  startedAt: Date | null;
};

export type RequestCard = {
  id: number;
  title: string;
  persons: string;
  dateTime: string;
  purpose: string | null;
  couponUsed: boolean;
  statusLabel: string;
  status: RideRequest['status'];
  sortTime: number;
};

export type WeeklyStats = {
  trips: number;
  distanceKm: number;
  hours: number;
};

export type HomePagePayload = {
  role: string;
  isPassenger: boolean;
  isKrPassenger: boolean;
  prefs: DatePreferences;
  unreadCount: number;
  couponLeft: number | null;
  hasMore: boolean;
  trips: TripCard[];
  requests: RequestCard[];
  driverRequests: RequestCard[];
};

const getStatusLabel = (status: RideRequest['status']): string => {
  if (status === 'in_progress') return 'in progress';
  return status;
};

export const parseTrips = (items: Trip[], prefs: DatePreferences): TripCard[] => {
  return items
    .map((t) => {
      const startedAt = t.started_at ? new Date(t.started_at) : null;
      const completedAt = t.completed_at ? new Date(t.completed_at) : null;
      const dateLabel = startedAt
        ? completedAt
          ? formatDateRange(startedAt, completedAt, { dateFormat: prefs.date_format })
          : formatDate(startedAt, { dateFormat: prefs.date_format })
        : 'Not started yet';
      const timeLabel = startedAt
        ? completedAt
          ? `${formatTime(startedAt, { timeFormat: prefs.time_format })} - ${formatTime(completedAt, { timeFormat: prefs.time_format })}`
          : formatTime(startedAt, { timeFormat: prefs.time_format })
        : 'Not started yet';
      const routeLabel = t.start_location
        ? t.end_location
          ? `${t.start_location} - ${t.end_location}`
          : t.start_location
        : 'Location pending';
      const passengerList = (t.passengers ?? []).filter((name) => String(name).trim().length > 0);
      const passengerLabel =
        passengerList.length === 0
          ? 'No passengers yet'
          : `${passengerList.length} passenger${passengerList.length === 1 ? '' : 's'}`;
      const status: TripCard['status'] =
        t.status === 'completed' ? 'Completed' : t.status === 'started' ? 'Started' : 'Not Started';

      return {
        id: t.trip_id,
        date: dateLabel,
        time: timeLabel,
        route: routeLabel,
        passengers: passengerLabel,
        status,
        startedAt,
      } satisfies TripCard;
    })
    .sort((left, right) => {
      if (!left.startedAt && !right.startedAt) return 0;
      if (!left.startedAt) return 1;
      if (!right.startedAt) return -1;
      return right.startedAt.getTime() - left.startedAt.getTime();
    });
};

export const parseRequests = (items: RideRequest[], prefs: DatePreferences): RequestCard[] => {
  return items
    .map((item) => {
      const eventDate = item.requested_at
        ? new Date(item.requested_at)
        : item.created_at
          ? new Date(item.created_at)
          : null;
      const dateTime = eventDate
        ? `${formatDate(eventDate, { dateFormat: prefs.date_format })} ${formatTime(eventDate, { timeFormat: prefs.time_format })}`
        : 'Schedule pending';
      const persons = `${item.persons} person${item.persons === 1 ? '' : 's'}`;

      return {
        id: item.id,
        title: `${item.departure_place} - ${item.destination}`,
        persons,
        dateTime,
        purpose: item.purpose ?? null,
        couponUsed: Boolean(item.used_coupon),
        statusLabel: getStatusLabel(item.status),
        status: item.status,
        sortTime: eventDate ? eventDate.getTime() : 0,
      } satisfies RequestCard;
    })
    .sort((left, right) => right.sortTime - left.sortTime);
};

export const computeWeeklyStats = (items: Trip[]): WeeklyStats => {
  const getStartOfWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const parseNumber = (value?: string | null) => {
    if (!value) return null;
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    const num = Number(cleaned);
    return Number.isNaN(num) ? null : num;
  };

  const now = new Date();
  const weekStart = getStartOfWeek(now).getTime();
  const weekEnd = now.getTime();
  let trips = 0;
  let distanceKm = 0;
  let hours = 0;

  items.forEach((t) => {
    const startedAt = t.started_at ? new Date(t.started_at).getTime() : null;
    const completedAt = t.completed_at ? new Date(t.completed_at).getTime() : null;
    const eventTime = startedAt ?? completedAt;
    if (!eventTime || eventTime < weekStart || eventTime > weekEnd) return;

    trips += 1;

    if (startedAt && completedAt && completedAt > startedAt) {
      hours += (completedAt - startedAt) / (1000 * 60 * 60);
    }

    const odoStart = parseNumber(t.odometer_start);
    const odoEnd = parseNumber(t.odometer_end);
    if (odoStart !== null && odoEnd !== null) {
      const diff = odoEnd - odoStart;
      if (diff > 0) distanceKm += diff;
    }
  });

  return { trips, distanceKm, hours };
};

export const fetchWeeklyStats = async (): Promise<WeeklyStats> => {
  const allTrips: Trip[] = [];
  let page = 1;
  const limit = 50;
  const maxPages = 10;

  while (page <= maxPages) {
    const batch = await listTrips(page, limit).catch(() => []);
    if (!Array.isArray(batch) || batch.length === 0) break;
    allTrips.push(...batch);
    if (batch.length < limit) break;
    page += 1;
  }

  return computeWeeklyStats(allTrips);
};

export const fetchHomePage = async (page: number = 1): Promise<HomePagePayload> => {
  const stillActive = await checkAccountStatus();
  if (!stillActive) {
    throw new Error('AUTH_INACTIVE');
  }

  const user = await getUser();
  const role = String(user?.role ?? 'driver');
  const prefs: DatePreferences = {
    date_format: user?.preferences?.date_format ?? 'long',
    time_format: user?.preferences?.time_format ?? '12h',
  };

  const notifications = await listNotifications().catch(() => []);
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const isPassenger = role === 'passenger' || role === 'krpassenger';
  const isKrPassenger = role === 'krpassenger';

  if (isPassenger) {
    const requestItems = await listRequests(page, 10).catch(() => []);
    const parsedRequests = parseRequests(requestItems, prefs);

    let couponLeft: number | null = null;
    if (isKrPassenger) {
      couponLeft = await getMonthlyCouponLeft().catch(() => null);
    }

    return {
      role,
      isPassenger,
      isKrPassenger,
      prefs,
      unreadCount,
      couponLeft,
      hasMore: requestItems.length === 10,
      trips: [],
      requests: parsedRequests,
      driverRequests: [],
    };
  }

  const tripItems = await listTrips(page, 10).catch(() => []);
  const requestItems = await listRequests(1, 100).catch(() => []);

  const assignedRequests = requestItems.filter((item) => {
    if (item.status === 'assigned' || item.status === 'accepted') {
      return true;
    }
    if (item.status === 'in_progress') {
      return !item.trip?.trip_id;
    }
    return false;
  });

  return {
    role,
    isPassenger: false,
    isKrPassenger: false,
    prefs,
    unreadCount,
    couponLeft: null,
    hasMore: tripItems.length === 10,
    trips: parseTrips(tripItems, prefs),
    requests: [],
    driverRequests: parseRequests(assignedRequests, prefs),
  };
};
