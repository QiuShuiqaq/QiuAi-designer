import { fabric } from 'fabric';
import type { IEditor, IPluginTempl } from '@kuaitu/core';

import { requestDesignerAiQuickAction } from './quick-actions';
import type { DesignerAiQuickActionDetail } from './quick-actions';

type CanvasObject = fabric.Object & {
  id?: string;
};

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

  private buildImageActions() {
    return [
      {
        text: '换背景/场景',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'image-scene',
            label: '换背景/场景',
            category: 'edit',
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
          }),
      },
      {
        text: '自由描述',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            label: '自由描述',
            category: 'edit',
            prompt: '',
          }),
      },
    ];
  }

  private buildTextActions() {
    return [
      {
        text: '重写文案',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'title-rewrite',
            label: '重写文案',
            category: 'edit',
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
          }),
      },
      {
        text: '自由描述',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            label: '自由描述',
            category: 'edit',
            prompt: '',
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
    const subitems = activeObject.type === 'image' ? this.buildImageActions() : [];

    if (isTextObject) {
      subitems.push(...this.buildTextActions());
    }

    if (!subitems.length) {
      subitems.push({
        text: '打开 AI 助手',
        hotkey: '',
        onclick: () =>
          this.emitAction({
            label: '自由描述',
            category: 'edit',
            prompt: '',
          }),
      });
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
