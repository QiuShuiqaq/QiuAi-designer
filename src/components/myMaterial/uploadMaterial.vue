<template>
  <section class="local-materials">
    <Button
      icon="md-cloud-upload"
      long
      type="primary"
      :loading="uploading"
      @click="uploadImgHandule"
    >
      上传本地图片
    </Button>

    <Spin fix v-if="loading" />

    <div v-if="fileList.length" class="img-group">
      <Tooltip
        v-for="info in fileList"
        :key="info.id"
        :content="info.name"
        placement="top"
        transfer
      >
        <div class="tmpl-img-box">
          <Icon
            type="ios-trash"
            class="del-btn"
            color="#ef4444"
            @click.stop="removeMaterialHandle(info.id)"
          />
          <Image
            lazy
            :src="info.previewDataUrl || info.dataUrl"
            fit="contain"
            height="100%"
            width="100%"
            :alt="info.name"
            @click="addImgByElement"
          />
        </div>
      </Tooltip>
    </div>

    <div class="tip" v-else-if="!loading">
      暂无素材。上传图片或使用智能体生成图片后会自动出现在这里。
    </div>
  </section>
</template>

<script setup lang="ts" name="UploadMaterial">
import { Message } from 'view-ui-plus';
import { onActivated, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  deleteLocalImageAsset,
  listLocalImageAssets,
  LOCAL_WORKSPACE_CHANGED_EVENT,
  type LocalAsset,
} from '@/modules/local-workspace/store';
import { saveUploadedImageFile } from '@/modules/local-workspace/assets';
import { Utils } from '@kuaitu/core';

const { selectFiles } = Utils;
const canvasEditor = inject('canvasEditor') as any;

const loading = ref(false);
const uploading = ref(false);
const fileList = ref<LocalAsset[]>([]);

async function getFileListHandle() {
  loading.value = true;
  try {
    fileList.value = await listLocalImageAssets();
  } finally {
    loading.value = false;
  }
}

async function uploadImgHandule() {
  uploading.value = true;
  try {
    const selectedFiles = await selectFiles({
      accept: 'image/*',
    });
    const [file] = selectedFiles || [];
    if (!file) {
      return;
    }

    await saveUploadedImageFile(file);
    await getFileListHandle();
    Message.success('图片已保存到本地素材');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '上传本地图片失败');
  } finally {
    uploading.value = false;
  }
}

async function addImgByElement(e: MouseEvent) {
  const target = e.target as HTMLImageElement;
  if (!target) {
    return;
  }

  const imgItem = await canvasEditor.createImgByElement(target);
  canvasEditor.addBaseType(imgItem, {
    scale: true,
  });
}

async function removeMaterialHandle(id: string) {
  try {
    await deleteLocalImageAsset(id);
    await getFileListHandle();
    Message.success('已删除本地素材');
  } catch (error) {
    Message.error(error instanceof Error ? error.message : '删除本地素材失败');
  }
}

function handleWorkspaceChanged(event: Event) {
  const detail = (event as CustomEvent<{ store?: string }>).detail;
  if (!detail || detail.store === 'assets') {
    void getFileListHandle();
  }
}

onMounted(() => {
  window.addEventListener(LOCAL_WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
  void getFileListHandle();
});

onActivated(() => {
  void getFileListHandle();
});

onBeforeUnmount(() => {
  window.removeEventListener(LOCAL_WORKSPACE_CHANGED_EVENT, handleWorkspaceChanged);
});
</script>

<style scoped lang="less">
.local-materials {
  position: relative;
  height: 100%;
  min-height: 0;
  padding: 12px 0 18px;
  box-sizing: border-box;
}

.img-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
  padding: 10px;
  border-radius: 12px;
  background: #f8fafc;
}

.tmpl-img-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  overflow: hidden;

  &:hover {
    border-color: #93c5fd;

    .del-btn {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

.tmpl-img-box :deep(.ivu-image) {
  width: 100%;
  height: 100%;
}

.tmpl-img-box :deep(.ivu-image-img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.del-btn {
  z-index: 2;
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.16);
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.tip {
  margin-top: 12px;
  padding: 28px 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  color: #64748b;
  line-height: 1.7;
  text-align: center;
  background: #f8fafc;
}
</style>
