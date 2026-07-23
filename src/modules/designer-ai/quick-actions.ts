import type { DesignerAiActionCategory } from '@/platform/types';

export type DesignerAiReferenceSnapshot = {
  objectId: string;
  objectType: string;
  label: string;
  sourceUrl?: string;
  sourceDataUrl?: string;
  previewDataUrl?: string;
  frame: {
    left: number;
    top: number;
    width: number;
    height: number;
    aspectRatio: string;
  };
};

export type DesignerAiQuickActionDetail = {
  actionKey?: string;
  label?: string;
  prompt?: string;
  category?: DesignerAiActionCategory;
  objectId?: string;
  objectType?: string;
  referenceSnapshot?: DesignerAiReferenceSnapshot;
};

export const DESIGNER_AI_QUICK_ACTION_REQUEST_EVENT = 'qiuai-designer-ai-quick-action-request';
export const DESIGNER_AI_PANEL_ACTION_EVENT = 'qiuai-designer-ai-panel-action';

type QuickActionHandler = (detail: DesignerAiQuickActionDetail) => void;

function dispatchDesignerAiEvent(eventName: string, detail: DesignerAiQuickActionDetail) {
  window.dispatchEvent(
    new CustomEvent<DesignerAiQuickActionDetail>(eventName, {
      detail,
    })
  );
}

function listenDesignerAiEvent(eventName: string, handler: QuickActionHandler) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<DesignerAiQuickActionDetail>).detail || {});
  };

  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}

export function requestDesignerAiQuickAction(detail: DesignerAiQuickActionDetail) {
  dispatchDesignerAiEvent(DESIGNER_AI_QUICK_ACTION_REQUEST_EVENT, detail);
}

export function applyDesignerAiPanelAction(detail: DesignerAiQuickActionDetail) {
  dispatchDesignerAiEvent(DESIGNER_AI_PANEL_ACTION_EVENT, detail);
}

export function onDesignerAiQuickActionRequest(handler: QuickActionHandler) {
  return listenDesignerAiEvent(DESIGNER_AI_QUICK_ACTION_REQUEST_EVENT, handler);
}

export function onDesignerAiPanelAction(handler: QuickActionHandler) {
  return listenDesignerAiEvent(DESIGNER_AI_PANEL_ACTION_EVENT, handler);
}
