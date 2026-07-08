import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import type { PlatformWalletSummary } from './types';

export async function getPlatformWalletSummary() {
  return platformHttp.get<PlatformWalletSummary>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/assets/summary`
  );
}
