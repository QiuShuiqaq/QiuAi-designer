<!--
 * @Author: 秦少卫
 * @Date: 2024-05-17 15:30:21
 * @LastEditors: 秦少卫
 * @LastEditTime: 2024-11-18 10:30:30
 * @Description: file content
-->
<template>
  <div class="home">
    <Layout>
      <Top v-if="state.show" :ruler="state.ruler" @update:ruler="rulerSwitch"></Top>
      <Content style="display: flex; height: calc(100vh - 64px); position: relative">
        <Left v-if="state.show"></Left>
        <div id="workspace">
          <div class="canvas-box">
            <div class="inside-shadow"></div>
            <canvas id="canvas" :class="state.ruler ? 'design-stage-grid' : ''"></canvas>
            <dragMode v-if="state.show"></dragMode>
            <zoom></zoom>
          </div>
        </div>
        <Right v-if="state.show"></Right>
      </Content>
    </Layout>
  </div>
</template>

<script name="Home" setup lang="ts">
import Top from './components/top/index.vue';
import Left from './components/left/index.vue';
import Right from './components/right/index.vue';

import zoom from '@/components/zoom.vue';
import dragMode from '@/components/dragMode.vue';
import { fabric } from 'fabric';

import Editor, {
  IEditor,
  DringPlugin,
  AlignGuidLinePlugin,
  ControlsPlugin,
  CenterAlignPlugin,
  LayerPlugin,
  CopyPlugin,
  MoveHotKeyPlugin,
  DeleteHotKeyPlugin,
  GroupPlugin,
  DrawLinePlugin,
  GroupTextEditorPlugin,
  GroupAlignPlugin,
  WorkspacePlugin,
  HistoryPlugin,
  FlipPlugin,
  RulerPlugin,
  MaterialPlugin,
  WaterMarkPlugin,
  FontPlugin,
  PolygonModifyPlugin,
  DrawPolygonPlugin,
  FreeDrawPlugin,
  PathTextPlugin,
  PsdPlugin,
  SimpleClipImagePlugin,
  BarCodePlugin,
  QrCodePlugin,
  ImageStroke,
  ResizePlugin,
  LockPlugin,
  AddBaseTypePlugin,
  MaskPlugin,
} from '@kuaitu/core';

const APIHOST = import.meta.env.APP_APIHOST;
const canvasEditor = new Editor() as IEditor;

const state = reactive({
  show: false,
  select: null,
  ruler: true,
});

onMounted(() => {
  const canvas = new fabric.Canvas('canvas', {
    fireRightClick: true,
    stopContextMenu: true,
    controlsAboveOverlay: true,
    preserveObjectStacking: true,
  });

  canvasEditor.init(canvas);
  canvasEditor
    .use(DringPlugin)
    .use(PolygonModifyPlugin)
    .use(AlignGuidLinePlugin)
    .use(ControlsPlugin)
    .use(CenterAlignPlugin)
    .use(LayerPlugin)
    .use(CopyPlugin)
    .use(MoveHotKeyPlugin)
    .use(DeleteHotKeyPlugin)
    .use(GroupPlugin)
    .use(DrawLinePlugin)
    .use(GroupTextEditorPlugin)
    .use(GroupAlignPlugin)
    .use(WorkspacePlugin)
    .use(HistoryPlugin)
    .use(FlipPlugin)
    .use(RulerPlugin)
    .use(DrawPolygonPlugin)
    .use(FreeDrawPlugin)
    .use(PathTextPlugin)
    .use(SimpleClipImagePlugin)
    .use(BarCodePlugin)
    .use(QrCodePlugin)
    .use(FontPlugin, {
      repoSrc: APIHOST,
    })
    .use(MaterialPlugin, {
      repoSrc: APIHOST,
    })
    .use(WaterMarkPlugin)
    .use(PsdPlugin)
    .use(ImageStroke)
    .use(ResizePlugin)
    .use(LockPlugin)
    .use(AddBaseTypePlugin)
    .use(MaskPlugin);

  state.show = true;
  if (state.ruler) {
    canvasEditor.rulerEnable();
  }
});

onUnmounted(() => canvasEditor.destory());

const rulerSwitch = (val) => {
  if (val) {
    canvasEditor.rulerEnable();
  } else {
    canvasEditor.rulerDisable();
  }
  document.activeElement.blur();
};

provide('fabric', fabric);
provide('canvasEditor', canvasEditor);
</script>

<style lang="less" scoped>
:deep(.ivu-layout-header) {
  --height: 45px;
  padding: 0 0;
  border-bottom: 1px solid #eef2f8;
  background: #fff;
  height: var(--height);
  line-height: var(--height);
  display: flex;
  justify-content: space-between;
}

.home,
.ivu-layout {
  height: 100vh;
}

.icon {
  display: block;
}

.canvas-box {
  position: relative;
}

.inside-shadow {
  position: absolute;
  width: 100%;
  height: 100%;
  box-shadow: inset 0 0 9px 2px #0000001f;
  z-index: 2;
  pointer-events: none;
}

#canvas {
  width: 300px;
  height: 300px;
  margin: 0 auto;
}

#workspace {
  flex: 1;
  width: 100%;
  position: relative;
  background: #f1f1f1;
  overflow: hidden;
}

.switch {
  margin-right: 10px;
}

.design-stage-grid {
  --offsetX: 0px;
  --offsetY: 0px;
  --size: 16px;
  --color: #dedcdc;
  background-image: linear-gradient(
      45deg,
      var(--color) 25%,
      transparent 0,
      transparent 75%,
      var(--color) 0
    ),
    linear-gradient(45deg, var(--color) 25%, transparent 0, transparent 75%, var(--color) 0);
  background-position: var(--offsetX) var(--offsetY),
    calc(var(--size) + var(--offsetX)) calc(var(--size) + var(--offsetY));
  background-size: calc(var(--size) * 2) calc(var(--size) * 2);
}
</style>
