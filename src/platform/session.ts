import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import {
  clearPlatformSessionToken,
  getPlatformDeviceFingerprint,
  getPlatformDeviceName,
  saveStoredPlatformProfile,
  setPlatformSessionToken,
} from './storage';
import type { PlatformActivationStatus, PlatformProductMeta } from './types';

export async function getPlatformProductMeta() {
  return platformHttp.get<PlatformProductMeta>(`/api/platform/products/${PLATFORM_PRODUCT_KEY}`);
}

export async function getPlatformActivationStatus() {
  return platformHttp.get<PlatformActivationStatus>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/activation/status`,
    {
      params: {
        deviceFingerprint: getPlatformDeviceFingerprint(),
      },
    }
  );
}

export async function activatePlatformLicense(payload: {
  customerName: string;
  contact: string;
  agentInviteCode?: string;
}) {
  const response = await platformHttp.post<PlatformActivationStatus>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/activation/activate`,
    {
      customerName: payload.customerName,
      contact: payload.contact,
      inviteCode: payload.agentInviteCode || '',
      deviceName: getPlatformDeviceName(),
      deviceFingerprint: getPlatformDeviceFingerprint(),
    }
  );

  if (response?.sessionToken) {
    setPlatformSessionToken(response.sessionToken);
  }

  saveStoredPlatformProfile({
    customerName: payload.customerName,
    contact: payload.contact,
    agentInviteCode: payload.agentInviteCode || '',
  });

  return response;
}

export function clearPlatformSession() {
  clearPlatformSessionToken();
}
