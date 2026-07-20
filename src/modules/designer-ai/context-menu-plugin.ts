import { fabric } from 'fabric';
import type { IEditor, IPluginTempl } from '@kuaitu/core';

import { requestDesignerAiQuickAction } from './quick-actions';
import type { DesignerAiQuickActionDetail } from './quick-actions';

type CanvasObject = fabric.Object & {
  id?: string;
  name?: string;
  text?: string;
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

function buildSelectionContext(object: CanvasObject) {
  return `当前选中的${getObjectTypeLabel(object)}「${getObjectLabel(object)}」`;
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
    });
  }

  private buildImageActions(activeObject: CanvasObject) {
    const context = buildSelectionContext(activeObject);

    return [
      {
        text: '换背景/场景',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'image-scene',
            label: '换背景/场景',
            category: 'edit',
            prompt: `${context}，请替换背景或场景，保留主体、构图和比例关系，输出适合继续编辑的结果。`,
          }),
      },
      {
        text: '改材质配色',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'image-material',
            label: '改材质配色',
            category: 'edit',
            prompt: `${context}，请优化材质和配色，保持主体不变，尽量不要改动版式。`,
          }),
      },
      {
        text: '清理杂项',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'image-clean',
            label: '清理杂项',
            category: 'edit',
            prompt: `${context}，请清理杂项、噪点和干扰元素，尽量不改变主体。`,
          }),
      },
      {
        text: '自由描述',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            label: '自由描述',
            category: 'edit',
            prompt: `${context}，请继续描述修改需求，并先给出最稳妥的编辑方案。`,
          }),
      },
    ];
  }

  private buildTextActions(activeObject: CanvasObject) {
    const context = buildSelectionContext(activeObject);

    return [
      {
        text: '重写文案',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'title-rewrite',
            label: '重写文案',
            category: 'edit',
            prompt: `${context}，请重写文案，让表达更专业、更简洁，保留原意。`,
          }),
      },
      {
        text: '强化卖点',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'title-sell',
            label: '强化卖点',
            category: 'edit',
            prompt: `${context}，请强化卖点表达，提升转化感，适合海报排版。`,
          }),
      },
      {
        text: '压缩文案',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'body-compact',
            label: '压缩文案',
            category: 'edit',
            prompt: `${context}，请压缩文案，只保留核心信息，方便继续排版。`,
          }),
      },
      {
        text: '自由描述',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            label: '自由描述',
            category: 'edit',
            prompt: `${context}，请继续描述修改需求，并先给出可编辑的文案方案。`,
          }),
      },
    ];
  }

  private buildFallbackActions(activeObject: CanvasObject) {
    const context = buildSelectionContext(activeObject);

    return [
      {
        text: '打开 AI 助手',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            label: '打开 AI 助手',
            category: 'edit',
            prompt: `${context}，请基于当前图层进行 AI 编辑，优先保持版式稳定和可编辑性。`,
          }),
      },
    ];
  }

  contextMenu() {
    const activeObject = this.getActiveObject();
    if (!activeObject || activeObject.id === 'workspace') {
      return;
    }

    const isTextObject = activeObject.type === 'textbox' || activeObject.type === 'i-text';
    const subitems = activeObject.type === 'image' ? this.buildImageActions(activeObject) : [];

    if (isTextObject) {
      subitems.push(...this.buildTextActions(activeObject));
    }

    if (!subitems.length) {
      subitems.push(...this.buildFallbackActions(activeObject));
    }

    return [
      null,
      {
        text: 'AI 快捷操作',
        hotkey: '❯',
        subitems,
      },
    ];
  }
}
