import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import type { DesignerAssistantTurnRequest, DesignerAssistantTurnResponse } from './types';

const ASSISTANT_TURN_TIMEOUT_MS = 120000;

export async function createDesignerAssistantTurn(payload: DesignerAssistantTurnRequest) {
  return platformHttp.post<DesignerAssistantTurnResponse>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/assistant/turns`,
    payload,
    {
      timeout: ASSISTANT_TURN_TIMEOUT_MS,
    }
  );
}
