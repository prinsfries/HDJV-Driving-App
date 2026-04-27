import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';
import type { User, UserPreferences } from '@/types/user';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export type { User, UserPreferences };

export const login = async (loginIdentifier: string, password: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        email: loginIdentifier, 
        password,
        source: 'app'
      }),
    }).catch(err => {
      throw new Error('Server connection failed. Please check your internet or try again later.');
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const isApproved = Boolean(data?.user?.is_approved);
    const isActive = Boolean(data?.user?.is_active);
    if (isApproved && isActive && data?.token) {
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export type RegisterPayload = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  email: string;
  username?: string;
  password: string;
  contact?: string;
  role: 'driver' | 'passenger';
};

export const register = async (payload: RegisterPayload) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      throw new Error('Server connection failed. Please check your internet or try again later.');
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const firstFieldError = data?.errors
        ? Object.values(data.errors).flat?.()[0]
        : null;
      throw new Error(firstFieldError || data?.message || 'Registration failed');
    }

    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));

    return data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    // Remove FCM token from backend before clearing auth
    const { firebaseService } = await import('@/services/firebaseServiceSelector');
    await firebaseService.removeToken();
  } catch (error) {
    console.warn('Failed to remove FCM token during logout:', error);
  }
  
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
  
  // Clear notification-related storage if any
  try {
    await AsyncStorage.removeItem('notifications_cache');
    await AsyncStorage.removeItem('home_data_cache');
  } catch (error) {
    // Ignore errors for clearing cache
  }
};

export const handleApiError = async (response: Response) => {
  let data: any = {};
  try {
    // Parse from a clone so callers can still read the original response body.
    data = await response.clone().json();
  } catch {
    
  }

  if (response.status === 401) {
    await logout();
    return data?.message || 'Authentication required';
  }

  if (response.status === 403 || (data?.message && String(data.message).toLowerCase().includes('inactive'))) {
    await logout();
    return data?.message || 'Account inactive';
  }

  return null;
};

export const getToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const getUser = async () => {
  const user = await AsyncStorage.getItem(USER_KEY);
  return (user ? (JSON.parse(user) as User) : null) satisfies User | null;
};

export const updateUserPreferences = async (preferences: UserPreferences) => {
  const token = await getToken();
  const current = await getUser();
  if (!token || !current?.id) {
    throw new Error('Not authenticated');
  }
  const response = await fetch(`${API_BASE_URL}/api/users/${current.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ preferences }),
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    throw new Error(apiError || 'Failed to update preferences');
  }
  const updated = await response.json();
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
};

export const updateUserPassword = async (
  newPassword: string,
  currentPassword: string | null = null,
  forcePasswordChange = false
) => {
  const token = await getToken();
  const current = await getUser();
  if (!token || !current?.id) {
    throw new Error('Not authenticated');
  }
  const response = await fetch(`${API_BASE_URL}/api/users/${current.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      password: newPassword,
      ...(currentPassword ? { current_password: currentPassword } : {}),
      force_password_change: forcePasswordChange,
    }),
  });
  if (!response.ok) {
    const apiError = await handleApiError(response);
    let message = apiError;
    if (!message) {
      const data: any = await response.json().catch(() => ({}));
      const passwordErrors = Array.isArray(data?.errors?.password) ? data.errors.password : [];
      const currentPasswordErrors = Array.isArray(data?.errors?.current_password)
        ? data.errors.current_password
        : [];
      const generalErrors = Array.isArray(data?.errors) ? data.errors : [];
      message = (
        passwordErrors[0] ||
        currentPasswordErrors[0] ||
        generalErrors[0] ||
        data?.message ||
        'Failed to update password'
      );
    }
    throw new Error(message);
  }
  const updated = await response.json();
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
};

export const isAuthenticated = async () => {
  const token = await getToken();
  return !!token;
};

export const checkAccountStatus = async () => {
  const token = await getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      await handleApiError(response);
      return false;
    }

    const userData = await response.json();
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Check account status error:', error);
    // On network error, we might want to allow staying logged in if we already have a token
    // but for security, if we can't verify, maybe we should be cautious.
    // However, the app supports offline, so we return true if we have a token but can't reach server.
    return true; 
  }
};
