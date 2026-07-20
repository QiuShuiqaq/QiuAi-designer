import type {
  DesignerAiTargetRole,
  DesignerAiTemplateSlot,
  DesignerAiTemplateSlotsPayload,
} from '@/platform/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readBoolean(input: Record<string, unknown>, key: string, fallback = false) {
  const value = input[key];
  return typeof value === 'boolean' ? value : fallback;
}

function readObject(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return isRecord(value) ? value : {};
}

function normalizeRole(value: string): DesignerAiTargetRole | null {
  const allowed = new Set<DesignerAiTargetRole>([
    'background',
    'title',
    'subtitle',
    'body-text',
    'cta',
    'price',
    'product-image',
    'logo',
    'decoration',
  ]);

  return allowed.has(value as DesignerAiTargetRole) ? (value as DesignerAiTargetRole) : null;
}

function inferSlotName(role: DesignerAiTargetRole, fallback: string) {
  if (fallback) {
    return fallback;
  }

  const mapping: Record<DesignerAiTargetRole, string> = {
    background: '主背景',
    title: '主标题',
    subtitle: '副标题',
    'body-text': '正文',
    cta: '按钮文案',
    price: '价格',
    'product-image': '商品图',
    logo: 'Logo',
    decoration: '装饰层',
  };

  return mapping[role];
}

function inferMode(role: DesignerAiTargetRole) {
  if (role === 'background') {
    return 'image-generate' as const;
  }

  if (['title', 'subtitle', 'body-text', 'cta', 'price'].includes(role)) {
    return 'text-generate' as const;
  }

  return 'layout-suggest' as const;
}

export function extractDesignerAiTemplateSlots(input: {
  templateId?: string;
  templateSnapshot: {
    meta?: Record<string, unknown>;
    objects: Array<Record<string, unknown>>;
  };
}): DesignerAiTemplateSlotsPayload {
  const slots: DesignerAiTemplateSlot[] = input.templateSnapshot.objects
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      if (readString(item, 'extensionType') !== 'ai-slot') {
        return null;
      }

      const extension = readObject(item, 'extension');
      const role = normalizeRole(readString(extension, 'role'));
      const id = readString(item, 'id');
      const objectType = readString(item, 'type');

      if (!role || !id || !objectType) {
        return null;
      }

      return {
        id,
        role,
        slotName: inferSlotName(role, readString(extension, 'slotName')),
        objectType,
        aiEnabled: readBoolean(extension, 'aiEnabled', false),
        aiMode: (readString(extension, 'aiMode') ||
          inferMode(role)) as DesignerAiTemplateSlot['aiMode'],
        editableAfterGenerate: readBoolean(extension, 'editableAfterGenerate', true),
        regenerateScope:
          (readString(extension, 'regenerateScope') as 'self' | 'group' | 'none') || 'self',
        constraints: readObject(extension, 'constraints'),
      } satisfies DesignerAiTemplateSlot;
    })
    .filter((item): item is DesignerAiTemplateSlot => Boolean(item));

  return {
    templateId: input.templateId || '',
    templateVersion: Number(input.templateSnapshot.meta?.templateVersion || 1),
    scene: String(input.templateSnapshot.meta?.scene || 'poster'),
    slots,
  };
}
