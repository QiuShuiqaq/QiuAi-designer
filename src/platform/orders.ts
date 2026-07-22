import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import { getPlatformDeviceFingerprint, getPlatformDeviceName, getPlatformSessionToken } from './storage';
import type {
  PlatformSubscriptionOrder,
  PlatformTopupOrder,
} from './types';

export async function createPlatformSubscriptionOrder(payload: {
  subscriptionCode: string;
  customerName?: string;
  contact?: string;
  agentInviteCode?: string;
}) {
  return platformHttp.post<PlatformSubscriptionOrder>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/assets/subscription-orders`,
    {
      subscriptionCode: payload.subscriptionCode,
      channel: 'alipay',
      sessionToken: getPlatformSessionToken(),
      customerName: payload.customerName || '',
      contact: payload.contact || '',
      inviteCode: payload.agentInviteCode || '',
      agentInviteCode: payload.agentInviteCode || '',
      deviceFingerprint: getPlatformDeviceFingerprint(),
      deviceName: getPlatformDeviceName(),
    }
  );
}

export async function getPlatformSubscriptionOrder(payload: { id: string }) {
  return platformHttp.get<PlatformSubscriptionOrder>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/assets/subscription-orders/${payload.id}`
  );
}

export async function createPlatformTopupOrder(payload: {
  walletType: 'text' | 'image' | 'video';
  amountCny: number;
}) {
  return platformHttp.post<PlatformTopupOrder>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/assets/topup-orders`,
    {
      walletType: payload.walletType,
      amountCny: payload.amountCny,
      channel: 'alipay',
      sessionToken: getPlatformSessionToken(),
    }
  );
}

export async function getPlatformTopupOrder(payload: { id: string }) {
  return platformHttp.get<PlatformTopupOrder>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/assets/topup-orders/${payload.id}`
  );
}
