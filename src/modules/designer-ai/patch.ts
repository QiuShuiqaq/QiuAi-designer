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
  const width = imageTarget.get('width');
  const height = imageTarget.get('height');
  const scaleX = imageTarget.get('scaleX') || 1;
  const scaleY = imageTarget.get('scaleY') || 1;

  await new Promise<void>((resolve) => {
    imageTarget.setSrc(
      action.src,
      () => {
        const nextWidth = imageTarget.get('width') || width || 1;
        const nextHeight = imageTarget.get('height') || height || 1;
        if (width && height) {
          imageTarget.set('scaleX', (width * scaleX) / nextWidth);
          imageTarget.set('scaleY', (height * scaleY) / nextHeight);
        }
        imageTarget.set('originSrc', action.src);
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
