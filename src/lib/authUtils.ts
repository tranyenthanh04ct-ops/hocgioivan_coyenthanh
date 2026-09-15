/**
 * Authentication helper utilities
 */

// Firebase Authentication enforces a minimum 6-character password.
// To seamlessly allow initial passwords like "1980" or 4-digit student PINs:
export const normalizeAuthPassword = (rawPassword: string): string => {
  if (!rawPassword) return rawPassword;
  const trimmed = rawPassword.trim();
  if (trimmed.length < 6) {
    return `${trimmed}#yenthanh`;
  }
  return trimmed;
};

export const FIREBASE_AUTH_PROVIDERS_URL = 
  'https://console.firebase.google.com/project/wide-guild-1vxch/authentication/providers';
