<script lang="ts" setup>
import align from '@/components/align.vue';
import centerAlign from '@/components/centerAlign.vue';
import flip from '@/components/flip.vue';
import clone from '@/components/clone.vue';
import hide from '@/components/hide.vue';
import group from '@/components/group.vue';
import lock from '@/components/lock.vue';
import dele from '@/components/del.vue';
import bgBar from '@/components/bgBar.vue';
import setSize from '@/components/setSize.vue';
import replaceImg from '@/components/replaceImg.vue';
import filters from '@/components/filters.vue';
import imgStroke from '@/components/imgStroke.vue';
import attributePostion from '@/components/attributePostion.vue';
import attributeId from '@/components/attributeId.vue';
import attributeShadow from '@/components/attributeShadow.vue';
import attributeBorder from '@/components/attributeBorder.vue';
import attributeRounded from '@/components/attributeRounded.vue';
import attributeFont from '@/components/attributeFont.vue';
import attributeTextFloat from '@/components/attributeTextFloat.vue';
import attributeColor from '@/components/attributeColor.vue';
import attributeBarcode from '@/components/attributeBarcode.vue';
import attributeQrCode from '@/components/attributeQrCode.vue';
import cropperImg from '@/components/cropperImg.vue';
import useSelectListen from '@/hooks/useSelectListen';

const canvasEditor: any = inject('canvasEditor');
const { mixinState } = useSelectListen(canvasEditor);
const attrBarShow = ref(true);

const switchAttrBar = () => {
  attrBarShow.value = !attrBarShow.value;
};
</script>

<template>
  <aside class="right-panel" :class="{ 'right-panel--collapsed': !attrBarShow }">
    <div class="right-panel__header">
      <strong v-if="attrBarShow">属性</strong>
      <button type="button" class="right-panel__toggle" @click="switchAttrBar">
        {{ attrBarShow ? '收起' : '属性' }}
      </button>
    </div>

    <div class="right-bar" v-show="attrBarShow">
      <div>
        <div v-show="!mixinState.mSelectMode">
          <set-size></set-size>
          <bg-bar></bg-bar>
        </div>

        <div v-show="mixinState.mSelectMode === 'multiple'">
          <group></group>
          <align></align>
          <center-align></center-align>
        </div>

        <div v-show="mixinState.mSelectMode === 'one'" class="attr-item-box">
          <group></group>
          <Divider plain orientation="left">
            <h4>快捷操作</h4>
          </Divider>
          <div class="bg-item" v-show="mixinState.mSelectMode">
            <lock></lock>
            <dele></dele>
            <clone></clone>
            <hide></hide>
            <edit></edit>
          </div>

          <center-align></center-align>
          <replaceImg></replaceImg>
          <cropperImg></cropperImg>
          <clip-image></clip-image>
          <flip></flip>
          <attributeBarcode></attributeBarcode>
          <attributeQrCode></attributeQrCode>
          <filters></filters>
          <imgStroke />
          <attributeColor></attributeColor>
          <attributeFont></attributeFont>
          <attributeTextFloat></attributeTextFloat>
          <attribute-text-content></attribute-text-content>
          <attributePostion></attributePostion>
          <attributeShadow></attributeShadow>
          <attributeBorder></attributeBorder>
          <attributeRounded></attributeRounded>
          <attributeId></attributeId>

          <Button @click="canvasEditor.getFontJson()" size="small">获取元素数据</Button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style lang="less" scoped>
.right-panel {
  display: flex;
  width: 304px;
  min-width: 304px;
  height: 100%;
  flex-direction: column;
  border-left: 1px solid #eef2f8;
  background: #fff;
  transition: width 0.18s ease, min-width 0.18s ease;
}

.right-panel--collapsed {
  width: 44px;
  min-width: 44px;
}

.right-panel__header {
  display: flex;
  height: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-bottom: 1px solid #eef2f8;
}

.right-panel--collapsed .right-panel__header {
  justify-content: center;
  padding: 0;
}

.right-panel__header strong {
  color: #111827;
  font-size: 14px;
}

.right-panel__toggle {
  height: 26px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #475467;
  cursor: pointer;
  font-size: 12px;
  line-height: 24px;
}

.right-panel__toggle:hover {
  border-color: #2d8cf0;
  color: #2d8cf0;
}

.right-bar {
  flex: 1;
  min-height: 0;
  padding: 10px;
  overflow-y: auto;
}

:deep(.attr-item) {
  position: relative;
  margin-bottom: 12px;
  height: 40px;
  padding: 0 10px;
  background: #f6f7f9;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;

  .ivu-tooltip {
    text-align: center;
    flex: 1;
  }
}
</style>
