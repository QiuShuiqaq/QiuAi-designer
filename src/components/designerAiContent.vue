<template>
  <section class="designer-ai-content" :class="{ 'designer-ai-content--embedded': embedded }">
    <div v-if="embedded && showHeader" class="designer-ai-content__header">
      <div class="designer-ai-content__header-main">
        <h3>{{ panelTitle }}</h3>
        <p v-if="panelSubtitle">{{ panelSubtitle }}</p>
      </div>
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

      <div v-if="isToolMode" class="designer-ai-content__tool">
        <section class="designer-ai-content__tool-card">
          <div class="designer-ai-content__tool-card-head">
            <strong>参考图</strong>
            <Button
              v-if="toolReferenceSelection"
              size="small"
              type="text"
              @click="clearToolReference"
            >
              清除
            </Button>
          </div>

          <div v-if="toolReferenceSelection" class="designer-ai-content__reference">
            <img
              v-if="toolReferencePreviewSrc"
              :src="toolReferencePreviewSrc"
              alt="AI 生图参考图"
            />
            <div class="designer-ai-content__reference-meta">
              <strong>{{ toolReferenceSelection.label }}</strong>
              <span>{{ toolReferenceMetaText }}</span>
            </div>
          </div>

          <div v-else class="designer-ai-content__reference-empty">
            <strong>未设置参考图</strong>
            <span>在画布图片上右键，选择“发送到AI生图”，可固定当前图片作为参考。</span>
          </div>
        </section>

        <section class="designer-ai-content__tool-card">
          <div class="designer-ai-content__tool-card-head">
            <strong>提示词输入</strong>
            <div class="designer-ai-content__tool-card-tags">
              <Tag color="primary">{{ toolModeLabel }}</Tag>
              <Tag color="primary">{{ canvasImageSize }}</Tag>
              <Tag v-if="designerAiCostPreview" color="primary">
                {{ formatDesignerAiCostBadge(designerAiCostPreview.points) }}
              </Tag>
            </div>
          </div>

          <Input
            v-model="prompt"
            type="textarea"
            :autosize="{ minRows: 6, maxRows: 10 }"
            placeholder="直接描述要生成或修改的画面。例如：把蛋糕换成蓝莓蛋糕；或生成一张春季海报背景。"
          />

          <div class="designer-ai-content__tool-actions">
            <small>{{ designerAiBillingHint }}</small>
            <div>
              <Button v-if="canCancelJob" :loading="isCancelling" @click="cancelJob">取消</Button>
              <Button
                type="primary"
                :disabled="!canSubmit"
                :loading="isSubmitting || isPolling"
                @click="submitJob"
              >
                {{ designerAiSubmitLabel }}
              </Button>
            </div>
          </div>
        </section>

        <section
          v-if="currentJob || generatedImageResults.length"
          class="designer-ai-content__tool-card"
        >
          <div class="designer-ai-content__tool-card-head">
            <strong>结果</strong>
            <Tag v-if="currentJob" :color="jobStatusColor">{{ currentJob.status }}</Tag>
          </div>

          <div v-if="currentJob" class="designer-ai-content__job-progress">
            <div class="designer-ai-content__job-progress-head">
              <div>
                <strong>{{ jobProgressStageLabel }}</strong>
              </div>
              <span>{{ jobProgressPercent }}%</span>
            </div>
            <Progress
              :percent="jobProgressPercent"
              :stroke-width="6"
              :status="jobProgressBarStatus"
              hide-info
            />
            <div class="designer-ai-content__job-progress-meta">
              <span>已用：{{ jobElapsedText }}</span>
              <span>预计：{{ jobEstimateText }}</span>
            </div>
            <p>{{ jobProgressDescription }}</p>
          </div>

          <div v-if="generatedImageResults.length" class="designer-ai-content__result-grid">
            <div
              v-for="item in generatedImageResults"
              :key="item.id"
              class="designer-ai-content__result-card"
            >
              <img :src="item.src" alt="AI 生成结果" />
              <span>{{ item.label }}</span>
            </div>
          </div>
        </section>
      </div>

      <div v-else class="designer-ai-content__chat">
        <div ref="messagesRef" class="designer-ai-content__messages">
          <div
            v-for="message in conversationMessages"
            :key="message.id"
            class="designer-ai-content__message"
            :class="`designer-ai-content__message--${message.role}`"
          >
            <span>{{ message.title }} · {{ formatTime(message.createdAt) }}</span>
            <p>{{ message.content }}</p>
          </div>

          <div v-if="currentJob" class="designer-ai-content__job-progress">
            <div class="designer-ai-content__job-progress-head">
              <div>
                <Tag :color="jobStatusColor">{{ currentJob.status }}</Tag>
                <strong>{{ jobProgressStageLabel }}</strong>
              </div>
              <span>{{ jobProgressPercent }}%</span>
            </div>

            <Progress
              :percent="jobProgressPercent"
              :stroke-width="6"
              :status="jobProgressBarStatus"
              hide-info
            />

            <div class="designer-ai-content__job-progress-meta">
              <span>任务 ID：{{ currentJob.jobId }}</span>
              <span>已用：{{ jobElapsedText }}</span>
              <span>预计：{{ jobEstimateText }}</span>
            </div>

            <p>{{ jobProgressDescription }}</p>
          </div>

          <div v-if="shouldShowAssistantSummary" class="designer-ai-content__assistant-summary">
            <div class="designer-ai-content__assistant-summary-head">
              <Tag :color="assistantModeColor(lastAssistantTurn.mode)">
                {{ formatAssistantMode(lastAssistantTurn.mode) }}
              </Tag>
              <span>置信度 {{ Math.round(lastAssistantTurn.confidence * 100) }}%</span>
              <Tag v-if="lastAssistantTurn.needsConfirmation" color="warning">需确认</Tag>
              <Tag v-if="lastAssistantTurn.jobIds?.length" color="success">已派单</Tag>
            </div>

            <p class="designer-ai-content__assistant-summary-reply">
              {{ lastAssistantTurn.reply }}
            </p>

            <div
              v-if="lastAssistantTurn.toolCalls.length"
              class="designer-ai-content__assistant-summary-block"
            >
              <strong>工具调用</strong>
              <div
                v-for="(toolCall, index) in lastAssistantTurn.toolCalls"
                :key="`${toolCall.type}-${index}`"
                class="designer-ai-content__assistant-summary-line"
              >
                {{ formatToolCall(toolCall) }}
              </div>
            </div>

            <div
              v-if="lastAssistantTurn.designPlan"
              class="designer-ai-content__assistant-summary-block"
            >
              <strong>设计计划</strong>
              <div class="designer-ai-content__assistant-summary-line">
                方案状态：{{
                  lastAssistantTurn.designPlan.review.status === 'passed' ? '通过' : '需留意'
                }}
              </div>
              <div
                v-for="layer in lastAssistantTurn.designPlan.layers"
                :key="layer.id"
                class="designer-ai-content__assistant-summary-line"
              >
                {{ layer.label }} · {{ layer.role }} · {{ layer.generationMode }}
              </div>
              <div
                v-for="(note, index) in lastAssistantTurn.designPlan.review.notes"
                :key="`note-${index}`"
                class="designer-ai-content__assistant-summary-note"
              >
                {{ note }}
              </div>
            </div>
          </div>
        </div>

        <div class="designer-ai-content__composer">
          <Input
            v-model="prompt"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            placeholder="向智能体设计师提问，生图请使用左侧 AI生图 工具。"
          />

          <div class="designer-ai-content__composer-foot">
            <small>{{ isActivated ? '聊天咨询不直接派发生图任务。' : '当前未激活。' }}</small>
            <div class="designer-ai-content__composer-actions">
              <Button
                :disabled="isSubmitting || isPolling || isCancelling"
                @click="clearConversation"
              >
                清空
              </Button>
              <Button v-if="canCancelJob" :loading="isCancelling" @click="cancelJob">取消</Button>
              <Button
                type="primary"
                :disabled="!canSubmit"
                :loading="isSubmitting || isPolling"
                @click="submitJob"
              >
                {{ designerAiSubmitLabel }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts" name="DesignerAiContent">
import { Message } from 'view-ui-plus';
import { v4 as uuidv4 } from 'uuid';
import { useRoute } from 'vue-router';
import { nextTick } from 'vue';

import useSelect from '@/hooks/select';
import {
  formatDesignerAiCostBadge,
  formatDesignerAiPoints,
  resolveDesignerAiImageSize,
  resolveDesignerAiPointTierFromProfile,
} from '@/modules/designer-ai/ai-points';
import {
  designerAiBillingProfile,
  setDesignerAiBillingProfile,
} from '@/modules/designer-ai/billing-profile';
import { applyDesignerAiPatch } from '@/modules/designer-ai/patch';
import { onDesignerAiPanelAction } from '@/modules/designer-ai/quick-actions';
import type {
  DesignerAiQuickActionDetail,
  DesignerAiReferenceSnapshot,
} from '@/modules/designer-ai/quick-actions';
import { saveImageSourceAsLocalAsset } from '@/modules/local-workspace/assets';
import { saveCurrentDesign } from '@/modules/local-workspace/workspace';
import { isPlatformApiConfigured } from '@/platform/config';
import {
  cancelDesignerAiJob,
  createDesignerAiJob,
  getDesignerAiCapabilities,
  getDesignerAiJob,
  parseDesignerAiTemplateSlots,
} from '@/platform/designer-ai';
import { createDesignerAssistantTurn } from '@/platform/designer-assistant';
import { activatePlatformLicense, getPlatformActivationStatus } from '@/platform/session';
import {
  getPlatformSessionToken,
  onPlatformSessionTokenChange,
  getStoredPlatformProfile,
  setPlatformSessionToken,
} from '@/platform/storage';
import type {
  DesignerAiCapabilities,
  DesignerAiJob,
  DesignerAiJobCreatePayload,
  DesignerAiPatch,
  DesignerAiMode,
  DesignerAiTargetRole,
  DesignerAiTemplateSlotsPayload,
  DesignerAssistantTurnResponse,
  PlatformActivationStatus,
} from '@/platform/types';

const props = defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
  panelMode: {
    type: String,
    default: 'chat',
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
});

const embedded = computed(() => props.embedded);
const isToolMode = computed(() => props.panelMode === 'tool');
const isChatMode = computed(() => !isToolMode.value);

type DirectImageSelection = {
  id: string;
  label: string;
  role: DesignerAiTargetRole;
  mode: DesignerAiMode;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  aspectRatio: string;
  sourceUrl: string;
  sourceDataUrl?: string;
};

type ActiveCanvasSelection = {
  objectId: string;
  objectType: string;
  label: string;
};

type DesignerAiConversationRole = 'assistant' | 'user' | 'error';

type DesignerAiConversationMessage = {
  id: string;
  role: DesignerAiConversationRole;
  title: string;
  content: string;
  createdAt: string;
};

type DesignerAiWorkMode = 'auto' | 'overall' | 'layer';
type DesignerAiImageToolMode = 'edit' | 'background' | 'element' | 'artText';

type CanvasSizeReader = {
  getWidth?: () => number;
  getHeight?: () => number;
};

const DESIGNER_AI_WELCOME_MESSAGE = '您好，我是您的专属智能体设计师';

const route = useRoute();
const { canvasEditor, getObjectAttr } = useSelect();

const platformReady = isPlatformApiConfigured();
const isLoading = ref(false);
const isSubmitting = ref(false);
const isPolling = ref(false);
const isCancelling = ref(false);
const errorMessage = ref('');
const prompt = ref('');
const language = ref('zh-CN');
const capabilities = ref<DesignerAiCapabilities | null>(null);
const parsedSlots = ref<DesignerAiTemplateSlotsPayload | null>(null);
const currentJob = ref<DesignerAiJob | null>(null);
const lastAssistantTurn = ref<DesignerAssistantTurnResponse | null>(null);
const activationStatus = ref<PlatformActivationStatus | null>(null);
const directImageSelection = ref<DirectImageSelection | null>(null);
const activeCanvasSelection = ref<ActiveCanvasSelection | null>(null);
const lockedReferenceSelection = ref(false);
const conversationMessages = ref<DesignerAiConversationMessage[]>([]);
const messagesRef = ref<HTMLElement | null>(null);
const pendingQuickAction = ref<DesignerAiQuickActionDetail | null>(null);
const progressClock = ref(Date.now());
const workMode = ref<DesignerAiWorkMode>('auto');

let pollingTimer: ReturnType<typeof setTimeout> | null = null;
let stopPanelActionListener: (() => void) | null = null;
let stopSessionListener: (() => void) | null = null;
let restoringActivation = false;

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
const hasDirectImageSelection = computed(() => Boolean(directImageSelection.value));
const toolReferenceSelection = computed(() =>
  lockedReferenceSelection.value ? directImageSelection.value : null
);
const toolReferencePreviewSrc = computed(() => {
  const reference = toolReferenceSelection.value;
  return reference?.sourceDataUrl || reference?.sourceUrl || '';
});
const toolReferenceMetaText = computed(() => {
  const reference = toolReferenceSelection.value;
  if (!reference) {
    return '';
  }

  return `${reference.displayWidth} × ${reference.displayHeight} · ${reference.aspectRatio}`;
});
const isDirectImageMode = computed(() => {
  if (!hasDirectImageSelection.value) {
    return false;
  }

  return shouldUseLayerMode(prompt.value);
});
const panelTitle = computed(() => (isToolMode.value ? 'AI生图' : '智能体设计师'));
const panelSubtitle = computed(() =>
  isToolMode.value ? '右键发送参考图后再生成，避免选中状态漂移。' : ''
);
const toolModeLabel = computed(() => {
  const mode = resolveToolMode(prompt.value);
  if (mode === 'edit') {
    return '参考图编辑';
  }

  if (mode === 'artText') {
    return '艺术字生成';
  }

  if (mode === 'element') {
    return '元素生成';
  }

  return '新图生成';
});
const canvasImagePointTier = computed(() => {
  const editorCanvas = (canvasEditor as unknown as { canvas?: CanvasSizeReader }).canvas;
  return resolveDesignerAiPointTierFromProfile(
    {
      width: editorCanvas?.getWidth?.() || 0,
      height: editorCanvas?.getHeight?.() || 0,
    },
    designerAiBillingProfile.value
  );
});
const canvasImageSize = computed(() => {
  const editorCanvas = (canvasEditor as unknown as { canvas?: CanvasSizeReader }).canvas;
  return resolveDesignerAiImageSize({
    width: editorCanvas?.getWidth?.() || 0,
    height: editorCanvas?.getHeight?.() || 0,
  });
});
const designerAiCostPreview = computed(() => {
  const promptValue = prompt.value.trim();
  if (!promptValue || shouldBlockOverallDesign(promptValue)) {
    return null;
  }

  if (
    isToolMode.value ||
    pendingQuickAction.value?.category === 'material' ||
    isDirectImageMode.value ||
    shouldUseLayerMode(promptValue)
  ) {
    const tier = canvasImagePointTier.value;
    return {
      kind: 'image' as const,
      label: tier ? `${tier.label} ${tier.size}` : canvasImageSize.value,
      points: tier?.aiPoints,
    };
  }

  if (
    pendingQuickAction.value?.actionKey?.includes('title') ||
    pendingQuickAction.value?.actionKey?.includes('body') ||
    pendingQuickAction.value?.actionKey?.includes('sell') ||
    /重写文案|强化卖点|压缩文案|标题|文案|卖点/.test(promptValue)
  ) {
    return {
      kind: 'text' as const,
      label: '文案设计',
      points: undefined,
    };
  }

  return null;
});
const designerAiSubmitLabel = computed(() => {
  if (isToolMode.value) {
    return designerAiCostPreview.value
      ? `生成 · ${formatDesignerAiCostBadge(designerAiCostPreview.value.points)}`
      : '生成';
  }

  if (!designerAiCostPreview.value) {
    return '发送';
  }

  return `发送 · ${formatDesignerAiCostBadge(designerAiCostPreview.value.points)}`;
});
const designerAiBillingHint = computed(() => {
  const promptValue = prompt.value.trim();
  if (isToolMode.value) {
    if (!promptValue) {
      return '有参考图时自动编辑参考图；无参考图时自动生成新图片。';
    }

    if (toolReferenceSelection.value) {
      return designerAiCostPreview.value?.points
        ? `将按参考图编辑处理，预计消耗 ${formatDesignerAiPoints(
            designerAiCostPreview.value.points
          )}，最终以服务端结算为准。`
        : '将按参考图编辑处理，具体消耗以服务端结算为准。';
    }

    return designerAiCostPreview.value?.points
      ? `预计消耗 ${formatDesignerAiPoints(
          designerAiCostPreview.value.points
        )}，最终以服务端结算为准。`
      : '具体消耗以服务端结算为准。';
  }

  if (!promptValue) {
    return '普通聊天不扣 AI 点；设计类生成会显示预计消耗。';
  }

  if (shouldBlockOverallDesign(promptValue)) {
    return '总体设计暂时禁用；请改用图层设计或直接聊天。';
  }

  if (designerAiCostPreview.value?.kind === 'image') {
    if (typeof designerAiCostPreview.value.points !== 'number') {
      return '当前为设计生图任务，具体消耗以服务端结算为准。';
    }

    return `当前画布自动匹配 ${
      designerAiCostPreview.value.label
    }，预计消耗 ${formatDesignerAiPoints(designerAiCostPreview.value.points)}。`;
  }

  if (designerAiCostPreview.value?.kind === 'text') {
    return '本次为文案设计，具体消耗以服务端结算为准。';
  }

  return '普通聊天不扣 AI 点；AI 生图和图层改图会扣点。';
});
const isActivated = computed(() => {
  return (
    activationStatus.value?.status === 'activated' &&
    Boolean(activationStatus.value?.canUseApp) &&
    Boolean(activationStatus.value?.sessionToken)
  );
});

const canSubmit = computed(() => {
  return Boolean(
    platformReady &&
      isActivated.value &&
      prompt.value.trim() &&
      !isSubmitting.value &&
      !isPolling.value
  );
});

const generatedImageResults = computed(() => {
  const actions = currentJob.value?.result?.actions || [];
  return actions
    .map((action, index) => {
      if (action.type === 'replace-image-src') {
        return {
          id: `${action.targetId}-${index}`,
          label: '替换结果',
          src: action.src,
        };
      }

      if (action.type === 'add-object') {
        const object = action.object || {};
        const src = String(object.src || '').trim();
        if (String(object.type || '') === 'image' && src) {
          return {
            id: `${String(object.id || 'image')}-${index}`,
            label: String(object.name || '新增图片'),
            src,
          };
        }
      }

      return null;
    })
    .filter((item): item is { id: string; label: string; src: string } => Boolean(item));
});
const shouldShowAssistantSummary = computed(() => {
  const turn = lastAssistantTurn.value;
  if (!turn) {
    return false;
  }

  return Boolean(
    turn.needsConfirmation || turn.designPlan || turn.jobIds?.length || turn.toolCalls?.length
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

const jobProgressPercent = computed(() => {
  const job = currentJob.value;
  if (!job) {
    return 0;
  }

  if (job.status === 'succeeded' || job.status === 'partial_success') {
    return 100;
  }

  if (job.status === 'failed' || job.status === 'cancelled') {
    return Math.max(5, Math.min(99, estimateJobProgress(job)));
  }

  return estimateJobProgress(job);
});

const jobProgressBarStatus = computed(() => {
  const status = currentJob.value?.status;
  if (status === 'succeeded' || status === 'partial_success') {
    return 'success';
  }
  if (status === 'failed' || status === 'cancelled') {
    return 'wrong';
  }
  return 'active';
});

const jobProgressStageLabel = computed(() => {
  const job = currentJob.value;
  if (!job) {
    return '等待任务';
  }

  if (job.status === 'queued') return '排队中';
  if (job.status === 'succeeded') return '已完成';
  if (job.status === 'partial_success') return '部分完成';
  if (job.status === 'failed') return '生成失败';
  if (job.status === 'cancelled') return '已取消';

  const reason = job.pollingAdvice?.reason;
  if (reason === 'RUNNING_TEXT') return '正在生成文案';
  if (reason === 'RUNNING_VIDEO') return '正在生成视频';
  if (reason === 'RUNNING_IMAGE') return '模型生成中';
  return '任务处理中';
});

const jobProgressDescription = computed(() => {
  const job = currentJob.value;
  if (!job) {
    return '';
  }

  if (job.status === 'queued') {
    return '任务已提交，正在等待平台调度。';
  }

  if (job.status === 'running') {
    const progress = job.progress;
    if (progress?.total) {
      return `正在处理 ${progress.total} 个目标，已完成 ${progress.succeeded} 个，失败 ${progress.failed} 个。`;
    }
    return '模型正在生成结果，完成后会自动应用到画布。';
  }

  if (job.status === 'succeeded') {
    return '结果已生成并应用到画布。';
  }

  if (job.status === 'partial_success') {
    return '部分结果已生成并应用到画布，未完成的目标已跳过。';
  }

  return job.error?.message || '任务未完成，请查看错误信息后重试。';
});

const jobElapsedText = computed(() => {
  const job = currentJob.value;
  if (!job?.createdAt) {
    return '-';
  }

  const startedAt = new Date(job.createdAt).getTime();
  const endedAt =
    job.status === 'succeeded' ||
    job.status === 'partial_success' ||
    job.status === 'failed' ||
    job.status === 'cancelled'
      ? new Date(job.updatedAt || job.createdAt).getTime()
      : progressClock.value;

  return formatDuration(Math.max(0, endedAt - startedAt));
});

const jobEstimateText = computed(() => {
  const job = currentJob.value;
  if (!job) {
    return '-';
  }

  if (job.status === 'succeeded' || job.status === 'partial_success') {
    return '已完成';
  }

  if (job.status === 'failed' || job.status === 'cancelled') {
    return '已结束';
  }

  const reason = job.pollingAdvice?.reason;
  if (reason === 'RUNNING_TEXT') return '10-30 秒';
  if (reason === 'RUNNING_VIDEO') return '3-10 分钟';
  return '60-180 秒';
});

function estimateJobProgress(job: DesignerAiJob) {
  const progress = job.progress;
  if (progress?.total) {
    const completedWeight = progress.succeeded + progress.failed;
    const runningWeight = progress.running * 0.45;
    return Math.max(
      8,
      Math.min(96, Math.round(((completedWeight + runningWeight) / progress.total) * 100))
    );
  }

  if (job.status === 'queued') {
    return 8;
  }

  if (job.status === 'running') {
    const elapsedMs = Math.max(0, progressClock.value - new Date(job.createdAt).getTime());
    return Math.max(18, Math.min(92, Math.round(18 + (elapsedMs / 180000) * 64)));
  }

  return 0;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} 秒`;
  }

  return `${minutes} 分 ${seconds} 秒`;
}

function formatAssistantMode(mode: string) {
  if (mode === 'quick_image') return '单图生成';
  if (mode === 'layered_design') return '多图层设计';
  if (mode === 'layer_edit') return '图层编辑';
  return '聊天回答';
}

function formatTargetRoleLabel(role?: string) {
  if (role === 'background') return '背景';
  if (role === 'title') return '标题';
  if (role === 'subtitle') return '副标题';
  if (role === 'body-text') return '正文';
  if (role === 'cta') return '按钮';
  if (role === 'price') return '价格';
  if (role === 'product-image') return '商品图';
  if (role === 'logo') return 'Logo';
  if (role === 'decoration') return '装饰';
  return role || '';
}

function assistantModeColor(mode: string) {
  if (mode === 'quick_image') return 'success';
  if (mode === 'layered_design') return 'warning';
  if (mode === 'layer_edit') return 'error';
  return 'primary';
}

function formatToolCall(toolCall: DesignerAssistantTurnResponse['toolCalls'][number]) {
  if (toolCall.type === 'generate_image') {
    return `生成图像 · ${toolCall.model}${
      toolCall.targetRole ? ` · ${formatTargetRoleLabel(toolCall.targetRole)}` : ''
    }`;
  }

  if (toolCall.type === 'revise_layer') {
    return `重绘图层 · ${toolCall.layerId}`;
  }

  const targetRoles = Array.isArray(toolCall.brief.targetRoles)
    ? toolCall.brief.targetRoles.join('、')
    : '';
  return `图层规划${targetRoles ? ` · ${targetRoles}` : ''}`;
}

function clearPolling() {
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

function createConversationMessage(
  role: DesignerAiConversationRole,
  title: string,
  content: string
) {
  return {
    id: uuidv4(),
    role,
    title,
    content: String(content || '').trim(),
    createdAt: new Date().toISOString(),
  };
}

function appendConversationEntry(role: DesignerAiConversationRole, title: string, content: string) {
  conversationMessages.value = [
    ...conversationMessages.value,
    createConversationMessage(role, title, content),
  ].slice(-24);
}

async function clearConversation() {
  conversationMessages.value = [
    createConversationMessage('assistant', 'AI', DESIGNER_AI_WELCOME_MESSAGE),
  ];
  lastAssistantTurn.value = null;
  pendingQuickAction.value = null;
  prompt.value = '';
  await nextTick();
  scrollMessagesToBottom();
}

function scrollMessagesToBottom() {
  const element = messagesRef.value;
  if (!element) {
    return;
  }

  element.scrollTop = element.scrollHeight;
}

function createSelectionFromReferenceSnapshot(
  referenceSnapshot: DesignerAiReferenceSnapshot
): DirectImageSelection | null {
  if (referenceSnapshot.objectType !== 'image' || !referenceSnapshot.objectId) {
    return null;
  }

  const frame = referenceSnapshot.frame || {
    width: 1,
    height: 1,
    aspectRatio: '1:1',
  };
  const displayWidth = Math.max(1, Math.round(Number(frame.width) || 1));
  const displayHeight = Math.max(1, Math.round(Number(frame.height) || 1));

  return {
    id: referenceSnapshot.objectId,
    label: String(referenceSnapshot.label || '图片').trim() || '图片',
    role: 'product-image',
    mode: 'image-edit',
    width: displayWidth,
    height: displayHeight,
    displayWidth,
    displayHeight,
    aspectRatio:
      String(frame.aspectRatio || '').trim() ||
      resolveStandardImageAspectRatio(displayWidth, displayHeight),
    sourceUrl: String(referenceSnapshot.sourceUrl || '').trim(),
    sourceDataUrl: String(
      referenceSnapshot.sourceDataUrl || referenceSnapshot.previewDataUrl || ''
    ).trim(),
  };
}

function handleDesignerAiPanelAction(detail: DesignerAiQuickActionDetail) {
  const nextPrompt = String(detail.prompt || '').trim();
  const referenceSelection = detail.referenceSnapshot
    ? createSelectionFromReferenceSnapshot(detail.referenceSnapshot)
    : null;

  if (referenceSelection) {
    directImageSelection.value = referenceSelection;
    activeCanvasSelection.value = {
      objectId: referenceSelection.id,
      objectType: 'image',
      label: referenceSelection.label,
    };
    lockedReferenceSelection.value = true;
  }

  pendingQuickAction.value = detail;
  if (nextPrompt && detail.actionKey !== 'send-to-ai-image') {
    prompt.value = nextPrompt;
  }

  if (isChatMode.value) {
    appendConversationEntry(
      'assistant',
      '快捷操作',
      detail.label ? `已填入：${detail.label}。你可以继续补充后直接发送。` : '已填入快捷操作。'
    );
  } else if (detail.label) {
    Message.info(`${detail.label} 已进入 AI生图`);
  }
}

function clearToolReference() {
  lockedReferenceSelection.value = false;
  directImageSelection.value = null;
  activeCanvasSelection.value = null;
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

async function loadActivationStatus() {
  activationStatus.value = await getPlatformActivationStatus();
  if (activationStatus.value?.sessionToken) {
    const currentToken = getPlatformSessionToken();
    if (currentToken !== activationStatus.value.sessionToken) {
      setPlatformSessionToken(activationStatus.value.sessionToken);
    }
  }
}

async function restoreActivationIfNeeded() {
  if (restoringActivation) {
    return;
  }

  if (activationStatus.value?.status !== 'not_logged_in') {
    return;
  }

  const storedProfile = getStoredPlatformProfile();
  if (!storedProfile.customerName.trim() || !storedProfile.contact.trim()) {
    return;
  }

  restoringActivation = true;
  try {
    activationStatus.value = await activatePlatformLicense({
      customerName: storedProfile.customerName,
      contact: storedProfile.contact,
      agentInviteCode: storedProfile.agentInviteCode,
    });
  } catch (error) {
    errorMessage.value = formatErrorMessage(error, '自动恢复授权失败');
    appendConversationEntry('error', '错误', errorMessage.value);
  } finally {
    restoringActivation = false;
  }
}

async function ensurePlatformSessionReady() {
  await loadActivationStatus();
  if (activationStatus.value?.status === 'not_logged_in') {
    await restoreActivationIfNeeded();
  }

  return isActivated.value;
}

async function loadCapabilities() {
  capabilities.value = await getDesignerAiCapabilities();
  setDesignerAiBillingProfile(capabilities.value.billing || null);
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

function isTransientPollingError(error: unknown) {
  const statusCode =
    error && typeof error === 'object'
      ? Number((error as { statusCode?: number }).statusCode || 0)
      : 0;
  const message = String(error instanceof Error ? error.message : error || '');

  return (
    statusCode === 0 ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode >= 500 ||
    /timeout|network|aborted|ECONNABORTED|ERR_NETWORK/i.test(message)
  );
}

function isDataImageUrl(value: string) {
  return /^data:image\/[^;]+;base64,/i.test(String(value || '').trim());
}

function isLocalOnlyImageSource(value: string) {
  const source = String(value || '').trim();
  if (!source || isDataImageUrl(source)) {
    return false;
  }

  if (/^blob:/i.test(source)) {
    return true;
  }

  try {
    const parsed = new URL(source);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch {
    return !/^https?:\/\//i.test(source);
  }
}

function exportImageObjectDataUrl(
  activeObject: {
    toDataURL?: (options?: Record<string, unknown>) => string;
    getElement?: () => unknown;
    _element?: unknown;
  } & Record<string, unknown>
) {
  try {
    const objectDataUrl = String(
      activeObject.toDataURL?.({
        format: 'png',
        multiplier: 1,
      }) || ''
    ).trim();
    if (isDataImageUrl(objectDataUrl)) {
      return objectDataUrl;
    }
  } catch {
    // Canvas may be tainted by cross-origin assets. Public URLs can still be used.
  }

  const imageElement = activeObject.getElement?.() || activeObject._element;
  if (!(imageElement instanceof HTMLImageElement) || !imageElement.naturalWidth) {
    return '';
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      return '';
    }

    context.drawImage(imageElement, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    return isDataImageUrl(dataUrl) ? dataUrl : '';
  } catch {
    return '';
  }
}

const STANDARD_IMAGE_ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '3:4', value: 3 / 4 },
  { label: '2:3', value: 2 / 3 },
  { label: '9:16', value: 9 / 16 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
];

function resolveStandardImageAspectRatio(width: number, height: number) {
  const normalizedWidth = Math.max(1, Number(width) || 1);
  const normalizedHeight = Math.max(1, Number(height) || 1);
  const ratio = normalizedWidth / normalizedHeight;

  return (
    STANDARD_IMAGE_ASPECT_RATIOS.map((candidate) => ({
      ...candidate,
      distance: Math.abs(candidate.value - ratio),
    })).sort((left, right) => left.distance - right.distance)[0]?.label || '1:1'
  );
}

function isTransparentCutoutIntent(promptValue: string) {
  const actionKey = String(pendingQuickAction.value?.actionKey || '').toLowerCase();
  const normalizedPrompt = String(promptValue || '').toLowerCase();

  return (
    actionKey.includes('transparent') ||
    actionKey.includes('cutout') ||
    /透明|抠图|去底|去白底|去背景|transparent|cutout|remove background/.test(normalizedPrompt)
  );
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
        getScaledWidth?: () => number;
        getScaledHeight?: () => number;
        toDataURL?: (options?: Record<string, unknown>) => string;
        getElement?: () => unknown;
        _element?: unknown;
      } & Record<string, unknown>)
    | null;

  if (!activeObject || activeObject.type !== 'image' || !activeObject.id) {
    return null;
  }

  const sourceUrl =
    String(activeObject.originSrc || '').trim() ||
    String(activeObject.getSrc?.() || '').trim() ||
    String(activeObject.get?.('src') || '').trim();
  const width = Number(activeObject.get?.('width') || 0);
  const height = Number(activeObject.get?.('height') || 0);
  const scaleX = Math.abs(Number(activeObject.get?.('scaleX') || 1)) || 1;
  const scaleY = Math.abs(Number(activeObject.get?.('scaleY') || 1)) || 1;
  const displayWidth = Math.max(
    1,
    Math.round(Number(activeObject.getScaledWidth?.() || 0) || width * scaleX || width)
  );
  const displayHeight = Math.max(
    1,
    Math.round(Number(activeObject.getScaledHeight?.() || 0) || height * scaleY || height)
  );

  return {
    id: String(activeObject.id),
    label: String(activeObject.get?.('name') || activeObject.text || '图片').trim() || '图片',
    role: 'product-image' as const,
    mode: 'image-edit' as const,
    width,
    height,
    displayWidth,
    displayHeight,
    aspectRatio: resolveStandardImageAspectRatio(displayWidth, displayHeight),
    sourceUrl,
    sourceDataUrl: exportImageObjectDataUrl(activeObject),
  };
}

function getActiveCanvasSelection() {
  const activeObject = canvasEditor.canvas?.getActiveObject?.() as {
    id?: string;
    type?: string;
    text?: string;
    get?: (key: string) => unknown;
  } | null;

  if (!activeObject || !activeObject.id || activeObject.id === 'workspace') {
    return null;
  }

  const label =
    String(
      activeObject.get?.('name') || activeObject.get?.('slotName') || activeObject.text || ''
    ).trim() || String(activeObject.type || '图层');

  return {
    objectId: String(activeObject.id),
    objectType: String(activeObject.type || 'object'),
    label,
  };
}

function syncDirectImageSelection() {
  if (lockedReferenceSelection.value) {
    return;
  }

  activeCanvasSelection.value = getActiveCanvasSelection();
  directImageSelection.value = getActiveImageObject();
}

function shouldUseDirectImageMode(promptValue: string) {
  const normalizedPrompt = String(promptValue || '').trim();
  if (!normalizedPrompt) {
    return false;
  }

  const editKeywords = [
    '换背景',
    '模特',
    '抠图',
    '去除',
    '删除',
    '替换',
    '换成',
    '改成',
    '重绘',
    '修图',
    '调色',
    '配色',
    '材质',
    '清理',
    '裁切',
    '裁剪',
    '透明',
    '去掉',
    '局部重绘',
    '擦除',
    '补全',
  ];

  return editKeywords.some((keyword) => normalizedPrompt.includes(keyword));
}

function isLayerEditIntent(promptValue: string) {
  return shouldUseDirectImageMode(promptValue);
}

function isOverallDesignIntent(promptValue: string) {
  const normalizedPrompt = String(promptValue || '')
    .trim()
    .toLowerCase();
  if (!normalizedPrompt) {
    return false;
  }

  return /海报|价格表|详情页|整张|整套|整体|整页|版式|排版|多图层|设计图|poster|banner|layout|design/.test(
    normalizedPrompt
  );
}

function shouldUseLayerMode(promptValue: string) {
  const normalizedPrompt = String(promptValue || '').trim();
  if (!normalizedPrompt || workMode.value === 'overall') {
    return false;
  }

  if (workMode.value === 'layer') {
    return Boolean(activeCanvasSelection.value);
  }

  return Boolean(activeCanvasSelection.value && isLayerEditIntent(normalizedPrompt));
}

function shouldAskForLayerSelection(promptValue: string) {
  const normalizedPrompt = String(promptValue || '').trim();
  if (!normalizedPrompt || workMode.value === 'overall') {
    return false;
  }

  if (workMode.value === 'layer') {
    return !activeCanvasSelection.value;
  }

  return !activeCanvasSelection.value && isLayerEditIntent(normalizedPrompt);
}

function shouldBlockOverallDesign(promptValue: string) {
  const normalizedPrompt = String(promptValue || '').trim();
  if (!normalizedPrompt) {
    return false;
  }

  if (shouldUseLayerMode(normalizedPrompt)) {
    return false;
  }

  return workMode.value === 'overall' || isOverallDesignIntent(normalizedPrompt);
}

function resolveToolMode(message = ''): DesignerAiImageToolMode {
  if (toolReferenceSelection.value) {
    return 'edit';
  }

  const normalizedPrompt = String(message || '').trim();
  if (/艺术字|字效|标题字|字体设计|文字图片/.test(normalizedPrompt)) {
    return 'artText';
  }

  if (/元素|素材|贴纸|装饰|图标|icon|logo|透明底|抠图|挂件|点缀/.test(normalizedPrompt)) {
    return 'element';
  }

  return 'background';
}

function getToolTargetRole(message = '') {
  const mode = resolveToolMode(message);
  if (mode === 'artText') {
    return 'decoration' as const;
  }

  if (mode === 'element') {
    return 'decoration' as const;
  }

  return 'background' as const;
}

function getToolActionKey(message = '') {
  const mode = resolveToolMode(message);
  if (mode === 'edit') {
    return 'image-edit';
  }

  if (mode === 'artText') {
    return 'generate-art-text';
  }

  if (mode === 'element') {
    return 'generate-element';
  }

  return 'generate-background';
}

function buildToolTarget(message = '') {
  const mode = resolveToolMode(message);
  const role = getToolTargetRole(message);

  if (mode === 'edit') {
    if (!toolReferenceSelection.value) {
      throw new Error('请先通过右键发送参考图到 AI 生图。');
    }

    return {
      slotId: toolReferenceSelection.value.id,
      role: toolReferenceSelection.value.role,
      mode: 'image-edit' as const,
      targetSource: 'selected-layer' as const,
    };
  }

  const matchedSlot = enabledSlots.value.find(
    (slot) => slot.role === role && slot.aiMode === 'image-generate'
  );
  if (matchedSlot) {
    return {
      slotId: matchedSlot.id,
      role: matchedSlot.role,
      mode: matchedSlot.aiMode,
      targetSource: 'ai-slot' as const,
    };
  }

  return {
    slotId: `ai-generated-${role}-${uuidv4()}`,
    role,
    mode: 'image-generate' as const,
    targetSource: 'ai-slot' as const,
  };
}

function buildToolJobPayload(input: {
  message: string;
  width: number;
  height: number;
  conversationHistory?: DesignerAiConversationMessage[];
  snapshot: {
    meta?: Record<string, unknown>;
    objects?: Array<Record<string, unknown>>;
  };
}): DesignerAiJobCreatePayload {
  const selectedImage = toolReferenceSelection.value;
  let templateSnapshot = input.snapshot;

  const toolMode = resolveToolMode(input.message);

  if (toolMode === 'edit') {
    if (!selectedImage) {
      throw new Error('请先通过右键发送参考图到 AI 生图。');
    }

    if (!selectedImage.sourceUrl && !selectedImage.sourceDataUrl) {
      throw new Error(
        '当前图片图层缺少可用于 AI 编辑的图片来源，请重新选择图片或先生成一张远程图片后再编辑。'
      );
    }

    if (isLocalOnlyImageSource(selectedImage.sourceUrl) && !selectedImage.sourceDataUrl) {
      throw new Error(
        '当前图片是浏览器临时地址，服务端 AI 无法读取。请先使用平台生成图片，或换成可访问的远程图片后再编辑。'
      );
    }

    const snapshotObjects = Array.isArray(input.snapshot.objects) ? input.snapshot.objects : [];
    let matched = false;
    templateSnapshot = {
      ...input.snapshot,
      objects: snapshotObjects.map((item) => {
        if (!item || item.id !== selectedImage.id) {
          return item;
        }

        matched = true;
        const extension =
          item.extension && typeof item.extension === 'object' ? item.extension : {};
        return {
          ...item,
          src: selectedImage.sourceUrl || item.src,
          originSrc: selectedImage.sourceUrl || item.originSrc || item.src,
          sourceDataUrl: selectedImage.sourceDataUrl || item.sourceDataUrl,
          aiSourceDataUrl: selectedImage.sourceDataUrl || item.aiSourceDataUrl,
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
              targetFrameWidth: selectedImage.displayWidth,
              targetFrameHeight: selectedImage.displayHeight,
              targetAspectRatio: selectedImage.aspectRatio,
              targetFit: isTransparentCutoutIntent(input.message) ? 'contain' : 'cover',
            },
          },
        };
      }),
    };

    if (!matched) {
      throw new Error('当前选中的图片图层未能写入 AI 请求，请重新选择后再试。');
    }
  }

  return {
    templateId: templateId.value || 'local-current',
    language: language.value,
    userPrompt: input.message,
    targets: [buildToolTarget(input.message)],
    canvas: {
      width: input.width,
      height: input.height,
    },
    templateSnapshot,
    clientRequestId: uuidv4(),
    actionKey: getToolActionKey(input.message),
    actionCategory: toolMode === 'edit' ? 'edit' : 'material',
    preserveLayout: toolMode === 'edit',
    candidateCount: 1,
  };
}

function buildChatTurnPayload(input: {
  message: string;
  width: number;
  height: number;
  conversationHistory?: DesignerAiConversationMessage[];
  snapshot: {
    meta?: Record<string, unknown>;
    objects?: Array<Record<string, unknown>>;
  };
}) {
  return {
    conversationId: templateId.value || 'local-current',
    templateId: templateId.value,
    language: language.value,
    message: input.message,
    conversationHistory: (input.conversationHistory || conversationMessages.value).slice(-12),
    selection: null,
    targets: [],
    canvas: {
      width: input.width,
      height: input.height,
    },
    templateSnapshot: input.snapshot,
    clientRequestId: uuidv4(),
    actionKey: 'assistant-chat-only',
    actionCategory: 'edit' as const,
    preserveLayout: false,
    candidateCount: 1,
  };
}

async function refreshSlots() {
  errorMessage.value = '';
  syncDirectImageSelection();

  try {
    const { snapshot } = getCanvasSnapshot();
    const nextParsedSlots = await parseDesignerAiTemplateSlots({
      templateId: templateId.value,
      templateSnapshot: snapshot,
    });

    parsedSlots.value = nextParsedSlots;

    // Slot parsing feeds the image-generation payload only. Do not add chat messages on boot.
  } catch (error) {
    errorMessage.value = formatErrorMessage(error, '解析 AI 图层失败');
  }
}

function formatTime(value: string) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString();
}

function getImageSourceFromCanvasObject(objectId: string) {
  const editorCanvas = (canvasEditor as any).canvas;
  const target = (editorCanvas?.getObjects?.() || []).find((item: { id?: string }) => {
    return String(item?.id || '') === objectId;
  }) as
    | {
        get?: (key: string) => unknown;
        getSrc?: () => string;
        src?: string;
        originSrc?: string;
      }
    | undefined;

  if (!target) {
    return '';
  }

  return String(
    target.getSrc?.() ||
      target.get?.('src') ||
      target.src ||
      target.get?.('originSrc') ||
      target.originSrc ||
      ''
  ).trim();
}

async function saveGeneratedImageAssets(patch: DesignerAiPatch) {
  const sources = new Map<string, string>();

  (patch.actions || []).forEach((action, index) => {
    if (action.type === 'replace-image-src') {
      const appliedSource = getImageSourceFromCanvasObject(action.targetId);
      const source = appliedSource || action.src;
      if (source) {
        sources.set(`${action.targetId}-${index}`, source);
      }
      return;
    }

    if (action.type === 'add-object') {
      const object = action.object || {};
      const objectId = String(object.id || '').trim();
      const objectType = String(object.type || '').trim();
      const appliedSource = objectId ? getImageSourceFromCanvasObject(objectId) : '';
      const source = appliedSource || String(object.src || '').trim();
      if (objectType === 'image' && source) {
        sources.set(`${objectId || 'image'}-${index}`, source);
      }
    }
  });

  await Promise.all(
    [...sources.values()].map((src) =>
      saveImageSourceAsLocalAsset({
        src,
        source: 'ai-generated',
        name: `AI生成图片 ${new Date().toLocaleString()}`,
      }).catch(() => null)
    )
  );
}

async function applyJobResult(job: DesignerAiJob) {
  if (!job.result) {
    return;
  }

  const result = await applyDesignerAiPatch(canvasEditor, job.result);
  canvasEditor.clearAndSaveState();
  await saveGeneratedImageAssets(job.result);
  await saveCurrentDesign(canvasEditor).catch(() => null);

  if (result.failed > 0) {
    Message.warning(`AI 已应用部分结果，成功 ${result.applied}，失败 ${result.failed}`);
    return;
  }

  Message.success(`AI 已应用 ${result.applied} 项修改`);
}

async function pollJob(jobId: string) {
  isPolling.value = true;
  clearPolling();
  let transientFailureCount = 0;
  const maxTransientFailureCount = 8;

  const run = async () => {
    try {
      progressClock.value = Date.now();
      const job = await getDesignerAiJob(jobId);
      transientFailureCount = 0;
      currentJob.value = job;

      if (job.status === 'succeeded' || job.status === 'partial_success') {
        isPolling.value = false;
        await applyJobResult(job);
        appendConversationEntry(
          'assistant',
          '结果',
          job.status === 'partial_success'
            ? '任务已部分完成，结果已应用到画布。'
            : '任务已完成，结果已应用到画布。'
        );
        return;
      }

      if (job.status === 'failed' || job.status === 'cancelled') {
        isPolling.value = false;
        const message =
          job.error?.message ||
          (job.status === 'cancelled'
            ? 'AI 任务已取消。'
            : 'AI 生图失败。请检查源图是否可访问、提示词是否合规，或稍后重试。');
        errorMessage.value = message;
        appendConversationEntry('error', '错误', message);
        return;
      }

      pollingTimer = setTimeout(run, 1500);
    } catch (error) {
      if (isTransientPollingError(error) && transientFailureCount < maxTransientFailureCount) {
        transientFailureCount += 1;
        errorMessage.value = '结果读取超时，正在继续重试...';
        pollingTimer = setTimeout(run, Math.min(1500 * (transientFailureCount + 1), 8000));
        return;
      }

      isPolling.value = false;
      errorMessage.value = formatErrorMessage(error, '任务轮询失败');
      appendConversationEntry('error', '错误', errorMessage.value);
    }
  };

  await run();
}

async function submitJob() {
  if (isSubmitting.value || isPolling.value) {
    return;
  }

  errorMessage.value = '';

  try {
    const sessionReady = await ensurePlatformSessionReady();
    if (!sessionReady) {
      const restoreErrorMessage = errorMessage.value;
      errorMessage.value =
        restoreErrorMessage || '当前设备未激活，无法提交 AI 任务。请先在“我的”中完成授权激活。';
      if (!restoreErrorMessage) {
        appendConversationEntry('error', '错误', errorMessage.value);
      }
      return;
    }
  } catch (error) {
    errorMessage.value = formatErrorMessage(error, 'AI 会话校验失败');
    appendConversationEntry('error', '错误', errorMessage.value);
    return;
  }

  if (!canSubmit.value) {
    if (!isActivated.value) {
      errorMessage.value = '当前设备未激活，无法提交 AI 任务。请先在“我的”中完成授权激活。';
      appendConversationEntry('error', '错误', errorMessage.value);
    }
    return;
  }

  const userPrompt = prompt.value.trim();
  syncDirectImageSelection();
  const conversationHistory = conversationMessages.value.slice(-12);
  const { width, height, snapshot } = getCanvasSnapshot();

  if (shouldBlockOverallDesign(userPrompt)) {
    appendConversationEntry('user', '你', userPrompt);
    prompt.value = '';
    appendConversationEntry(
      'assistant',
      'AI',
      '总体设计暂时禁用。当前请使用左侧「AI生图」生成或编辑图片，也可以直接和我讨论设计方案。'
    );
    pendingQuickAction.value = null;
    if (workMode.value === 'overall') {
      workMode.value = 'auto';
    }
    return;
  }

  if (!isToolMode.value && shouldAskForLayerSelection(userPrompt)) {
    appendConversationEntry('user', '你', userPrompt);
    prompt.value = '';
    appendConversationEntry(
      'assistant',
      'AI',
      '请先选中要修改的图层，或直接和我说明你想改哪个图层。'
    );
    pendingQuickAction.value = null;
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';

  try {
    appendConversationEntry('user', '你', userPrompt);
    prompt.value = '';

    if (isToolMode.value) {
      const requestPayload = buildToolJobPayload({
        message: userPrompt,
        width,
        height,
        conversationHistory,
        snapshot,
      });

      const response = await createDesignerAiJob(requestPayload);
      currentJob.value = await getDesignerAiJob(response.jobId);
      await pollJob(response.jobId);
      pendingQuickAction.value = null;
      return;
    }

    const requestPayload = buildChatTurnPayload({
      message: userPrompt,
      width,
      height,
      conversationHistory,
      snapshot,
    });

    const response = await createDesignerAssistantTurn(requestPayload);

    lastAssistantTurn.value = response;
    appendConversationEntry('assistant', 'AI', response.reply || '收到。');

    if (response.error?.message) {
      errorMessage.value = response.error.message;
      appendConversationEntry('error', '错误', response.error.message);
      return;
    }
  } catch (error) {
    errorMessage.value = formatErrorMessage(error, '任务创建失败');
    appendConversationEntry('error', '错误', errorMessage.value);
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
    appendConversationEntry('assistant', '结果', '任务已取消。');
  } catch (error) {
    const message = formatErrorMessage(error, '取消任务失败');
    Message.error(message);
    appendConversationEntry('error', '错误', message);
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

  if (!conversationMessages.value.length) {
    conversationMessages.value = [
      createConversationMessage('assistant', 'AI', DESIGNER_AI_WELCOME_MESSAGE),
    ];
  }

  try {
    await loadActivationStatus();
    await restoreActivationIfNeeded();
    await loadCapabilities();
    await refreshSlots();
  } catch (error) {
    errorMessage.value = formatErrorMessage(error, 'AI 面板初始化失败');
    appendConversationEntry('error', '错误', errorMessage.value);
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => conversationMessages.value.length,
  async () => {
    await nextTick();
    scrollMessagesToBottom();
  }
);

onMounted(() => {
  getObjectAttr(syncDirectImageSelection);
  canvasEditor.canvas?.on('selection:created', syncDirectImageSelection);
  canvasEditor.canvas?.on('selection:updated', syncDirectImageSelection);
  canvasEditor.canvas?.on('selection:cleared', syncDirectImageSelection);
  canvasEditor.canvas?.on('object:modified', syncDirectImageSelection);
  if (isToolMode.value) {
    stopPanelActionListener = onDesignerAiPanelAction(handleDesignerAiPanelAction);
  }
  stopSessionListener = onPlatformSessionTokenChange(() => {
    void loadActivationStatus()
      .then(() => {
        if (activationStatus.value?.status === 'not_logged_in') {
          return restoreActivationIfNeeded();
        }
        return undefined;
      })
      .catch((error) => {
        errorMessage.value = formatErrorMessage(error, '同步激活状态失败');
      });
  });
  syncDirectImageSelection();
  bootstrap();
});

onBeforeUnmount(() => {
  canvasEditor.canvas?.off('selection:created', syncDirectImageSelection);
  canvasEditor.canvas?.off('selection:updated', syncDirectImageSelection);
  canvasEditor.canvas?.off('selection:cleared', syncDirectImageSelection);
  canvasEditor.canvas?.off('object:modified', syncDirectImageSelection);
  stopPanelActionListener?.();
  stopPanelActionListener = null;
  stopSessionListener?.();
  stopSessionListener = null;
  clearPolling();
});
</script>

<style scoped lang="less">
.designer-ai-content {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
}

.designer-ai-content:not(.designer-ai-content--embedded) {
  height: min(72vh, 760px);
}

.designer-ai-content--embedded {
  height: 100%;
  padding: 4px 0 16px;
  overflow: hidden;
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
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  gap: 14px;
}

.designer-ai-content--embedded .designer-ai-content__body {
  min-height: 0;
  overflow: hidden;
}

.designer-ai-content__tool {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 0 2px 16px;
}

.designer-ai-content__tool-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 14px;
  background: #fff;
}

.designer-ai-content__tool-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.designer-ai-content__tool-card-head strong {
  color: #0f172a;
  font-size: 14px;
}

.designer-ai-content__reference {
  display: flex;
  gap: 12px;
  align-items: center;
}

.designer-ai-content__reference img {
  width: 92px;
  height: 92px;
  flex: 0 0 auto;
  border-radius: 12px;
  object-fit: cover;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
}

.designer-ai-content__reference-meta,
.designer-ai-content__reference-empty {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.designer-ai-content__reference-meta strong,
.designer-ai-content__reference-empty strong {
  color: #111827;
  line-height: 1.4;
}

.designer-ai-content__reference-meta span,
.designer-ai-content__reference-empty span,
.designer-ai-content__tool-card p,
.designer-ai-content__tool-actions small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.designer-ai-content__reference-empty {
  padding: 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  background: #f8fafc;
}

.designer-ai-content__tool-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.designer-ai-content__tool-actions {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.designer-ai-content__tool-actions > div {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.designer-ai-content__result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.designer-ai-content__result-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.designer-ai-content__result-card img {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}

.designer-ai-content__result-card span {
  color: #64748b;
  font-size: 12px;
}

.designer-ai-content__chat {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.94) 0%, #ffffff 100%);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.designer-ai-content__messages {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-gutter: stable;
}

.designer-ai-content__messages::-webkit-scrollbar {
  width: 8px;
}

.designer-ai-content__messages::-webkit-scrollbar-track {
  background: transparent;
}

.designer-ai-content__messages::-webkit-scrollbar-thumb {
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
  background-color: rgba(148, 163, 184, 0.5);
}

.designer-ai-content__message,
.designer-ai-content__job-inline,
.designer-ai-content__assistant-summary {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.designer-ai-content__message {
  display: flex;
  max-width: min(86%, 720px);
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
}

.designer-ai-content__message span {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.designer-ai-content__message p {
  margin: 0;
  color: #0f172a;
  white-space: pre-wrap;
  line-height: 1.7;
  word-break: break-word;
}

.designer-ai-content__message--assistant {
  align-self: flex-start;
}

.designer-ai-content__message--user {
  align-self: flex-end;
  border-color: rgba(191, 219, 254, 0.95);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98) 0%, rgba(224, 242, 254, 0.96) 100%);
}

.designer-ai-content__message--error {
  align-self: flex-start;
  border-color: rgba(248, 113, 113, 0.28);
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.98) 0%, rgba(255, 247, 247, 0.96) 100%);
}

.designer-ai-content__job-progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
}

.designer-ai-content__job-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.designer-ai-content__job-progress-head > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.designer-ai-content__job-progress-head strong {
  color: #0f172a;
  font-size: 13px;
}

.designer-ai-content__job-progress-head > span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.designer-ai-content__job-progress-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: #475569;
  font-size: 12px;
}

.designer-ai-content__job-progress p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.designer-ai-content__assistant-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.designer-ai-content__assistant-summary-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.designer-ai-content__assistant-summary-reply {
  margin: 0;
  color: #1e293b;
  line-height: 1.7;
}

.designer-ai-content__assistant-summary-block {
  padding-top: 12px;
  border-top: 1px dashed #e5e7eb;
}

.designer-ai-content__assistant-summary-line {
  margin-top: 6px;
  color: #475569;
  line-height: 1.6;
}

.designer-ai-content__assistant-summary-note {
  margin-top: 6px;
  color: #b45309;
  line-height: 1.6;
}

.designer-ai-content__composer {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 12px;
  padding-top: 2px;
}

.designer-ai-content__mode-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.designer-ai-content__mode-tabs {
  flex: 0 0 auto;
}

.designer-ai-content__billing-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.designer-ai-content__billing-row span {
  min-width: 0;
}

.designer-ai-content__composer :deep(.ivu-input) {
  border-radius: 14px;
}

.designer-ai-content__composer-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.designer-ai-content__composer-foot small {
  color: #64748b;
  line-height: 1.5;
}

.designer-ai-content__composer-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
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
  .designer-ai-content__chat {
    padding: 12px;
  }

  .designer-ai-content__overview,
  .designer-ai-content__summary,
  .designer-ai-content__targets {
    grid-template-columns: 1fr;
  }

  .designer-ai-content__composer-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .designer-ai-content__composer-actions {
    justify-content: flex-start;
  }
}
</style>
