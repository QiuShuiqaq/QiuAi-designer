<template>
  <div class="designer-ai">
    <Button type="text" class="designer-ai__trigger" :disabled="!platformReady" @click="openModal">
      AI
    </Button>

    <Modal v-model="visible" title="AI 设计助手" width="760" footer-hide>
      <div v-if="!platformReady" class="designer-ai__empty">
        <Alert type="warning" show-icon>
          <template #desc>
            未配置 `APP_PLATFORM_API_BASE_URL`，当前无法连接 qiuai-platform。
          </template>
        </Alert>
      </div>

      <div v-else class="designer-ai__body">
        <Spin fix v-if="isLoading" />

        <Alert v-if="errorMessage" type="error" show-icon>
          <template #desc>{{ errorMessage }}</template>
        </Alert>

        <Alert v-if="infoMessage" type="info" show-icon>
          <template #desc>{{ infoMessage }}</template>
        </Alert>

        <div class="designer-ai__summary">
          <div class="designer-ai__summary-card">
            <span>模板</span>
            <strong>{{ templateId }}</strong>
          </div>
          <div class="designer-ai__summary-card">
            <span>AI 槽位</span>
            <strong>{{ slots.length }}</strong>
          </div>
          <div class="designer-ai__summary-card">
            <span>可选目标</span>
            <strong>{{ enabledSlots.length }}</strong>
          </div>
          <div class="designer-ai__summary-card">
            <span>运行模式</span>
            <strong>{{ capabilities?.mockEnabled ? 'Mock' : 'Provider' }}</strong>
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
              placeholder="描述你想调整的背景、标题、副标题或按钮文案"
            />
          </FormItem>

          <FormItem label="目标">
            <div v-if="enabledSlots.length" class="designer-ai__targets">
              <label v-for="slot in enabledSlots" :key="slot.id" class="designer-ai__target">
                <Checkbox
                  :model-value="selectedSlotIds.includes(slot.id)"
                  @on-change="toggleSlot(slot.id, $event)"
                />
                <div class="designer-ai__target-meta">
                  <strong>{{ slot.slotName }}</strong>
                  <span>{{ slot.role }} / {{ slot.aiMode }}</span>
                </div>
              </label>
            </div>
            <Alert v-else type="warning" show-icon>
              <template #desc>
                当前模板没有 AI 槽位。需要在模板对象上添加 `extensionType: "ai-slot"` 和对应
                `extension.role` 后才能使用。
              </template>
            </Alert>
          </FormItem>
        </Form>

        <div v-if="currentJob" class="designer-ai__job">
          <div class="designer-ai__job-head">
            <strong>当前任务</strong>
            <Tag :color="jobStatusColor">{{ currentJob.status }}</Tag>
          </div>
          <div class="designer-ai__job-meta">
            <span>任务 ID：{{ currentJob.jobId }}</span>
            <span>队列位置：{{ currentJob.queuePosition }}</span>
            <span>更新时间：{{ formatTime(currentJob.updatedAt) }}</span>
          </div>
          <div v-if="currentJob.error" class="designer-ai__job-error">
            {{ currentJob.error.message }}
          </div>
        </div>

        <div class="designer-ai__actions">
          <Button @click="refreshSlots" :disabled="isSubmitting || isPolling">刷新槽位</Button>
          <Button v-if="canCancelJob" @click="cancelJob" :loading="isCancelling">取消任务</Button>
          <Button type="primary" :loading="isSubmitting" :disabled="!canSubmit" @click="submitJob">
            生成并应用
          </Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts" name="DesignerAiPanel">
import { Message } from 'view-ui-plus';
import { useRoute } from 'vue-router';

import useSelect from '@/hooks/select';
import { applyDesignerAiPatch } from '@/modules/designer-ai/patch';
import { extractDesignerAiTemplateSlots } from '@/modules/designer-ai/template-slots';
import { isPlatformApiConfigured } from '@/platform/config';
import {
  cancelDesignerAiJob,
  createDesignerAiJob,
  getDesignerAiCapabilities,
  getDesignerAiJob,
} from '@/platform/designer-ai';
import type {
  DesignerAiCapabilities,
  DesignerAiJob,
  DesignerAiTemplateSlot,
  DesignerAiTemplateSlotsPayload,
} from '@/platform/types';

const route = useRoute();
const { canvasEditor } = useSelect();

const platformReady = isPlatformApiConfigured();

const visible = ref(false);
const isLoading = ref(false);
const isSubmitting = ref(false);
const isPolling = ref(false);
const isCancelling = ref(false);
const errorMessage = ref('');
const infoMessage = ref('');
const prompt = ref('');
const language = ref('zh-CN');
const capabilities = ref<DesignerAiCapabilities | null>(null);
const parsedSlots = ref<DesignerAiTemplateSlotsPayload | null>(null);
const selectedSlotIds = ref<string[]>([]);
const currentJob = ref<DesignerAiJob | null>(null);

let pollingTimer: ReturnType<typeof setTimeout> | null = null;

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
const selectedSlots = computed(() =>
  enabledSlots.value.filter((slot) => selectedSlotIds.value.includes(slot.id))
);

const canSubmit = computed(() => {
  return Boolean(
    platformReady &&
      prompt.value.trim() &&
      selectedSlots.value.length &&
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

function getCanvasSnapshot() {
  const json = canvasEditor.getJson();
  const parsed = JSON.parse(json) as {
    width?: number;
    height?: number;
    objects?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };

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

function getDefaultSelectedIds(nextSlots: DesignerAiTemplateSlot[]) {
  const preferredRoles = ['background', 'title', 'subtitle', 'cta'];
  const preferred = nextSlots
    .filter((slot) => slot.aiEnabled && preferredRoles.includes(slot.role))
    .map((slot) => slot.id);

  if (preferred.length) {
    return preferred;
  }

  return nextSlots
    .filter((slot) => slot.aiEnabled)
    .slice(0, 4)
    .map((slot) => slot.id);
}

async function loadCapabilities() {
  capabilities.value = await getDesignerAiCapabilities();
  if (!supportedLanguages.value.includes(language.value)) {
    language.value = supportedLanguages.value[0] || 'zh-CN';
  }
}

async function refreshSlots() {
  errorMessage.value = '';
  infoMessage.value = '';

  try {
    const { snapshot } = getCanvasSnapshot();
    const nextParsedSlots = extractDesignerAiTemplateSlots({
      templateId: templateId.value,
      templateSnapshot: snapshot,
    });

    parsedSlots.value = nextParsedSlots;

    const nextEnabledIds = new Set(
      nextParsedSlots.slots.filter((slot) => slot.aiEnabled).map((slot) => slot.id)
    );
    const retained = selectedSlotIds.value.filter((id) => nextEnabledIds.has(id));
    selectedSlotIds.value = retained.length
      ? retained
      : getDefaultSelectedIds(nextParsedSlots.slots);

    if (!nextParsedSlots.slots.length) {
      infoMessage.value = '当前画布没有识别到 AI 槽位。';
      return;
    }

    if (!nextParsedSlots.slots.some((slot) => slot.aiEnabled)) {
      infoMessage.value = '当前模板存在槽位，但没有启用 AI。';
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '槽位解析失败';
  }
}

function toggleSlot(slotId: string, checked: boolean) {
  if (checked) {
    if (!selectedSlotIds.value.includes(slotId)) {
      selectedSlotIds.value = [...selectedSlotIds.value, slotId];
    }
    return;
  }

  selectedSlotIds.value = selectedSlotIds.value.filter((id) => id !== slotId);
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
      errorMessage.value = error instanceof Error ? error.message : '任务轮询失败';
    }
  };

  await run();
}

async function submitJob() {
  if (!canSubmit.value) {
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = '';
  infoMessage.value = '';

  try {
    const { width, height, snapshot } = getCanvasSnapshot();
    const targets = selectedSlots.value.map((slot) => ({
      slotId: slot.id,
      role: slot.role,
      mode: slot.aiMode,
    }));

    const response = await createDesignerAiJob({
      templateId: templateId.value,
      language: language.value,
      userPrompt: prompt.value.trim(),
      targets,
      canvas: {
        width,
        height,
      },
      templateSnapshot: snapshot,
    });

    currentJob.value = await getDesignerAiJob(response.jobId);
    await pollJob(response.jobId);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '任务创建失败';
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
    Message.error(error instanceof Error ? error.message : '取消任务失败');
  } finally {
    isCancelling.value = false;
  }
}

async function bootstrapModal() {
  if (!platformReady) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  infoMessage.value = '';

  try {
    await loadCapabilities();
    await refreshSlots();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'AI 面板初始化失败';
  } finally {
    isLoading.value = false;
  }
}

async function openModal() {
  visible.value = true;
  await bootstrapModal();
}

watch(visible, (nextVisible) => {
  if (!nextVisible) {
    clearPolling();
    isPolling.value = false;
  }
});

onBeforeUnmount(() => {
  clearPolling();
});
</script>

<style scoped lang="less">
.designer-ai {
  display: inline-flex;
  align-items: center;
}

.designer-ai__trigger {
  padding: 0 10px;
}

.designer-ai__body {
  position: relative;
  min-height: 260px;
}

.designer-ai__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.designer-ai__summary-card,
.designer-ai__job {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.designer-ai__summary-card {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.designer-ai__summary-card span {
  color: #667085;
  font-size: 12px;
}

.designer-ai__summary-card strong {
  color: #111827;
  word-break: break-all;
}

.designer-ai__targets {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.designer-ai__target {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
  cursor: pointer;
}

.designer-ai__target-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.designer-ai__target-meta strong {
  color: #111827;
}

.designer-ai__target-meta span {
  color: #667085;
  font-size: 12px;
}

.designer-ai__job {
  margin-top: 18px;
  padding: 14px 16px;
}

.designer-ai__job-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.designer-ai__job-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #475467;
  font-size: 12px;
}

.designer-ai__job-error {
  margin-top: 10px;
  color: #b42318;
}

.designer-ai__actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.designer-ai__empty {
  padding: 8px 0;
}

@media (max-width: 900px) {
  .designer-ai__summary,
  .designer-ai__targets {
    grid-template-columns: 1fr;
  }
}
</style>
