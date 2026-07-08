import { v4 as uuidv4 } from 'uuid';

const SESSION_TOKEN_KEY = 'qiuai-designer.platform.session-token';
const DEVICE_FINGERPRINT_KEY = 'qiuai-designer.platform.device-fingerprint';
const PROFILE_KEY = 'qiuai-designer.platform.profile';

export interface StoredPlatformProfile {
  customerName: string;
  contact: string;
  agentInviteCode: string;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getPlatformSessionToken() {
  if (!canUseStorage()) {
    return '';
  }

  return String(window.localStorage.getItem(SESSION_TOKEN_KEY) || '').trim();
}

export function setPlatformSessionToken(sessionToken: string) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, String(sessionToken || '').trim());
}

export function clearPlatformSessionToken() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}

export function getPlatformDeviceFingerprint() {
  if (!canUseStorage()) {
    return uuidv4();
  }

  const stored = String(window.localStorage.getItem(DEVICE_FINGERPRINT_KEY) || '').trim();
  if (stored) {
    return stored;
  }

  const nextValue = uuidv4();
  window.localStorage.setItem(DEVICE_FINGERPRINT_KEY, nextValue);
  return nextValue;
}

export function getPlatformDeviceName() {
  if (typeof navigator === 'undefined') {
    return 'QiuAi Designer';
  }

  const typedNavigator = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = String(
    typedNavigator.userAgentData?.platform || navigator.platform || 'Web'
  ).trim();
  return `QiuAi Designer / ${platform || 'Web'}`;
}

export function getStoredPlatformProfile(): StoredPlatformProfile {
  if (!canUseStorage()) {
    return {
      customerName: '',
      contact: '',
      agentInviteCode: '',
    };
  }

  try {
    const rawValue = window.localStorage.getItem(PROFILE_KEY);
    if (!rawValue) {
      return {
        customerName: '',
        contact: '',
        agentInviteCode: '',
      };
    }

    const parsed = JSON.parse(rawValue) as Partial<StoredPlatformProfile>;
    return {
      customerName: String(parsed.customerName || '').trim(),
      contact: String(parsed.contact || '').trim(),
      agentInviteCode: String(parsed.agentInviteCode || '').trim(),
    };
  } catch {
    return {
      customerName: '',
      contact: '',
      agentInviteCode: '',
    };
  }
}

export function saveStoredPlatformProfile(profile: Partial<StoredPlatformProfile>) {
  if (!canUseStorage()) {
    return;
  }

  const current = getStoredPlatformProfile();
  const nextValue: StoredPlatformProfile = {
    customerName: String(profile.customerName ?? current.customerName ?? '').trim(),
    contact: String(profile.contact ?? current.contact ?? '').trim(),
    agentInviteCode: String(profile.agentInviteCode ?? current.agentInviteCode ?? '').trim(),
  };

  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextValue));
}
