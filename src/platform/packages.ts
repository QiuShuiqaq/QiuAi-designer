import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import type { PlatformSoftwarePackage } from './types';

export async function listPlatformSoftwarePackages() {
  return platformHttp.get<PlatformSoftwarePackage[]>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/packages`
  );
}
