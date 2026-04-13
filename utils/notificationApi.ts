import { API_BASE_URL } from '@/constants/api';
import { getToken, handleApiError } from './auth';

export type NotificationItem = {
  id: number;
  title: string;
  body?: string | null;
  read_at?: string | null;
  created_at?: string | null;
  data?: Record<string, any> | null;
};

export const listNotifications = async (page: number = 1, limit: number = 20): Promise<NotificationItem[]> => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/notifications?page=${page}&limit=${limit}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) throw new Error(apiError);
    throw new Error('Failed to fetch notifications');
  }
  return await response.json();
};

export const markNotificationRead = async (id: number) => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) throw new Error(apiError);
    throw new Error('Failed to mark notification read');
  }
  return await response.json();
};

export const markAllNotificationsRead = async () => {
  const token = await getToken();
  console.log('Making API call to mark all notifications as read...');
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  console.log('API response status:', response.status);
  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) throw new Error(apiError);
    throw new Error('Failed to mark all notifications read');
  }
  const result = await response.json();
  console.log('API response:', result);
  return result;
};
