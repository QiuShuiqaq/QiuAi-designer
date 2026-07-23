import { PLATFORM_PRODUCT_KEY } from './config';
import { platformHttp } from './http';
import type {
  DesignerAiCapabilities,
  DesignerAiJob,
  DesignerAiJobCreatePayload,
  DesignerAiJobCreateResponse,
  DesignerAiTemplateSlotsPayload,
} from './types';

const DESIGNER_AI_JOB_TIMEOUT_MS = 120000;

export async function getDesignerAiCapabilities() {
  return platformHttp.get<DesignerAiCapabilities>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/ai/capabilities`
  );
}

export async function parseDesignerAiTemplateSlots(payload: {
  templateId?: string;
  templateSnapshot: {
    meta?: Record<string, unknown>;
    objects: Array<Record<string, unknown>>;
  };
}) {
  return platformHttp.post<DesignerAiTemplateSlotsPayload>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/ai/templates/slots/parse`,
    payload
  );
}

export async function createDesignerAiJob(payload: DesignerAiJobCreatePayload) {
  return platformHttp.post<DesignerAiJobCreateResponse>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/ai/jobs`,
    payload,
    {
      timeout: DESIGNER_AI_JOB_TIMEOUT_MS,
    }
  );
}

export async function getDesignerAiJob(jobId: string) {
  return platformHttp.get<DesignerAiJob>(`/api/products/${PLATFORM_PRODUCT_KEY}/ai/jobs/${jobId}`, {
    timeout: DESIGNER_AI_JOB_TIMEOUT_MS,
  });
}

export async function cancelDesignerAiJob(jobId: string) {
  return platformHttp.post<{ jobId: string; status: string }>(
    `/api/products/${PLATFORM_PRODUCT_KEY}/ai/jobs/${jobId}/cancel`,
    {}
  );
}
