import Constants from 'expo-constants';
import FirebaseService from '@/services/FirebaseService';
import firebaseServiceMock from '@/services/FirebaseServiceMock';

const forceMock = process.env.EXPO_PUBLIC_USE_MOCK_FIREBASE === 'true';
const forceReal = process.env.EXPO_PUBLIC_FORCE_REAL_FIREBASE === 'true';
export const isExpoGo = Constants.appOwnership === 'expo';

export const usingMockFirebase =
  forceMock || (!forceReal && (isExpoGo || (__DEV__ ?? false)));

export const firebaseService = usingMockFirebase
  ? firebaseServiceMock
  : new FirebaseService();

