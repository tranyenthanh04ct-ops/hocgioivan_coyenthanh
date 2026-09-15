/**
 * Authentication helper utilities
 */

export const TEACHER_DEFAULT_EMAIL = 'tranyenthanh.04.ct@gmail.com';
export const TEACHER_DEFAULT_PASSWORD = '224466';

// Storage key for persistent authentication
export const AUTH_STORAGE_KEY = 'yenthanh_auth_session';

export const normalizeAuthPassword = (rawPassword: string): string => {
  if (!rawPassword) return rawPassword;
  const trimmed = rawPassword.trim();
  if (trimmed.length < 6) {
    return `${trimmed}#yenthanh`;
  }
  return trimmed;
};
