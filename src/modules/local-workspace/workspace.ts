import { debounce } from 'lodash-es';

import {
  getLocalDesign,
  saveLocalDesign,
  type LocalDesign,
  type SaveLocalDesignInput,
} from './store';

const CURRENT_DESIGN_ID_KEY = 'qiuai-designer.current-design-id';

type CanvasEditorLike = any;

type CaptureCanvasResult = {
  canvasJson: unknown;
  previewDataUrl: string;
  width: number;
  height: number;
};

type SaveCurrentDesignOptions = Partial<
  Pick<SaveLocalDesignInput, 'name' | 'templateId' | 'templateName'>
> & {
  forceNew?: boolean;
};

let autosaveSuspendCount = 0;

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeCanvasJson(rawJson: unknown) {
  if (typeof rawJson === 'string') {
    return JSON.parse(rawJson) as unknown;
  }

  return JSON.parse(JSON.stringify(rawJson || {})) as unknown;
}

function getCanvasObjects(canvasJson: unknown) {
  if (!canvasJson || typeof canvasJson !== 'object') {
    return [];
  }

  const candidate = canvasJson as { objects?: unknown[] };
  return Array.isArray(candidate.objects) ? candidate.objects : [];
}

function hasMeaningfulCanvasObjects(objects: unknown[]) {
  return objects.some((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    return String((item as { id?: string }).id || '') !== 'workspace';
  });
}

function getCanvasDimension(canvasJson: unknown, key: 'width' | 'height', fallback: number) {
  if (!canvasJson || typeof canvasJson !== 'object') {
    return fallback;
  }

  const value = Number((canvasJson as Record<string, unknown>)[key] || 0);
  return value > 0 ? value : fallback;
}

export function getCurrentLocalDesignId() {
  if (!canUseStorage()) {
    return '';
  }

  return String(window.localStorage.getItem(CURRENT_DESIGN_ID_KEY) || '').trim();
}

export function setCurrentLocalDesignId(id: string) {
  if (!canUseStorage()) {
    return;
  }

  const normalizedId = String(id || '').trim();
  if (!normalizedId) {
    window.localStorage.removeItem(CURRENT_DESIGN_ID_KEY);
    return;
  }

  window.localStorage.setItem(CURRENT_DESIGN_ID_KEY, normalizedId);
}

export function clearCurrentLocalDesignId() {
  setCurrentLocalDesignId('');
}

export async function captureCanvasDesign(
  canvasEditor: CanvasEditorLike
): Promise<CaptureCanvasResult | null> {
  const canvasJson = normalizeCanvasJson(canvasEditor.getJson());
  const objects = getCanvasObjects(canvasJson);

  if (!hasMeaningfulCanvasObjects(objects)) {
    return null;
  }

  let previewDataUrl = '';
  try {
    previewDataUrl = canvasEditor.preview ? await canvasEditor.preview() : '';
  } catch {
    previewDataUrl = '';
  }

  return {
    canvasJson,
    previewDataUrl,
    width: getCanvasDimension(canvasJson, 'width', canvasEditor.canvas?.getWidth?.() || 0),
    height: getCanvasDimension(canvasJson, 'height', canvasEditor.canvas?.getHeight?.() || 0),
  };
}

export async function saveCurrentDesign(
  canvasEditor: CanvasEditorLike,
  options: SaveCurrentDesignOptions = {}
) {
  const snapshot = await captureCanvasDesign(canvasEditor);
  if (!snapshot) {
    return null;
  }

  const currentId = options.forceNew ? '' : getCurrentLocalDesignId();
  const existing = currentId ? await getLocalDesign(currentId) : null;
  const savedDesign = await saveLocalDesign({
    ...snapshot,
    id: existing?.id,
    createdAt: existing?.createdAt,
    name: options.name || existing?.name,
    templateId: options.templateId || existing?.templateId || 'local-current',
    templateName: options.templateName || existing?.templateName || '',
  });

  setCurrentLocalDesignId(savedDesign.id);
  return savedDesign;
}

export async function loadLocalDesignToCanvas(canvasEditor: CanvasEditorLike, design: LocalDesign) {
  await runWithoutLocalDesignAutosave(() => {
    return new Promise<void>((resolve) => {
      canvasEditor.loadJSON(JSON.stringify(design.canvasJson), () => {
        canvasEditor.clearAndSaveState?.();
        setCurrentLocalDesignId(design.id);
        resolve();
      });
    });
  });
}

export async function runWithoutLocalDesignAutosave<T>(callback: () => Promise<T> | T) {
  autosaveSuspendCount += 1;
  try {
    return await callback();
  } finally {
    autosaveSuspendCount = Math.max(0, autosaveSuspendCount - 1);
  }
}

export function attachLocalDesignAutosave(canvasEditor: CanvasEditorLike) {
  const canvas = canvasEditor.canvas;
  if (!canvas?.on || !canvas?.off) {
    return () => undefined;
  }

  const saveOnChange = debounce(() => {
    if (autosaveSuspendCount > 0) {
      return;
    }

    void saveCurrentDesign(canvasEditor).catch(() => undefined);
  }, 2500);

  const handleChange = () => saveOnChange();
  const events = ['object:added', 'object:modified', 'object:removed', 'text:changed'];
  events.forEach((eventName) => canvas.on?.(eventName, handleChange));

  const handleBeforeUnload = () => {
    saveOnChange.flush();
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => {
    saveOnChange.cancel();
    events.forEach((eventName) => canvas.off?.(eventName, handleChange));
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}
