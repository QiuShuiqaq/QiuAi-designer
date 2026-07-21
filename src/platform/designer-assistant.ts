import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import type { DesignerAssistantTurnRequest, DesignerAssistantTurnResponse } from './types';

export async function createDesignerAssistantTurn(payload: DesignerAssistantTurnRequest) {
  return platformHttp.post<DesignerAssistantTurnResponse>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/assistant/turns`,
    payload,
    {
      timeout: 60000,
    }
  );
}
