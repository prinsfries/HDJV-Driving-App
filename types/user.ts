export type UserPreferences = {
  date_format?: 'long' | 'short';
  time_format?: '12h' | '24h';
};

export type User = {
  id: number | string;
  role?: string | null;
  email?: string | null;
  username?: string | null;
  name?: string | null;
  full_name?: string | null;
  contact?: string | null;
  created_at?: string | null;
  is_approved?: boolean | number | null;
  is_active?: boolean | number | null;
  password_changed?: boolean | number | null;
  preferences?: UserPreferences | null;
  [key: string]: unknown;
};
