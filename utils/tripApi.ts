import { API_BASE_URL } from '@/constants/api';
import { getToken, handleApiError } from './auth';

export type TripSyncPayload = {
  trip_id: string;
  driver_name?: string | null;
  vehicle_type?: string | null;
  plate_number?: string | null;
  start_location?: string | null;
  end_location?: string | null;
  status?: 'not_started' | 'started' | 'completed';
  started_at?: string | null;
  completed_at?: string | null;
  odometer_start?: string | null;
  odometer_end?: string | null;
  passengers?: string[];
};

type UploadProofPhotoInput = {
  tripId: string;
  photoUri: string;
  location?: string | null;
  capturedAt?: string | null;
};

export const syncTrip = async (payload: TripSyncPayload) => {
  if (!payload.trip_id) {
    return;
  }
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) {
      throw new Error(apiError);
    }
    const errorData = await response.json().catch(() => ({}));
    console.error('Sync trip failed:', errorData);
    throw new Error(errorData.message || 'Failed to sync trip');
  }

  return await response.json();
};

export type Trip = {
  trip_id: string;
  driver_name?: string | null;
  vehicle_type?: string | null;
  plate_number?: string | null;
  start_location?: string | null;
  end_location?: string | null;
  status?: 'not_started' | 'started' | 'completed';
  started_at?: string | null;
  completed_at?: string | null;
  odometer_start?: string | null;
  odometer_end?: string | null;
  passengers?: string[];
};

export const listTrips = async (page: number = 1, limit: number = 10): Promise<Trip[]> => {
  const token = await getToken();
  try {
    const response = await fetch(`${API_BASE_URL}/api/trips?page=${page}&limit=${limit}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const apiError = await handleApiError(response);
      if (apiError) throw new Error(apiError);
      throw new Error('Failed to fetch trips');
    }
    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  } catch (e) {
    throw e;
  }
};

export const getTripProofPhotos = async (tripId: string): Promise<any[]> => {
  const token = await getToken();
  try {
    const response = await fetch(`${API_BASE_URL}/api/trips/${encodeURIComponent(tripId)}/proof-photos`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const apiError = await handleApiError(response);
      if (apiError) throw new Error(apiError);
      throw new Error('Failed to fetch proof photos');
    }
    return await response.json();
  } catch (e) {
    throw e;
  }
};

export const getTrip = async (tripId: string): Promise<Trip> => {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/trips/${encodeURIComponent(tripId)}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    throw new Error(apiError || 'Failed to fetch trip');
  }
  return await response.json();
};

export type Vehicle = {
  id: number;
  vehicle_id: string;
  vehicle_type: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  plate_number: string;
};

export const listVehicles = async (
  page: number = 1,
  limit: number = 50,
  search: string = '',
  vehicleType: string = ''
): Promise<Vehicle[]> => {
  const token = await getToken();
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) qs.set('search', search);
  if (vehicleType) qs.set('vehicle_type', vehicleType);
  const response = await fetch(`${API_BASE_URL}/api/vehicles?${qs.toString()}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    throw new Error(apiError || 'Failed to fetch vehicles');
  }
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

export const fetchVehiclesPage = async (
  page: number = 1,
  limit: number = 50,
  search: string = '',
  vehicleType: string = ''
): Promise<{ items: Vehicle[]; total: number | null }> => {
  const token = await getToken();
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) qs.set('search', search);
  if (vehicleType) qs.set('vehicle_type', vehicleType);
  const response = await fetch(`${API_BASE_URL}/api/vehicles?${qs.toString()}`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    throw new Error(apiError || 'Failed to fetch vehicles');
  }
  const payload = await response.json();
  const items: Vehicle[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  const total = typeof payload?.total === 'number' ? payload.total : null;
  return { items, total };
};

export const resolveFileUrl = (input: string | null | undefined): string | null => {
  if (!input) return null;
  const url = String(input);
  try {
    // If absolute URL, ensure it uses the API base origin (fix missing port like localhost)
    if (/^https?:\/\//i.test(url)) {
      const api = new URL(API_BASE_URL);
      const u = new URL(url);
      if (u.hostname === 'localhost' && api.hostname === 'localhost' && u.port !== api.port) {
        return `${api.origin}${u.pathname}${u.search}${u.hash}`;
      }
      return url;
    }
  } catch {
    // Fall through to prefixing
  }
  // Relative path -> prefix API base URL
  const api = API_BASE_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${api}${path}`;
};

export const uploadTripProofPhoto = async ({
  tripId,
  photoUri,
  location,
  capturedAt,
}: UploadProofPhotoInput) => {
  const token = await getToken();
  const formData = new FormData();
  formData.append(
    'photo',
    {
      uri: photoUri,
      name: `proof-${tripId}-${Date.now()}.jpg`,
      type: 'image/jpeg',
    } as any
  );
  if (location) {
    formData.append('location', location);
  }
  if (capturedAt) {
    formData.append('captured_at', capturedAt);
  }

  const response = await fetch(`${API_BASE_URL}/api/trips/${encodeURIComponent(tripId)}/proof-photos`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const apiError = await handleApiError(response);
    if (apiError) {
      throw new Error(apiError);
    }
    const errorData = await response.json().catch(() => ({}));
    console.error('Upload proof photo failed:', errorData);
    throw new Error(errorData.message || 'Failed to upload proof photo');
  }

  return await response.json();
};
