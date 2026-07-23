import { fabric } from 'fabric';
import type { IEditor, IPluginTempl } from '@kuaitu/core';

import { requestDesignerAiQuickAction } from './quick-actions';
import type { DesignerAiQuickActionDetail } from './quick-actions';

type CanvasObject = fabric.Object & {
  id?: string;
  name?: string;
  text?: string;
  originSrc?: string;
  getSrc?: () => string;
  get?: (key: string) => unknown;
  getScaledWidth?: () => number;
  getScaledHeight?: () => number;
  toDataURL?: (options?: Record<string, unknown>) => string;
  getElement?: () => unknown;
  _element?: unknown;
};

function getObjectTypeLabel(object: CanvasObject) {
  const type = String(object.type || '').trim();
  if (type === 'image') return '图片图层';
  if (type === 'textbox' || type === 'i-text' || type === 'text') return '文本图层';
  if (type === 'group') return '组合图层';
  if (type === 'rect' || type === 'circle' || type === 'triangle' || type === 'polygon') {
    return '形状图层';
  }
  return '图层';
}

function getObjectLabel(object: CanvasObject) {
  const label = String(object.name || object.text || object.id || '').trim();
  if (label) {
    return label;
  }

  return getObjectTypeLabel(object);
}

function resolveAspectRatioLabel(width: number, height: number) {
  const normalizedWidth = Math.max(1, Number(width) || 1);
  const normalizedHeight = Math.max(1, Number(height) || 1);
  const ratio = normalizedWidth / normalizedHeight;
  const candidates = [
    { label: '1:1', value: 1 },
    { label: '4:5', value: 4 / 5 },
    { label: '3:4', value: 3 / 4 },
    { label: '2:3', value: 2 / 3 },
    { label: '9:16', value: 9 / 16 },
    { label: '16:9', value: 16 / 9 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:2', value: 3 / 2 },
  ];

  return (
    candidates
      .map((candidate) => ({
        ...candidate,
        distance: Math.abs(candidate.value - ratio),
      }))
      .sort((left, right) => left.distance - right.distance)[0]?.label || '1:1'
  );
}

function buildObjectPreviewDataUrl(object: CanvasObject) {
  try {
    const dataUrl = String(
      object.toDataURL?.({
        format: 'png',
        multiplier: 1,
      }) || ''
    ).trim();
    if (dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }
  } catch {
    // Ignore preview export failures and fall back to the source image.
  }

  const sourceUrl =
    String(object.originSrc || '').trim() ||
    String(object.getSrc?.() || '').trim() ||
    String(object.get?.('src') || '').trim();
  return sourceUrl.startsWith('data:image/') ? sourceUrl : '';
}

function buildReferenceSnapshot(object: CanvasObject) {
  const width = Math.max(
    1,
    Math.round(Number(object.getScaledWidth?.() || object.get?.('width') || 0) || 1)
  );
  const height = Math.max(
    1,
    Math.round(Number(object.getScaledHeight?.() || object.get?.('height') || 0) || 1)
  );
  const sourceUrl =
    String(object.originSrc || '').trim() ||
    String(object.getSrc?.() || '').trim() ||
    String(object.get?.('src') || '').trim();
  const sourceDataUrl = buildObjectPreviewDataUrl(object);

  return {
    objectId: String(object.id || ''),
    objectType: String(object.type || 'object'),
    label: getObjectLabel(object),
    sourceUrl: sourceUrl || undefined,
    sourceDataUrl: sourceDataUrl || undefined,
    previewDataUrl: sourceDataUrl || sourceUrl || undefined,
    frame: {
      left: Math.round(Number(object.left || 0)),
      top: Math.round(Number(object.top || 0)),
      width,
      height,
      aspectRatio: resolveAspectRatioLabel(width, height),
    },
  };
}

export default class DesignerAiContextMenuPlugin implements IPluginTempl {
  static pluginName = 'DesignerAiContextMenuPlugin';

  constructor(public canvas: fabric.Canvas, public editor: IEditor) {}

  private getActiveObject() {
    return this.canvas.getActiveObject() as CanvasObject | null;
  }

  private emitAction(detail: DesignerAiQuickActionDetail) {
    const activeObject = this.getActiveObject();
    requestDesignerAiQuickAction({
      ...detail,
      objectId: String(activeObject?.id || ''),
      objectType: String(activeObject?.type || ''),
      referenceSnapshot: activeObject ? buildReferenceSnapshot(activeObject) : undefined,
    });
  }

  contextMenu() {
    const activeObject = this.getActiveObject();

    if (!activeObject || activeObject.id === 'workspace' || activeObject.type !== 'image') {
      return [];
    }

    return [
      null,
      {
        text: '发送到AI生图',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'send-to-ai-image',
            label: '发送到AI生图',
            category: 'edit',
            prompt: '',
          }),
      },
    ];
  }
}
