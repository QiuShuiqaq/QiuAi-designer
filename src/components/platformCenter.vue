<template>
  <platformCenterContent v-if="embedded" embedded />

  <div v-else class="platform-center">
    <Button type="text" class="platform-center__trigger" @click="openModal">
      <span class="platform-center__trigger-main">{{ triggerTitle }}</span>
      <span class="platform-center__trigger-sub">{{ triggerSubtitle }}</span>
    </Button>

    <Modal v-model="visible" title="平台中心" width="1020" footer-hide>
      <platformCenterContent @status-change="syncTrigger" />
    </Modal>
  </div>
</template>

<script setup lang="ts" name="PlatformCenter">
import platformCenterContent from './platformCenterContent.vue';

defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
});

const visible = ref(false);
const triggerTitle = ref('平台中心');
const triggerSubtitle = ref('未激活');

function openModal() {
  visible.value = true;
}

function syncTrigger(payload: { title: string; subtitle: string }) {
  triggerTitle.value = payload.title;
  triggerSubtitle.value = payload.subtitle;
}
</script>

<style scoped lang="less">
.platform-center {
  display: inline-flex;
  align-items: center;
}

.platform-center__trigger {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  height: auto;
  line-height: 1.1;
  padding: 4px 8px;
}

.platform-center__trigger-main {
  font-size: 13px;
  font-weight: 600;
}

.platform-center__trigger-sub {
  font-size: 11px;
  color: #667085;
}
</style>
