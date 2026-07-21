<template>
  <designerAiContent v-if="embedded" embedded />

  <div v-else class="designer-ai">
    <Button type="text" class="designer-ai__trigger" :disabled="!platformReady" @click="openModal">
      AI
    </Button>

    <Modal v-model="visible" title="智能体设计师" width="760" footer-hide>
      <designerAiContent />
    </Modal>
  </div>
</template>

<script setup lang="ts" name="DesignerAiPanel">
import { isPlatformApiConfigured } from '@/platform/config';

import designerAiContent from './designerAiContent.vue';

defineProps({
  embedded: {
    type: Boolean,
    default: false,
  },
});

const platformReady = isPlatformApiConfigured();
const visible = ref(false);

function openModal() {
  visible.value = true;
}
</script>

<style scoped lang="less">
.designer-ai {
  display: inline-flex;
  align-items: center;
}

.designer-ai__trigger {
  padding: 0 10px;
}
</style>
