import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import type { PlatformSubscriptionPackage } from './types';

export async function listPlatformSubscriptionPackages() {
  return platformHttp.get<PlatformSubscriptionPackage[]>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/assets/subscriptions`
  );
}
