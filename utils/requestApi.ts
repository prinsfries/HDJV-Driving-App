import { API_BASE_URL } from '@/constants/api';
import { getToken, handleApiError } from './auth';

export type RideRequest = {
  id: number;
  requester_id: number;
  requester_name: string;
  requester_contact?: string | null;
  departure_place: string;
  destination: string;
  requested_at?: string | null;
  purpose?: string | null;
  persons: number;
  passenger_names?: string[];
  used_coupon: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'assigned' | 'in_progress' | 'completed';
  created_at?: string;
  updated_at?: string;
  accepted_at?: string | null;
  assigned_driver_id?: number | null;
  assigned_driver?: {
    id: number;
    full_name?: string | null;
    name?: string | null;
    username?: string | null;
    contact?: string | null;
  } | null;
  assigned_vehicle_id?: number | null;
  assigned_vehicle?: {
    id: number;
    vehicle_id?: string | null;
    vehicle_type?: string | null;
    plate_number?: string | null;
    status?: string | null;
  } | null;
  assigned_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  trip_id?: number | null;
  trip?: {
    id: number;
    trip_id: string;
    status?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    start_location?: string | null;
    end_location?: string | null;
  } | null;
  status_histories?: Array<{
    id: number;
    status: string;
    changed_by?: number | null;
    created_at?: string;
    updated_at?: string;
  }>;
};

export const listRequests = async (page: number = 1, limit: number = 10): Promise<RideRequest[]> => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/requests?page=${page}&limit=${limit}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) throw new Error(apiError);
    throw new Error('Failed to fetch requests');
  }
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

export const getRequest = async (id: number): Promise<RideRequest> => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/requests/${id}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) throw new Error(apiError);
    throw new Error('Failed to fetch request');
  }
  return await response.json();
};

export const createRequest = async (payload: {
  departure_place: string;
  destination: string;
  requested_at?: string | null;
  purpose?: string | null;
  persons: number;
  passenger_names?: string[];
  use_coupon?: boolean;
}) => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) throw new Error(apiError);
    const errorData = await response.json().catch(() => ({}));
    const firstFieldError = errorData?.errors
      ? Object.values(errorData.errors).flat?.()[0]
      : null;
    throw new Error(firstFieldError || errorData.message || 'Failed to create request');
  }
  return await response.json();
};

export const updateRequestStatus = async (id: number, status: 'in_progress' | 'completed') => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/requests/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) throw new Error(apiError);
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update request status');
  }
  return await response.json();
};
