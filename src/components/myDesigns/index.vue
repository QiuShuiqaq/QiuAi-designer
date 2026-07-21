<template>
  <section class="my-designs">
    <div class="my-designs__head">
      <div>
        <h3>我的设计</h3>
        <p>本机自动保存的设计稿</p>
      </div>
      <Button size="small" :loading="loading" @click="reloadDesigns">刷新</Button>
    </div>

    <Spin fix v-if="loading" />

    <div v-if="designs.length" class="my-designs__grid">
      <article v-for="design in designs" :key="design.id" class="my-designs__card">
        <button type="button" class="my-designs__preview" @click="openDesign(design)">
          <img v-if="design.previewDataUrl" :src="design.previewDataUrl" :alt="design.name" />
          <span v-else>暂无预览</span>
        </button>

        <div class="my-designs__meta">
          <Tooltip :content="design.name" placement="top">
            <strong>{{ design.name }}</strong>
          </Tooltip>
          <small>{{ formatTime(design.updatedAt) }}</small>
        </div>

        <div class="my-designs__actions">
          <Button size="small" type="primary" ghost @click="openDesign(design)">打开</Button>
          <Poptip
            confirm
            title="确定删除这个本地设计吗？"
            transfer
            @on-ok="removeDesign(design.id)"
          >
            <Button size="small" type="error" ghost>删除</Button>
          </Poptip>
        </div>
      </article>
    </div>

    <div v-else-if="!loading" class="my-designs__empty">
      还没有本地设计。选择模板或编辑画布后会自动保存。
    </div>
  </section>
</template>

<script setup lang="ts" name="MyDesigns">
import { Message } from 'view-ui-plus';
import { onActivated, onBeforeUnmount, onMounted, ref } from 'vue';

import useSelect from '@/hooks/select';
import {
  deleteLocalDesign,
  listLocalDesigns,
  LOCAL_WORKSPACE_CHANGED_EVENT,
  type LocalDesign,
} from '@/modules/local-workspace/store';
import { loadLocalDesignToCanvas, saveCurrentDesign } from '@/modules/local-workspace/workspace';

const { canvasEditor } = useSelect();

const loading = ref(false);
const designs = ref<LocalDesign[]>([]);

function formatTime(value: string) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString();
}

async function reloadDesigns() {
  loading.value = true;
  try {
    designs.value = await listLocalDesigns();
  } finally {
    loading.value = false;
  }
}

async function openDesign(design: LocalDesign) {
  try {
    await saveCurrentDesign(canvasEditor);
    await loadLocalDesignToCanvas(canvasEditor, design);
    Message.success('已打开本地设计');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '打开本地设计失败');
  }
}

async function removeDesign(id: string) {
  try {
    await deleteLocalDesign(id);
    await reloadDesigns();
    Message.success('已删除本地设计');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '删除本地设计失败');
  }
}

function handleWorkspaceChanged(event: Event) {
  const detail = (event as CustomEvent<{ store?: string }>).detail;
  if (!detail || detail.store === 'designs') {
    void reloadDesigns();
  }
}

onMounted(() => {
  window.addEventListener(LOCAL_WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
  void reloadDesigns();
});

onActivated(() => {
  void reloadDesigns();
});

onBeforeUnmount(() => {
  window.removeEventListener(LOCAL_WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
});
</script>

<style scoped lang="less">
.my-designs {
  position: relative;
  height: 100%;
  min-height: 0;
  padding: 12px 0 18px;
  box-sizing: border-box;
}

.my-designs__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.my-designs__head h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  line-height: 1.3;
}

.my-designs__head p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.my-designs__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding-bottom: 16px;
}

.my-designs__card {
  min-width: 0;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.my-designs__preview {
  display: flex;
  width: 100%;
  aspect-ratio: 4 / 5;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: #f8fafc;
  cursor: pointer;
  overflow: hidden;
}

.my-designs__preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.my-designs__preview span {
  color: #94a3b8;
  font-size: 12px;
}

.my-designs__meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  margin-top: 8px;
}

.my-designs__meta strong {
  display: block;
  color: #111827;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-designs__meta small {
  color: #94a3b8;
  font-size: 11px;
}

.my-designs__actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.my-designs__actions :deep(.ivu-btn) {
  flex: 1;
  min-width: 0;
  padding-inline: 6px;
}

.my-designs__empty {
  padding: 28px 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  line-height: 1.7;
  text-align: center;
  background: #f8fafc;
}
</style>
