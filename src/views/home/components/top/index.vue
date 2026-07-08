<template>
  <Header>
    <div class="left">
      <logo></logo>
      <Divider type="vertical" />

      <import-Json></import-Json>
      <Divider type="vertical" />
      <import-file></import-file>
      <Divider type="vertical" />
      <Button type="text" to="/template" target="_blank">鍏ㄩ儴妯℃澘</Button>
      <Divider type="vertical" />

      <myTemplName></myTemplName>
      <Tooltip :content="$t('grid')">
        <iSwitch v-model="toggleModel" size="small" class="switch"></iSwitch>
      </Tooltip>
      <Divider type="vertical" />
      <history></history>
    </div>

    <div class="right">
      <previewCurrent />
      <designerAiPanel />
      <save></save>
      <platformCenter></platformCenter>
      <lang></lang>
    </div>
  </Header>
</template>

<script name="Top" setup lang="ts">
import importJson from '@/components/importJSON.vue';
import importFile from '@/components/importFile.vue';
import logo from '@/components/logo.vue';
import myTemplName from '@/components/myTemplName.vue';
import previewCurrent from '@/components/previewCurrent';
import save from '@/components/save.vue';
import lang from '@/components/lang.vue';
import history from '@/components/history.vue';
import platformCenter from '@/components/platformCenter.vue';
import designerAiPanel from '@/components/designerAiPanel.vue';

const props = defineProps(['ruler']);
const emit = defineEmits(['update:ruler']);

const toggleModel = computed({
  get() {
    return props.ruler;
  },
  set(value) {
    emit('update:ruler', value);
  },
});
</script>

<style lang="less" scoped>
.left,
.right {
  display: flex;
  align-items: center;

  img {
    display: block;
    margin-right: 10px;
  }
}
</style>
