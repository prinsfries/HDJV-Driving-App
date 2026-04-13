import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getUser } from '@/utils/auth';

/**
 * @typedef {import('@/types/user').User} User
 */

const DEVICE_ID_KEY = 'firebase_device_id';
const PUSH_TOKEN_KEY = 'fcmToken';
const AUTH_TOKEN_KEYS = ['auth_token', 'userToken'];
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.41:8000').replace(/\/$/, '');

class FirebaseService {
  constructor() {
    this.token = null;
    this.isInitialized = false;
    this.notificationListener = null;
    this.responseListener = null;
    this.testListener = null;
    this.onMessageCallback = null;
    this.onNotificationResponseCallback = null;
  }

  isFirebaseNativeInitError(error) {
    const message = String(error?.message || error || '');
    return (
      message.includes('Default FirebaseApp is not initialized') ||
      message.includes('fcm-credentials')
    );
  }

  async fetchDevicePushToken() {
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      const token = deviceToken?.data ?? null;
      if (token) {
        console.log('FirebaseService: device token acquired');
      } else {
        console.warn('FirebaseService: device token is empty');
      }
      return token;
    } catch (error) {
      const message = String(error?.message || error || '');
      console.warn('FirebaseService: native device token not available:', message);
      return null;
    }
  }

  async fetchExpoPushToken() {
    try {
      const expoPushToken = await Notifications.getExpoPushTokenAsync();
      return expoPushToken?.data ?? null;
    } catch (error) {
      const message = String(error?.message || error || '');
      
      // If Firebase is not configured, we can still use Expo push notifications
      if (message.includes('Default FirebaseApp is not initialized') || 
          message.includes('fcm-credentials')) {
        
        // Try to get Expo push token without Firebase project ID
        try {
          const expoToken = await Notifications.getExpoPushTokenAsync({
            projectId: undefined // Let Expo use its own push service
          });
          console.log('FirebaseService: Using Expo push service without Firebase');
          return expoToken?.data ?? null;
        } catch (fallbackError) {
          console.warn('FirebaseService: Expo push service not available');
          return null;
        }
      }
      
      throw error;
    }
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('FirebaseService: notification permission not granted');
        return false;
      }

      const forceReal = process.env.EXPO_PUBLIC_FORCE_REAL_FIREBASE === 'true';
      if (forceReal && Platform.OS === 'android') {
        this.token = await this.fetchDevicePushToken();
      }
      if (!this.token) {
        this.token = await this.fetchExpoPushToken();
      }

      if (this.token) {
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.token);
        await this.sendTokenToBackend(this.token);
      }

      this.setupNotificationListeners();
      this.isInitialized = true;
      console.log('FirebaseService initialized');
      return true;
    } catch (error) {
      console.error('FirebaseService initialize error:', error);
      return false;
    }
  }

  setupNotificationListeners() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }

    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      if (this.onMessageCallback) {
        this.onMessageCallback(notification);
      }
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (this.onNotificationResponseCallback) {
        this.onNotificationResponseCallback(response);
      }
      this.handleNotificationTap(response);
    });
  }

  onNotification(callback) {
    if (this.testListener) {
      this.testListener.remove();
    }
    this.testListener = Notifications.addNotificationReceivedListener(callback);
  }

  onNotificationResponse(callback) {
    this.onNotificationResponseCallback = callback;
  }

  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  handleNotificationTap(response) {
    const data = response?.notification?.request?.content?.data ?? response?.data ?? response;
    this.handleNotificationData(data);
  }

  async handleNotificationData(data) {
    if (!data || !data.type) {
      return;
    }

    const requestId = data.request_id ?? data.requestId ?? null;
    const tripId = data.trip_id ?? data.tripId ?? null;
    let role = 'driver';
    try {
      /** @type {User | null} */
      const user = await getUser();
      role = user?.role ?? 'driver';
    } catch {}

    const isPassenger = role === 'passenger' || role === 'krpassenger';

    const openRequest = () => {
      if (!requestId) return;
      router.push({ pathname: '/request-details', params: { requestId: String(requestId) } });
    };

    const openTrip = () => {
      if (tripId) {
        router.push({ pathname: '/trip-details', params: { tripId: String(tripId), saved: '1' } });
        return;
      }
      if (requestId) {
        router.push({ pathname: '/trip-details', params: { requestId: String(requestId) } });
      }
    };

    switch (data.type) {
      case 'request_assigned_driver':
        openTrip();
        break;
      case 'request_created':
      case 'request_accepted':
      case 'request_assigned':
      case 'driver_assigned':
      case 'request_completed':
      case 'request_rejected':
      case 'request_rejected_expired':
        if (isPassenger) {
          openRequest();
        } else {
          openTrip();
        }
        break;
      default:
        if (requestId) {
          if (isPassenger) openRequest();
          else openTrip();
        }
        break;
    }
  }

  showNotificationAlert(title, body) {
    Alert.alert(title, body, [{ text: 'OK' }]);
  }

  showInAppNotification(notification, data) {
    Alert.alert(
      notification?.title || 'New Notification',
      notification?.body || 'You have a new notification',
      [
        {
          text: 'OK',
          onPress: () => {
            if (data) {
              this.handleNotificationTap({ data });
            }
          },
        },
      ]
    );
  }

  async requestPermissionAndGetToken() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      return this.getToken();
    } catch (error) {
      console.error('FirebaseService permission/token error:', error);
      return null;
    }
  }

  async getToken() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.token) {
        this.token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      }

      if (!this.token) {
        const forceReal = process.env.EXPO_PUBLIC_FORCE_REAL_FIREBASE === 'true';
        if (forceReal && Platform.OS === 'android') {
          this.token = await this.fetchDevicePushToken();
        }
      }

      if (!this.token) {
        this.token = await this.fetchExpoPushToken();
        if (this.token) {
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.token);
        }
      }

      return this.token;
    } catch (error) {
      console.error('FirebaseService getToken error:', error);
      return null;
    }
  }

  async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('FirebaseService getDeviceId error:', error);
      return 'mobile_unknown';
    }
  }

  async sendTokenToBackend(token) {
    try {
      if (!token) {
        return;
      }

      let authToken = null;
      for (const key of AUTH_TOKEN_KEYS) {
        if (authToken) break;
        authToken = await AsyncStorage.getItem(key);
      }

      if (!authToken) {
        console.log('FirebaseService: no auth token, skip backend token registration');
        return;
      }

      const deviceId = await this.getDeviceId();
      const response = await fetch(`${API_BASE_URL}/api/fcm-tokens/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token,
          device_type: 'mobile',
          device_id: deviceId,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('FirebaseService token registration failed:', response.status, errorBody);
      }
    } catch (error) {
      console.error('FirebaseService sendTokenToBackend error:', error);
    }
  }

  async registerTokenWithBackend() {
    try {
      const token = await this.getToken();
      if (!token) {
        console.warn('FirebaseService: no token available to register');
        return false;
      }
      await this.sendTokenToBackend(token);
      return true;
    } catch (error) {
      console.error('FirebaseService registerTokenWithBackend error:', error);
      return false;
    }
  }

  async removeToken() {
    try {
      const token = this.token || (await AsyncStorage.getItem(PUSH_TOKEN_KEY));
      if (!token) {
        return;
      }

      let authToken = null;
      for (const key of AUTH_TOKEN_KEYS) {
        if (authToken) break;
        authToken = await AsyncStorage.getItem(key);
      }

      if (authToken) {
        const deviceId = await this.getDeviceId();
        const response = await fetch(`${API_BASE_URL}/api/fcm-tokens/remove`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ 
            token,
            device_id: deviceId 
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error('FirebaseService token removal failed:', response.status, errorBody);
        }
      }

      this.token = null;
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    } catch (error) {
      console.error('FirebaseService removeToken error:', error);
    }
  }

  showPermissionAlert() {
    Alert.alert(
      'Permission Required',
      'Please enable notifications in your device settings to receive important updates.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  async testFirebase() {
    try {
      const initialized = await this.initialize();
      const token = await this.getToken();
      const permission = await Notifications.getPermissionsAsync();

      if (initialized) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Firebase Test',
            body: 'Firebase service is working',
            data: { type: 'test' },
          },
          trigger: null,
        });
      }

      return {
        initialized: Boolean(initialized),
        token: Boolean(token),
        permissions: permission?.status === 'granted',
        message: initialized ? 'Test completed successfully' : 'Initialization failed',
      };
    } catch (error) {
      return {
        initialized: false,
        token: false,
        permissions: false,
        message: error?.message || 'Unknown error occurred',
      };
    }
  }

  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    if (this.testListener) {
      this.testListener.remove();
      this.testListener = null;
    }
    this.onMessageCallback = null;
    this.onNotificationResponseCallback = null;
    this.isInitialized = false;
  }
}

export default FirebaseService;
