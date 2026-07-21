import { fabric } from 'fabric';
import type Editor from '@kuaitu/core';

import type {
  DesignerAiPatch,
  DesignerAiPatchAction,
  DesignerAiPatchAddObjectAction,
  DesignerAiPatchRemoveObjectAction,
  DesignerAiPatchReplaceImageAction,
  DesignerAiPatchUpdateStyleAction,
  DesignerAiPatchUpdateTextAction,
} from '@/platform/types';
import { createTransparentBackgroundDataUrl } from './background-cutout';

export interface DesignerAiPatchApplyError {
  targetId: string;
  reason: string;
}

export interface DesignerAiPatchApplyResult {
  applied: number;
  failed: number;
  errors: DesignerAiPatchApplyError[];
}

const STYLE_WHITELIST = new Set([
  'fill',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'textAlign',
  'opacity',
  'charSpacing',
  'lineHeight',
]);

function getCanvas(editor: Editor) {
  return editor.fabricCanvas as fabric.Canvas | null;
}

function findObjectById(canvas: fabric.Canvas, targetId: string) {
  return (
    canvas.getObjects().find((item: fabric.Object & { id?: string }) => item.id === targetId) ||
    null
  );
}

function isTextboxObject(object: fabric.Object) {
  return object.type === 'textbox' || object.type === 'i-text' || object.type === 'text';
}

function createError(targetId: string, reason: string): DesignerAiPatchApplyError {
  return { targetId, reason };
}

function isDataImageUrl(value: string) {
  return /^data:image\/[^;]+;base64,/i.test(String(value || '').trim());
}

function loadImageElement(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    image.src = sourceUrl;
  });
}

function exportImageObjectDataUrl(image: fabric.Image) {
  try {
    const dataUrl = String(
      image.toDataURL({
        format: 'png',
        multiplier: 1,
      }) || ''
    ).trim();
    return isDataImageUrl(dataUrl) ? dataUrl : '';
  } catch {
    return '';
  }
}

async function hasUsefulEdgeAlphaMask(maskDataUrl: string) {
  if (!maskDataUrl) {
    return false;
  }

  try {
    const image = await loadImageElement(maskDataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width || 1;
    canvas.height = image.naturalHeight || image.height || 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return false;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const edgeBand = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) * 0.04));
    let edgePixels = 0;
    let transparentEdgePixels = 0;

    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const isEdge =
          x < edgeBand ||
          y < edgeBand ||
          x >= canvas.width - edgeBand ||
          y >= canvas.height - edgeBand;
        if (!isEdge) {
          continue;
        }

        edgePixels += 1;
        if (data[(y * canvas.width + x) * 4 + 3] < 245) {
          transparentEdgePixels += 1;
        }
      }
    }

    return edgePixels > 0 && transparentEdgePixels / edgePixels >= 0.02;
  } catch {
    return false;
  }
}

async function applyAlphaMaskToImage(sourceUrl: string, maskDataUrl: string) {
  if (!maskDataUrl) {
    return sourceUrl;
  }

  try {
    const [sourceImage, maskImage] = await Promise.all([
      loadImageElement(sourceUrl),
      loadImageElement(maskDataUrl),
    ]);
    const canvas = document.createElement('canvas');
    canvas.width = sourceImage.naturalWidth || sourceImage.width || 1;
    canvas.height = sourceImage.naturalHeight || sourceImage.height || 1;
    const context = canvas.getContext('2d');
    if (!context) {
      return sourceUrl;
    }

    context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'destination-in';
    context.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';

    return canvas.toDataURL('image/png');
  } catch {
    return sourceUrl;
  }
}

function shouldAutoCutoutGeneratedImage(action: DesignerAiPatchReplaceImageAction) {
  const meta = action.meta || {};
  const actionKey = String(meta.actionKey || '').toLowerCase();
  const userPrompt = String(meta.userPrompt || '').toLowerCase();

  if (actionKey.includes('transparent') || actionKey.includes('cutout')) {
    return true;
  }

  return /透明|抠图|去底|去白底|去背景|transparent|cutout|remove background/.test(userPrompt);
}

function resolveImageReplacementFit(action: DesignerAiPatchReplaceImageAction) {
  return shouldAutoCutoutGeneratedImage(action) ? 'contain' : 'cover';
}

function resolveImageFrame(imageTarget: fabric.Image) {
  const width = Math.max(1, Number(imageTarget.get('width') || 1));
  const height = Math.max(1, Number(imageTarget.get('height') || 1));
  const scaleX = Number(imageTarget.get('scaleX') || 1) || 1;
  const scaleY = Number(imageTarget.get('scaleY') || 1) || 1;

  return {
    width,
    height,
    displayWidth: Math.max(1, Math.abs(width * scaleX)),
    displayHeight: Math.max(1, Math.abs(height * scaleY)),
    scaleSignX: scaleX < 0 ? -1 : 1,
    scaleSignY: scaleY < 0 ? -1 : 1,
    center: imageTarget.getCenterPoint(),
    clipPath: imageTarget.get('clipPath'),
  };
}

function fitImageIntoFrame(input: {
  imageTarget: fabric.Image;
  frame: ReturnType<typeof resolveImageFrame>;
  sourceWidth: number;
  sourceHeight: number;
  fit: 'cover' | 'contain';
  originSrc: string;
}) {
  const sourceWidth = Math.max(1, Number(input.sourceWidth) || 1);
  const sourceHeight = Math.max(1, Number(input.sourceHeight) || 1);

  if (input.fit === 'contain') {
    const scale = Math.min(
      input.frame.displayWidth / sourceWidth,
      input.frame.displayHeight / sourceHeight
    );
    input.imageTarget.set({
      width: sourceWidth,
      height: sourceHeight,
      cropX: 0,
      cropY: 0,
      scaleX: scale * input.frame.scaleSignX,
      scaleY: scale * input.frame.scaleSignY,
      clipPath: input.frame.clipPath,
      originSrc: input.originSrc,
    });
    input.imageTarget.setPositionByOrigin(input.frame.center, 'center', 'center');
    return;
  }

  const targetRatio = input.frame.displayWidth / input.frame.displayHeight;
  const sourceRatio = sourceWidth / sourceHeight;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  let cropX = 0;
  let cropY = 0;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    cropX = (sourceWidth - cropWidth) / 2;
  } else if (sourceRatio < targetRatio) {
    cropHeight = sourceWidth / targetRatio;
    cropY = (sourceHeight - cropHeight) / 2;
  }

  const scale = input.frame.displayWidth / Math.max(1, cropWidth);
  input.imageTarget.set({
    width: cropWidth,
    height: cropHeight,
    cropX,
    cropY,
    scaleX: scale * input.frame.scaleSignX,
    scaleY: scale * input.frame.scaleSignY,
    clipPath: input.frame.clipPath,
    originSrc: input.originSrc,
  });
  input.imageTarget.setPositionByOrigin(input.frame.center, 'center', 'center');
}

async function buildPostProcessedImageSrc(
  action: DesignerAiPatchReplaceImageAction,
  imageTarget: fabric.Image
) {
  const originalMaskDataUrl = exportImageObjectDataUrl(imageTarget);
  if (await hasUsefulEdgeAlphaMask(originalMaskDataUrl)) {
    return applyAlphaMaskToImage(action.src, originalMaskDataUrl);
  }

  if (shouldAutoCutoutGeneratedImage(action)) {
    return createTransparentBackgroundDataUrl(action.src);
  }

  return action.src;
}

async function applyReplaceImageAction(
  canvas: fabric.Canvas,
  action: DesignerAiPatchReplaceImageAction
) {
  const target = findObjectById(canvas, action.targetId);
  if (!target) {
    throw new Error('OBJECT_NOT_FOUND');
  }

  if (target.type !== 'image') {
    throw new Error('OBJECT_TYPE_NOT_SUPPORTED');
  }

  const imageTarget = target as fabric.Image & {
    id?: string;
    extensionType?: string;
    extension?: unknown;
    originSrc?: string;
  };
  const frame = resolveImageFrame(imageTarget);
  const fit = resolveImageReplacementFit(action);
  const nextSrc = await buildPostProcessedImageSrc(action, imageTarget);

  await new Promise<void>((resolve) => {
    imageTarget.setSrc(
      nextSrc,
      () => {
        fitImageIntoFrame({
          imageTarget,
          frame,
          sourceWidth: Number(imageTarget.get('width') || frame.width),
          sourceHeight: Number(imageTarget.get('height') || frame.height),
          fit,
          originSrc: nextSrc,
        });
        resolve();
      },
      { crossOrigin: 'anonymous' }
    );
  });
}

async function applyUpdateTextAction(
  canvas: fabric.Canvas,
  action: DesignerAiPatchUpdateTextAction
) {
  const target = findObjectById(canvas, action.targetId);
  if (!target) {
    throw new Error('OBJECT_NOT_FOUND');
  }

  if (!isTextboxObject(target)) {
    throw new Error('OBJECT_TYPE_NOT_SUPPORTED');
  }

  target.set('text', action.text);
}

async function applyUpdateStyleAction(
  canvas: fabric.Canvas,
  action: DesignerAiPatchUpdateStyleAction
) {
  const target = findObjectById(canvas, action.targetId);
  if (!target) {
    throw new Error('OBJECT_NOT_FOUND');
  }

  const nextProps = Object.entries(action.props || {}).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (STYLE_WHITELIST.has(key)) {
        acc[key] = value;
      }
      return acc;
    },
    {}
  );

  target.set(nextProps);
}

async function applyAddObjectAction(canvas: fabric.Canvas, action: DesignerAiPatchAddObjectAction) {
  const objectPayload = {
    ...action.object,
  };

  await new Promise<void>((resolve, reject) => {
    fabric.util.enlivenObjects([objectPayload], (objects) => {
      const [nextObject] = objects;
      if (!nextObject) {
        reject(new Error('OBJECT_CREATE_FAILED'));
        return;
      }

      if (action.afterTargetId) {
        const afterTarget = findObjectById(canvas, action.afterTargetId);
        const afterIndex = afterTarget ? canvas.getObjects().indexOf(afterTarget) : -1;
        if (afterIndex >= 0) {
          canvas.insertAt(nextObject, afterIndex + 1, false);
          resolve();
          return;
        }
      }

      canvas.add(nextObject);
      resolve();
    });
  });
}

async function applyRemoveObjectAction(
  canvas: fabric.Canvas,
  action: DesignerAiPatchRemoveObjectAction
) {
  const target = findObjectById(canvas, action.targetId);
  if (!target) {
    throw new Error('OBJECT_NOT_FOUND');
  }

  if ((target as fabric.Object & { id?: string }).id === 'workspace') {
    throw new Error('WORKSPACE_REMOVE_FORBIDDEN');
  }

  canvas.remove(target);
}

async function applySingleAction(canvas: fabric.Canvas, action: DesignerAiPatchAction) {
  if (action.type === 'replace-image-src') {
    await applyReplaceImageAction(canvas, action);
    return;
  }

  if (action.type === 'update-text') {
    await applyUpdateTextAction(canvas, action);
    return;
  }

  if (action.type === 'update-style') {
    await applyUpdateStyleAction(canvas, action);
    return;
  }

  if (action.type === 'add-object') {
    await applyAddObjectAction(canvas, action);
    return;
  }

  await applyRemoveObjectAction(canvas, action);
}

export async function applyDesignerAiPatch(
  editor: Editor,
  patch: DesignerAiPatch
): Promise<DesignerAiPatchApplyResult> {
  const canvas = getCanvas(editor);
  if (!canvas) {
    throw new Error('CANVAS_NOT_READY');
  }

  const errors: DesignerAiPatchApplyError[] = [];
  let applied = 0;

  for (const action of patch.actions || []) {
    const targetId =
      ('targetId' in action && action.targetId) ||
      ('afterTargetId' in action && action.afterTargetId) ||
      'unknown';

    try {
      await applySingleAction(canvas, action);
      applied += 1;
    } catch (error) {
      errors.push(
        createError(targetId, error instanceof Error ? error.message : 'PATCH_ACTION_FAILED')
      );
    }
  }

  canvas.renderAll();

  return {
    applied,
    failed: errors.length,
    errors,
  };
}
