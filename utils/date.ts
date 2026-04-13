export const formatDate = (
  value: Date | null,
  opts?: { dateFormat?: 'long' | 'short' }
) => {
  if (!value) {
    return '';
  }
  const useShort = opts?.dateFormat === 'short';
  if (useShort) {
    return value.toLocaleDateString('en-CA');
  }
  return value.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatTime = (
  value: Date | null,
  opts?: { timeFormat?: '12h' | '24h' }
) => {
  if (!value) {
    return '';
  }
  const hour12 = opts?.timeFormat !== '24h';
  return value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  });
};

export const isSameCalendarDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const formatDateRange = (
  start: Date,
  end: Date,
  opts?: { dateFormat?: 'long' | 'short' }
) => {
  if (isSameCalendarDay(start, end)) {
    return formatDate(start, opts);
  }

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (opts?.dateFormat === 'short') {
    return `${formatDate(start, opts)} - ${formatDate(end, opts)}`;
  }
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });

  if (sameMonth && sameYear) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
};