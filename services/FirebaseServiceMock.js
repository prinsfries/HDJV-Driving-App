import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = 'fcmToken';

class FirebaseServiceMock {
  constructor() {
    this.token = `mock-fcm-token-${Math.random().toString(36).slice(2, 11)}`;
    this.isInitialized = false;
    this.notificationListener = null;
    this.responseListener = null;
  }

  async initialize() {
    try {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, this.token);
      this.isInitialized = true;
      console.log('FirebaseServiceMock initialized');
      return true;
    } catch (error) {
      console.error('FirebaseServiceMock initialize error:', error);
      return false;
    }
  }

  async requestPermissionAndGetToken() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.token;
  }

  onNotification(callback) {
    this.notificationListener = callback;
  }

  onNotificationResponse(callback) {
    this.responseListener = callback;
  }

  onMessage(callback) {
    this.onNotification(callback);
  }

  async getToken() {
    try {
      let token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (!token) {
        token = this.token;
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      }
      return token;
    } catch (error) {
      console.error('FirebaseServiceMock getToken error:', error);
      return this.token;
    }
  }

  async testFirebase() {
    const token = await this.getToken();
    return {
      initialized: Boolean(this.isInitialized),
      token: Boolean(token),
      permissions: true,
      message: 'Mock Firebase service is active',
    };
  }

  async removeToken() {
    try {
      this.token = null;
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      console.log('FirebaseServiceMock: token removed');
    } catch (error) {
      console.error('FirebaseServiceMock removeToken error:', error);
    }
  }

  cleanup() {
    this.notificationListener = null;
    this.responseListener = null;
    this.isInitialized = false;
  }

  isReady() {
    return this.isInitialized;
  }

  async registerTokenWithBackend() {
    console.log('FirebaseServiceMock: registerTokenWithBackend called');
    // simulate backend call
    return;
}
}

export default new FirebaseServiceMock();
