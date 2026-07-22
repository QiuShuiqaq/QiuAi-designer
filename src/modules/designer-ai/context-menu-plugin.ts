import { fabric } from 'fabric';
import type { IEditor, IPluginTempl } from '@kuaitu/core';

import { formatDesignerAiCostBadge, resolveDesignerAiPointTierFromProfile } from './ai-points';
import { getDesignerAiBillingProfile } from './billing-profile';
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

  private getCanvasImagePointCost() {
    return resolveDesignerAiPointTierFromProfile(
      {
        width: this.canvas.getWidth(),
        height: this.canvas.getHeight(),
      },
      getDesignerAiBillingProfile()
    )?.aiPoints;
  }

  private withImageAiCost(text: string) {
    return `${text} · ${formatDesignerAiCostBadge(this.getCanvasImagePointCost())}`;
  }

  private withTextAiCost(text: string) {
    return `${text} · 服务端结算`;
  }

  private emitAction(detail: DesignerAiQuickActionDetail) {
    const activeObject = this.getActiveObject();
    requestDesignerAiQuickAction({
      ...detail,
      objectId: String(activeObject?.id || ''),
      objectType: String(activeObject?.type || ''),
    });
  }

  private buildGenerationActions() {
    return [
      {
        text: this.withImageAiCost('生成背景'),
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'generate-background',
            label: '生成背景',
            category: 'material',
            prompt:
              '请生成一张适合当前画布的背景图，风格干净统一，给主体和文字留出展示空间，不要添加文字、水印或边框。',
          }),
      },
      {
        text: this.withImageAiCost('生成元素'),
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'generate-element',
            label: '生成元素',
            category: 'material',
            prompt:
              '请生成一个可用于海报排版的独立设计元素或装饰素材，主体清晰，边缘干净，适合继续移动、缩放和组合。',
          }),
      },
      {
        text: this.withImageAiCost('生成艺术字'),
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'generate-art-text',
            label: '生成艺术字',
            category: 'material',
            prompt:
              '请生成一组适合海报标题使用的艺术字或字效元素，视觉醒目，边缘干净，适合继续排版。文字内容我可以继续补充。',
          }),
      },
    ];
  }

  private buildImageActions(activeObject: CanvasObject) {
    const context = buildSelectionContext(activeObject);

    return [
      {
        text: this.withImageAiCost('换背景/场景'),
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
        text: this.withImageAiCost('改材质配色'),
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
        text: this.withImageAiCost('清理杂项'),
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
        text: this.withImageAiCost('抠图透明底'),
        hotkey: '',
        onclick: () =>
          this.emitAction({
            actionKey: 'transparent-cutout',
            label: '抠图透明底',
            category: 'edit',
            prompt: `${context}，请处理成透明底素材，去除白底、杂色边缘和多余背景，保留主体轮廓、姿态和细节，输出适合继续排版的 PNG 风格结果。`,
          }),
      },
      {
        text: this.withImageAiCost('自由描述'),
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
        text: this.withTextAiCost('重写文案'),
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
        text: this.withTextAiCost('强化卖点'),
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
        text: this.withTextAiCost('压缩文案'),
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
        text: this.withTextAiCost('自由描述'),
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
      return [
        null,
        {
          text: 'AI 快捷操作',
          hotkey: '❯',
          subitems: this.buildGenerationActions(),
        },
      ];
    }

    const isTextObject = activeObject.type === 'textbox' || activeObject.type === 'i-text';
    const subitems = activeObject.type === 'image' ? this.buildImageActions(activeObject) : [];

    if (isTextObject) {
      subitems.push(...this.buildTextActions(activeObject));
    }

    if (!subitems.length) {
      subitems.push(...this.buildFallbackActions(activeObject));
    }

    subitems.push(...this.buildGenerationActions());

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
