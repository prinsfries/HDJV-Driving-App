import { login } from '@/utils/auth';

export type LoginResult = {
  data: any;
  needsPasswordChange: boolean;
};

export const loginAndInitializeSession = async (
  loginIdentifier: string,
  password: string
): Promise<LoginResult> => {
  const data = await login(loginIdentifier, password);

  try {
    const { firebaseService } = await import('@/services/firebaseServiceSelector');
    await firebaseService.registerTokenWithBackend();
  } catch {
    // ignore notification setup errors during login
  }

  const changed = Boolean(data?.user?.password_changed);
  return {
    data,
    needsPasswordChange: !changed,
  };
};
