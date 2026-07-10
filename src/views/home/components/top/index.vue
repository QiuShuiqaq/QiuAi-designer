<template>
  <Header>
    <div class="left">
      <logo></logo>
      <Divider type="vertical" />

      <import-Json></import-Json>
      <Divider type="vertical" />
      <import-file></import-file>
      <Divider type="vertical" />
      <Button type="text" to="/template" target="_blank">模板广场</Button>
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
      <save></save>
      <lang></lang>
    </div>
  </Header>
</template>

<script name="Top" setup lang="ts">
import history from '@/components/history.vue';
import importFile from '@/components/importFile.vue';
import importJson from '@/components/importJSON.vue';
import lang from '@/components/lang.vue';
import logo from '@/components/logo.vue';
import myTemplName from '@/components/myTemplName.vue';
import previewCurrent from '@/components/previewCurrent';
import save from '@/components/save.vue';

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
