<template>
  <section class="designer-ai-content" :class="{ 'designer-ai-content--embedded': embedded }">
    <div v-if="embedded" class="designer-ai-content__header">
      <div>
        <h3>AI 助手</h3>
        <p>按图层生成或改写内容，先出结果的部分会先应用到画布。</p>
      </div>
      <Button size="small" @click="refreshSlots" :disabled="isSubmitting || isPolling || isLoading">
        刷新图层
      </Button>
    </div>

    <div v-if="!platformReady" class="designer-ai-content__empty">
      <Alert type="warning" show-icon>
        <template #desc>
          未配置 `APP_PLATFORM_API_BASE_URL`，当前无法连接 `qiuai-platform`。
        </template>
      </Alert>
    </div>

    <div v-else class="designer-ai-content__body">
      <Spin fix v-if="isLoading" />

      <Alert v-if="errorMessage" type="error" show-icon>
        <template #desc>{{ errorMessage }}</template>
      </Alert>

      <Alert v-if="infoMessage" type="info" show-icon>
        <template #desc>{{ infoMessage }}</template>
      </Alert>

      <div v-if="embedded" class="designer-ai-content__overview">
        <div class="designer-ai-content__overview-card">
          <span>状态</span>
          <strong>{{ isActivated ? '可直接生成' : '需先激活' }}</strong>
          <small>{{ isActivated ? '平台授权已就绪' : '请先到“我的”完成激活' }}</small>
        </div>
        <div class="designer-ai-content__overview-card">
          <span>当前选择</span>
          <strong>{{ effectiveTargetCount }} / {{ maxTargetsPerJob }}</strong>
          <small v-if="isDirectImageMode">已切换到当前图片直改</small>
          <small v-else-if="selectedSlots.length">{{ enabledSlots.length }} 个图层可用</small>
          <small v-else>{{ enabledSlots.length }} 个图层可用</small>
        </div>
        <div class="designer-ai-content__overview-card">
          <span>背景模型</span>
          <strong>{{ defaultImageModel }}</strong>
          <small>{{ defaultImageSizeLabel }}</small>
        </div>
      </div>

      <div v-if="!embedded" class="designer-ai-content__summary">
        <div class="designer-ai-content__summary-card">
          <span>模板</span>
          <strong>{{ templateId }}</strong>
        </div>
        <div class="designer-ai-content__summary-card">
          <span>AI 图层</span>
          <strong>{{ slots.length }}</strong>
        </div>
        <div class="designer-ai-content__summary-card">
          <span>可用目标</span>
          <strong>{{ isDirectImageMode ? 1 : enabledSlots.length }}</strong>
        </div>
        <div class="designer-ai-content__summary-card">
          <span>背景模型</span>
          <strong>{{ defaultImageModel }}</strong>
          <small>{{ defaultImageSizeLabel }}</small>
        </div>
      </div>

      <Form :label-width="88">
        <FormItem label="语言">
          <Select v-model="language">
            <Option v-for="lang in supportedLanguages" :key="lang" :value="lang">
              {{ lang }}
            </Option>
          </Select>
        </FormItem>

        <FormItem label="提示词">
          <Input
            v-model="prompt"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            placeholder="描述你想生成或调整的背景、标题、卖点、按钮文案等内容"
          />
        </FormItem>

        <FormItem label="快捷意图">
          <div class="designer-ai-content__presets">
            <Button
              v-for="preset in promptPresets"
              :key="preset.label"
              size="small"
              @click="applyPromptPreset(preset.prompt)"
            >
              {{ preset.label }}
            </Button>
          </div>
        </FormItem>

        <FormItem label="智能模式">
          <div class="designer-ai-content__agent">
            <Checkbox v-model="autoTargeting">自动识别目标图层</Checkbox>
            <span class="designer-ai-content__agent-tip">{{ agentTip }}</span>
            <Button
              size="small"
              @click="applySuggestedTargets"
              :disabled="!enabledSlots.length || isDirectImageMode"
            >
              重新识别
            </Button>
          </div>
        </FormItem>

        <FormItem label="目标">
          <div
            v-if="isDirectImageMode && directImageSelection"
            class="designer-ai-content__direct-target"
          >
            <strong>{{ directImageSelection.label }}</strong>
            <span>ID：{{ directImageSelection.id }}</span>
            <span>
              尺寸：{{ Math.round(directImageSelection.width) }} ×
              {{ Math.round(directImageSelection.height) }}
            </span>
            <small>将直接替换当前图片图层内容，位置和尺寸保持不变。</small>
          </div>
          <div v-else-if="enabledSlots.length" class="designer-ai-content__targets">
            <label v-for="slot in enabledSlots" :key="slot.id" class="designer-ai-content__target">
              <Checkbox
                :model-value="selectedSlotIds.includes(slot.id)"
                @on-change="toggleSlot(slot.id, $event)"
              />
              <div class="designer-ai-content__target-meta">
                <strong>{{ slot.slotName }}</strong>
                <span>{{ slot.role }} / {{ slot.aiMode }}</span>
              </div>
            </label>
          </div>
          <Alert v-else type="warning" show-icon>
            <template #desc>
              当前画布没有可识别的 AI 图层。请先选择一个图片图层，或使用带 AI 图层定义的模板。
            </template>
          </Alert>
        </FormItem>
      </Form>

      <div v-if="currentJob" class="designer-ai-content__job">
        <div class="designer-ai-content__job-head">
          <strong>当前任务</strong>
          <Tag :color="jobStatusColor">{{ currentJob.status }}</Tag>
        </div>
        <div class="designer-ai-content__job-meta">
          <span>任务 ID：{{ currentJob.jobId }}</span>
          <span>队列位置：{{ currentJob.queuePosition }}</span>
          <span>更新时间：{{ formatTime(currentJob.updatedAt) }}</span>
        </div>
        <div v-if="currentJob.error" class="designer-ai-content__job-error">
          {{ formatErrorMessage(currentJob.error, '任务执行失败') }}
        </div>
      </div>

      <div class="designer-ai-content__actions">
        <Button v-if="!embedded" @click="refreshSlots" :disabled="isSubmitting || isPolling">
          刷新图层
        </Button>
        <Button v-if="canCancelJob" @click="cancelJob" :loading="isCancelling">取消任务</Button>
        <Button type="primary" :loading="isSubmitting" :disabled="!canSubmit" @click="submitJob">
          生成并应用
        </Button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts" name="DesignerAiContent">
import { Message } from 'view-ui-plus';
import { useRoute } from 'vue-router';

import useSelect from '@/hooks/select';
import { applyDesignerAiPatch } from '@/modules/designer-ai/patch';
import { isPlatformApiConfigured } from '@/platform/config';
import {
  cancelDesignerAiJob,
  createDesignerAiJob,
  getDesignerAiCapabilities,
  getDesignerAiJob,
  parseDesignerAiTemplateSlots,
} from '@/platform/designer-ai';
import { getPlatformActivationStatus } from '@/platform/session';
import type {
  DesignerAiCapabilities,
  DesignerAiJob,
  DesignerAiMode,
  DesignerAiTargetRole,
  DesignerAiTemplateSlot,
  DesignerAiTemplateSlotsPayload,
  PlatformActivationStatus,
} from '@/platform/types';

defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
});

type DirectImageSelection = {
  id: string;
  label: string;
  role: DesignerAiTargetRole;
  mode: DesignerAiMode;
  width: number;
  height: number;
  sourceUrl: string;
};

const route = useRoute();
const { canvasEditor, getObjectAttr } = useSelect();

const platformReady = isPlatformApiConfigured();
const isLoading = ref(false);
const isSubmitting = ref(false);
const isPolling = ref(false);
const isCancelling = ref(false);
const errorMessage = ref('');
const infoMessage = ref('');
const prompt = ref('');
const language = ref('zh-CN');
const autoTargeting = ref(true);
const capabilities = ref<DesignerAiCapabilities | null>(null);
const parsedSlots = ref<DesignerAiTemplateSlotsPayload | null>(null);
const selectedSlotIds = ref<string[]>([]);
const currentJob = ref<DesignerAiJob | null>(null);
const activationStatus = ref<PlatformActivationStatus | null>(null);
const directImageSelection = ref<DirectImageSelection | null>(null);

let pollingTimer: ReturnType<typeof setTimeout> | null = null;

const promptPresets = [
  {
    label: '改背景',
    prompt: '请生成一个更符合当前主题的背景，保留主体展示空间，提升整体质感。',
  },
  {
    label: '主标题',
    prompt: '请根据当前画面主题生成更有吸引力的主标题和副标题。',
  },
  {
    label: '卖点文案',
    prompt: '请补充简洁明确的卖点文案，适合电商或宣传海报使用。',
  },
  {
    label: '按钮文案',
    prompt: '请优化按钮和行动引导文案，让转化意图更明确。',
  },
  {
    label: '整体优化',
    prompt: '请结合当前模板，对背景、标题和文案进行整体优化，保持版式清晰。',
  },
];

const supportedLanguages = computed(() => {
  if (capabilities.value?.supportedLanguages?.length) {
    return capabilities.value.supportedLanguages;
  }
  return ['zh-CN', 'en-US'];
});

const templateId = computed(() => {
  const routeTemplateId = String(route.query.tempId || route.query.id || '').trim();
  return routeTemplateId || 'local-current';
});

const slots = computed(() => parsedSlots.value?.slots || []);
const enabledSlots = computed(() => slots.value.filter((slot) => slot.aiEnabled));
const maxTargetsPerJob = computed(() => Math.max(1, capabilities.value?.maxTargetsPerJob || 4));
const selectedSlots = computed(() =>
  enabledSlots.value.filter((slot) => selectedSlotIds.value.includes(slot.id))
);
const hasDirectImageSelection = computed(() => Boolean(directImageSelection.value));
const isDirectImageMode = computed(() => hasDirectImageSelection.value);
const effectiveTargetCount = computed(() => {
  if (isDirectImageMode.value) {
    return 1;
  }
  return selectedSlots.value.length;
});
const defaultImageModel = computed(() => {
  return String(capabilities.value?.defaultImageModel || 'nano-banana-2').trim() || 'nano-banana-2';
});
const defaultImageSizeLabel = computed(() => {
  const defaultSize = String(capabilities.value?.defaultImageSize || '2K').trim() || '2K';
  const supportedSizes = Array.isArray(capabilities.value?.supportedImageSizes)
    ? capabilities.value.supportedImageSizes.filter((item) => String(item || '').trim())
    : [];
  const sizesLabel = supportedSizes.length ? supportedSizes.join(' / ') : '1K / 2K / 4K';
  const modeLabel = capabilities.value?.mockEnabled ? 'Mock' : 'Provider';
  return `${defaultSize} 默认 · ${sizesLabel} · ${modeLabel}`;
});
const isActivated = computed(() => {
  return (
    activationStatus.value?.status === 'activated' &&
    Boolean(activationStatus.value?.canUseApp) &&
    Boolean(activationStatus.value?.sessionToken)
  );
});

const agentSuggestion = computed(() => buildSuggestedTargets(enabledSlots.value, prompt.value));
const agentTip = computed(() => {
  if (directImageSelection.value) {
    return `已选中图片图层：${directImageSelection.value.label}，生成结果将直接替换当前图片。`;
  }

  if (!enabledSlots.value.length) {
    return '当前画布还没有可生成的 AI 图层。';
  }

  if (!agentSuggestion.value.slots.length) {
    return '未识别到明确意图，默认优先背景和标题图层。';
  }

  return `已识别：${agentSuggestion.value.slots.map((slot) => slot.slotName).join('、')}`;
});

const canSubmit = computed(() => {
  return Boolean(
    platformReady &&
      isActivated.value &&
      prompt.value.trim() &&
      (isDirectImageMode.value || selectedSlots.value.length) &&
      !isSubmitting.value &&
      !isPolling.value
  );
});

const canCancelJob = computed(() => {
  const status = currentJob.value?.status;
  return status === 'queued' || status === 'running';
});

const jobStatusColor = computed(() => {
  const status = currentJob.value?.status || '';
  if (status === 'succeeded') return 'success';
  if (status === 'partial_success') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'error';
  return 'primary';
});

function clearPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

function normalizeCanvasJson() {
  const rawJson = canvasEditor.getJson();
  if (typeof rawJson === 'string') {
    return JSON.parse(rawJson) as {
      width?: number;
      height?: number;
      objects?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
  }

  if (rawJson && typeof rawJson === 'object') {
    return rawJson as {
      width?: number;
      height?: number;
      objects?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    };
  }

  throw new Error('当前画布数据不可用，请先创建或打开一个模板。');
}

function getCanvasSnapshot() {
  const parsed = normalizeCanvasJson();

  return {
    width: Number(parsed.width || canvasEditor.canvas?.getWidth?.() || 0),
    height: Number(parsed.height || canvasEditor.canvas?.getHeight?.() || 0),
    snapshot: {
      meta: {
        templateVersion: 1,
        scene: 'poster',
      },
      objects: Array.isArray(parsed.objects) ? parsed.objects : [],
    },
  };
}

function getKeywordMap() {
  return {
    background: ['背景', '底图', '主图', 'scene', 'background', 'bg'],
    title: ['标题', '主标题', 'headline', 'title', 'slogan'],
    subtitle: ['副标题', 'subheading', 'subtitle', '卖点'],
    'body-text': ['文案', '描述', '说明', 'body', 'copy'],
    cta: ['按钮', '行动', '下单', '立即', '咨询', 'cta', 'button'],
    price: ['价格', '售价', '优惠', 'price'],
    'product-image': ['商品图', '产品图', '主体', 'product'],
    logo: ['logo', '品牌', '标志'],
    decoration: ['装饰', '图标', 'icon', '点缀', '线条'],
  } as const;
}

function buildSuggestedTargets(nextSlots: DesignerAiTemplateSlot[], promptValue: string) {
  const normalizedPrompt = promptValue.trim().toLowerCase();
  const keywordMap = getKeywordMap();
  const matchedRoles = new Set<string>();

  Object.entries(keywordMap).forEach(([role, keywords]) => {
    if (keywords.some((keyword) => normalizedPrompt.includes(keyword.toLowerCase()))) {
      matchedRoles.add(role);
    }
  });

  const priorityRoles = ['background', 'title', 'subtitle', 'body-text', 'cta', 'price'];
  const rankedSlots = [...nextSlots].sort((a, b) => {
    return priorityRoles.indexOf(a.role) - priorityRoles.indexOf(b.role);
  });

  const explicitMatches = rankedSlots.filter((slot) => matchedRoles.has(slot.role));
  const fallbackMatches = rankedSlots.filter((slot) => !matchedRoles.has(slot.role));
  const merged = [...explicitMatches, ...fallbackMatches].slice(0, maxTargetsPerJob.value);

  return {
    ids: merged.map((slot) => slot.id),
    slots: merged,
  };
}

function syncSuggestedTargets(force = false) {
  if (!enabledSlots.value.length) {
    selectedSlotIds.value = [];
    return;
  }

  if (!autoTargeting.value && !force) {
    return;
  }

  const suggestion = buildSuggestedTargets(enabledSlots.value, prompt.value);
  selectedSlotIds.value = suggestion.ids;
}

async function loadActivationStatus() {
  activationStatus.value = await getPlatformActivationStatus();
}

async function loadCapabilities() {
  capabilities.value = await getDesignerAiCapabilities();
  if (!supportedLanguages.value.includes(language.value)) {
    language.value = supportedLanguages.value[0] || 'zh-CN';
  }
}

function formatErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message || fallback;
    if (/timeout/i.test(message)) {
      return '请求超时，请稍后重试，或减少本次生成的目标图层数量。';
    }
    if (/network/i.test(message) || /ERR_NETWORK/i.test(message)) {
      return '网络不可用，请检查平台地址、服务端状态或本机网络连接。';
    }
    return message;
  }

  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>;
    if (typeof errorRecord.message === 'string' && errorRecord.message.trim()) {
      return errorRecord.message;
    }

    try {
      return JSON.stringify(errorRecord);
    } catch {
      return fallback;
    }
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}

function getActiveImageObject() {
  const activeObject = canvasEditor.canvas?.getActiveObject?.() as
    | ({
        id?: string;
        type?: string;
        text?: string;
        originSrc?: string;
        getSrc?: () => string;
        get?: (key: string) => unknown;
      } & Record<string, unknown>)
    | null;

  if (!activeObject || activeObject.type !== 'image' || !activeObject.id) {
    return null;
  }

  const sourceUrl =
    String(activeObject.originSrc || '').trim() ||
    String(activeObject.getSrc?.() || '').trim() ||
    String(activeObject.get?.('src') || '').trim();

  return {
    id: String(activeObject.id),
    label: String(activeObject.get?.('name') || activeObject.text || '图片').trim() || '图片',
    role: 'product-image' as const,
    mode: 'image-edit' as const,
    width: Number(activeObject.get?.('width') || 0),
    height: Number(activeObject.get?.('height') || 0),
    sourceUrl,
  };
}

function syncDirectImageSelection() {
  directImageSelection.value = getActiveImageObject();
}

function buildDirectImageEditRequest(input: {
  width: number;
  height: number;
  snapshot: {
    meta?: Record<string, unknown>;
    objects?: Array<Record<string, unknown>>;
  };
}) {
  const selectedImage = directImageSelection.value;
  if (!selectedImage) {
    throw new Error('请先选择一个图片图层。');
  }

  const snapshotObjects = Array.isArray(input.snapshot.objects) ? input.snapshot.objects : [];
  let matched = false;
  const templateSnapshot = {
    ...input.snapshot,
    objects: snapshotObjects.map((item) => {
      if (!item || item.id !== selectedImage.id) {
        return item;
      }

      matched = true;
      const extension = item.extension && typeof item.extension === 'object' ? item.extension : {};
      return {
        ...item,
        src: selectedImage.sourceUrl || item.src,
        originSrc: selectedImage.sourceUrl || item.originSrc || item.src,
        extensionType: 'ai-slot',
        extension: {
          ...extension,
          role: selectedImage.role,
          slotName: selectedImage.label,
          aiEnabled: true,
          aiMode: selectedImage.mode,
          editableAfterGenerate: true,
          regenerateScope: 'self',
          constraints: {
            editableSource: 'selected-image',
          },
        },
      };
    }),
  };

  if (!matched) {
    throw new Error('当前选中的图片图层未能写入 AI 请求，请重新选择后再试。');
  }

  return {
    templateId: templateId.value || 'direct-image-edit',
    language: language.value,
    userPrompt: prompt.value.trim(),
    targets: [
      {
        slotId: selectedImage.id,
        role: selectedImage.role,
        mode: selectedImage.mode,
      },
    ],
    canvas: {
      width: input.width,
      height: input.height,
    },
    templateSnapshot,
  };
}

async function refreshSlots() {
  errorMessage.value = '';
  infoMessage.value = '';
  syncDirectImageSelection();

  try {
    const { snapshot } = getCanvasSnapshot();
    const nextParsedSlots = await parseDesignerAiTemplateSlots({
      templateId: templateId.value,
      templateSnapshot: snapshot,
    });

    parsedSlots.value = nextParsedSlots;
    syncSuggestedTargets(true);

    if (!nextParsedSlots.slots.length) {
      infoMessage.value = directImageSelection.value
        ? '当前模板没有 AI 槽位，已切换为“当前图片直改”模式。'
        : '当前画布没有识别到 AI 图层。请先选择一个图片图层，或使用带 AI 图层定义的模板。';
      return;
    }

    if (!nextParsedSlots.slots.some((slot) => slot.aiEnabled)) {
      infoMessage.value = '当前模板存在 AI 图层定义，但没有启用可生成目标。';
    }
  } catch (error) {
    errorMessage.value = formatErrorMessage(error, '图层解析失败');
  }
}

function toggleSlot(slotId: string, checked: boolean) {
  autoTargeting.value = false;

  if (checked) {
    if (!selectedSlotIds.value.includes(slotId)) {
      selectedSlotIds.value = [...selectedSlotIds.value, slotId];
    }
    return;
  }

  selectedSlotIds.value = selectedSlotIds.value.filter((id) => id !== slotId);
}

function applySuggestedTargets() {
  autoTargeting.value = true;
  syncSuggestedTargets(true);
}

function applyPromptPreset(nextPrompt: string) {
  prompt.value = nextPrompt;
  autoTargeting.value = true;
  syncSuggestedTargets(true);
}

function formatTime(value: string) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

async function applyJobResult(job: DesignerAiJob) {
  if (!job.result) {
    return;
  }

  const result = await applyDesignerAiPatch(canvasEditor, job.result);
  canvasEditor.clearAndSaveState();

  if (result.failed > 0) {
    Message.warning(`AI 已应用部分结果，成功 ${result.applied}，失败 ${result.failed}`);
    return;
  }

  Message.success(`AI 已应用 ${result.applied} 项修改`);
}

async function pollJob(jobId: string) {
  isPolling.value = true;
  clearPolling();

  const run = async () => {
    try {
      const job = await getDesignerAiJob(jobId);
      currentJob.value = job;

      if (job.status === 'succeeded' || job.status === 'partial_success') {
        isPolling.value = false;
        await applyJobResult(job);
        return;
      }

      if (job.status === 'failed' || job.status === 'cancelled') {
        isPolling.value = false;
        if (job.error?.message) {
          errorMessage.value = job.error.message;
        }
        return;
      }

      pollingTimer = setTimeout(run, 1500);
    } catch (error) {
      isPolling.value = false;
      errorMessage.value = formatErrorMessage(error, '任务轮询失败');
    }
  };

  await run();
}

async function submitJob() {
  if (!canSubmit.value) {
    if (!isActivated.value) {
      errorMessage.value = '当前设备未激活，无法提交 AI 任务。请先在“我的”中完成授权激活。';
    }
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';
  infoMessage.value = '';

  try {
    const { width, height, snapshot } = getCanvasSnapshot();
    const response = await createDesignerAiJob(
      isDirectImageMode.value
        ? buildDirectImageEditRequest({
            width,
            height,
            snapshot,
          })
        : {
            templateId: templateId.value,
            language: language.value,
            userPrompt: prompt.value.trim(),
            targets: selectedSlots.value.map((slot) => ({
              slotId: slot.id,
              role: slot.role,
              mode: slot.aiMode,
            })),
            canvas: {
              width,
              height,
            },
            templateSnapshot: snapshot,
          }
    );

    currentJob.value = await getDesignerAiJob(response.jobId);
    await pollJob(response.jobId);
  } catch (error) {
    errorMessage.value = formatErrorMessage(error, '任务创建失败');
  } finally {
    isSubmitting.value = false;
  }
}

async function cancelJob() {
  if (!currentJob.value?.jobId) {
    return;
  }

  isCancelling.value = true;
  try {
    await cancelDesignerAiJob(currentJob.value.jobId);
    clearPolling();
    currentJob.value = await getDesignerAiJob(currentJob.value.jobId);
    isPolling.value = false;
    Message.info('任务已取消');
  } catch (error) {
    Message.error(formatErrorMessage(error, '取消任务失败'));
  } finally {
    isCancelling.value = false;
  }
}

async function bootstrap() {
  if (!platformReady) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  infoMessage.value = '';

  try {
    await loadActivationStatus();
    await loadCapabilities();
    await refreshSlots();
    if (!isActivated.value) {
      infoMessage.value = '当前设备未激活。AI 功能可先浏览图层，真正生成前需要先到“我的”完成激活。';
    }
  } catch (error) {
    errorMessage.value = formatErrorMessage(error, 'AI 面板初始化失败');
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => prompt.value,
  () => {
    syncSuggestedTargets();
  }
);

watch(
  () => enabledSlots.value.map((slot) => slot.id).join('|'),
  () => {
    syncSuggestedTargets();
  }
);

onMounted(() => {
  getObjectAttr(syncDirectImageSelection);
  canvasEditor.canvas?.on('object:modified', syncDirectImageSelection);
  syncDirectImageSelection();
  bootstrap();
});

onBeforeUnmount(() => {
  canvasEditor.canvas?.off('object:modified', syncDirectImageSelection);
  clearPolling();
});
</script>

<style scoped lang="less">
.designer-ai-content {
  position: relative;
}

.designer-ai-content--embedded {
  padding: 4px 0 16px;
}

.designer-ai-content__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.designer-ai-content__header h3 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.designer-ai-content__header p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.designer-ai-content__body {
  position: relative;
  min-height: 260px;
}

.designer-ai-content--embedded .designer-ai-content__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.designer-ai-content__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.designer-ai-content__overview,
.designer-ai-content__summary-card,
.designer-ai-content__job,
.designer-ai-content__overview-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.designer-ai-content__overview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.designer-ai-content__overview-card {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.designer-ai-content__overview-card span,
.designer-ai-content__overview-card small {
  color: #667085;
  font-size: 12px;
}

.designer-ai-content__overview-card strong {
  color: #111827;
  word-break: break-word;
}

.designer-ai-content__summary-card {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.designer-ai-content__summary-card span {
  color: #667085;
  font-size: 12px;
}

.designer-ai-content__summary-card strong {
  color: #111827;
  word-break: break-all;
}

.designer-ai-content__agent {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.designer-ai-content--embedded .designer-ai-content__agent {
  align-items: flex-start;
}

.designer-ai-content__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.designer-ai-content__agent-tip {
  color: #667085;
  font-size: 12px;
}

.designer-ai-content__targets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.designer-ai-content__target {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  cursor: pointer;
}

.designer-ai-content__target-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.designer-ai-content__target-meta strong {
  color: #111827;
}

.designer-ai-content__target-meta span {
  color: #667085;
  font-size: 12px;
}

.designer-ai-content__direct-target {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.designer-ai-content__direct-target strong {
  color: #111827;
}

.designer-ai-content__direct-target span,
.designer-ai-content__direct-target small {
  color: #667085;
  font-size: 12px;
}

.designer-ai-content__job {
  margin-top: 18px;
  padding: 14px 16px;
}

.designer-ai-content__job-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.designer-ai-content__job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #475467;
  font-size: 12px;
}

.designer-ai-content__job-error {
  margin-top: 10px;
  color: #b42318;
}

.designer-ai-content__actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.designer-ai-content--embedded .designer-ai-content__actions {
  justify-content: stretch;
  flex-direction: column;
}

.designer-ai-content--embedded .designer-ai-content__actions .ivu-btn {
  width: 100%;
}

.designer-ai-content__empty {
  padding: 8px 0;
}

.designer-ai-content--embedded .designer-ai-content__overview,
.designer-ai-content--embedded .designer-ai-content__summary,
.designer-ai-content--embedded .designer-ai-content__targets {
  grid-template-columns: 1fr;
}

.designer-ai-content--embedded .designer-ai-content__overview-card,
.designer-ai-content--embedded .designer-ai-content__summary-card,
.designer-ai-content--embedded .designer-ai-content__direct-target,
.designer-ai-content--embedded .designer-ai-content__target,
.designer-ai-content--embedded .designer-ai-content__job {
  padding: 14px;
}

.designer-ai-content--embedded .designer-ai-content__job-meta {
  flex-direction: column;
  align-items: flex-start;
}

@media (max-width: 900px) {
  .designer-ai-content__overview,
  .designer-ai-content__summary,
  .designer-ai-content__targets {
    grid-template-columns: 1fr;
  }
}
</style>
