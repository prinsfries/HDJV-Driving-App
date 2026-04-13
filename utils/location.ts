import { Platform } from 'react-native';
import * as Location from 'expo-location';

const getWebPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported in this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      () => reject(new Error('Unable to get location from browser')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  });

export async function getCurrentLocationLabel(): Promise<string> {
  try {
    let latitude: number;
    let longitude: number;

    if (Platform.OS === 'web') {
      const current = await getWebPosition();
      latitude = current.coords.latitude;
      longitude = current.coords.longitude;
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      latitude = current.coords.latitude;
      longitude = current.coords.longitude;
    }

    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (place) {
        const plusCodePattern = /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/i;
        const rawLandmark = place.name ?? null;
        const landmark = rawLandmark && !plusCodePattern.test(rawLandmark) ? rawLandmark : null;
        const barangay = place.district ?? (place as any).neighborhood ?? null;
        const city = place.city ?? null;
        const province = place.subregion ?? place.region ?? null;

        const parts = [barangay, city, province].filter(Boolean);
        if (landmark) return landmark;
        if (parts.length > 0) return parts.join(', ');
      }
    } catch {
      // Ignore reverse geocode error
    }

    return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  } catch (error) {
    throw error;
  }
}
