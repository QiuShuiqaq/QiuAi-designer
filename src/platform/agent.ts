import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import type { PlatformAgentQuote } from './types';

export async function quotePlatformAgentPrices(agentInviteCode: string) {
  return platformHttp.post<PlatformAgentQuote>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/agents/quote`,
    {
      agentInviteCode,
    }
  );
}
