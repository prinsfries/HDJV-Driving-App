const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
console.log('[API] Using Base URL:', rawBaseUrl);

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');
