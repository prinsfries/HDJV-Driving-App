import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProofPhoto } from '@/components/add/ProofPhotosSection';

export type TripStatePersisted = {
  isSaved?: boolean;
  isStarted?: boolean;
  isCompleted?: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  startLocation?: string | null;
  stopLocation?: string | null;
  odometerStart?: string;
  odometerEnd?: string;
  passengers?: string[];
  vehicleType?: string;
  vehicleTypeOther?: string;
  plateNumber?: string;
  plateNumberOther?: string;
  proofPhotos?: ProofPhoto[];
};

export const getStorageKey = (tripId: string | null) =>
  tripId ? `trip-state:${tripId}` : 'trip-state:new';

export async function loadTripState(storageKey: string): Promise<TripStatePersisted | null> {
  const stored = await AsyncStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as TripStatePersisted;
  } catch {
    return null;
  }
}

export async function persistTripState(storageKey: string, state: TripStatePersisted): Promise<void> {
  const payload = JSON.stringify(state);
  await AsyncStorage.setItem(storageKey, payload);
}

export async function getProofPhotos(storageKey: string): Promise<ProofPhoto[]> {
  const stored = await AsyncStorage.getItem(storageKey);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as TripStatePersisted;
    return Array.isArray(parsed.proofPhotos) ? parsed.proofPhotos : [];
  } catch {
    return [];
  }
}