<template>
  <div>
    <Divider plain orientation="left">{{ $t('common_elements') }}</Divider>
    <div class="tool-box">
      <span @click="() => addText()" :draggable="true" @dragend="addText">
        <textIcon width="26" height="26"></textIcon>
      </span>
      <span @click="() => addTextBox()" :draggable="true" @dragend="addTextBox">
        <textBoxIcon width="26" height="26"></textBoxIcon>
      </span>
      <span @click="() => addRect()" :draggable="true" @dragend="addRect">
        <rectIcon width="26" height="26"></rectIcon>
      </span>
      <span @click="() => addCircle()" :draggable="true" @dragend="addCircle">
        <circleIcon width="26" height="26"></circleIcon>
      </span>
      <span @click="() => addTriangle()" :draggable="true" @dragend="addTriangle">
        <triangleIcon width="26" height="26"></triangleIcon>
      </span>
      <span @click="() => addPolygon()" :draggable="true" @dragend="addPolygon">
        <polygonIcon width="26" height="26"></polygonIcon>
      </span>
    </div>
    <Divider plain orientation="left">{{ $t('draw_elements') }}</Divider>
    <div class="tool-box">
      <span
        @click="drawingLineModeSwitch('line')"
        :class="state.isDrawingLineMode && state.lineType === 'line' && 'bg'"
      >
        <draw1Icon width="20" height="20"></draw1Icon>
      </span>
      <span
        @click="drawingLineModeSwitch('arrow')"
        :class="state.isDrawingLineMode && state.lineType === 'arrow' && 'bg'"
      >
        <draw2Icon width="20" height="20"></draw2Icon>
      </span>
      <span
        @click="drawingLineModeSwitch('thinTailArrow')"
        :class="state.isDrawingLineMode && state.lineType === 'thinTailArrow' && 'bg'"
      >
        <draw3Icon width="20" height="20"></draw3Icon>
      </span>
      <span
        @click="drawPolygon"
        :class="state.isDrawingLineMode && state.lineType === 'polygon' && 'bg'"
      >
        <draw4Icon width="20" height="20"></draw4Icon>
      </span>
      <span
        @click="freeDraw"
        :class="state.isDrawingLineMode && state.lineType === 'freeDraw' && 'bg'"
      >
        <Icon type="md-brush" :size="22" />
      </span>
    </div>
    <Divider plain orientation="left">{{ $t('code_img') }}</Divider>
    <div class="tool-box">
      <span @click="canvasEditor.addQrCode">
        <qrCodeIcon></qrCodeIcon>
      </span>
      <span @click="canvasEditor.addBarcode">
        <barCodeIcon></barCodeIcon>
      </span>
    </div>
  </div>
</template>

<script setup name="Tools">
import { getPolygonVertices } from '@/utils/math';
import useSelect from '@/hooks/select';
import circleIcon from '@/assets/icon/tools/circle.svg';
import draw1Icon from '@/assets/icon/tools/draw1.svg';
import draw2Icon from '@/assets/icon/tools/draw2.svg';
import draw3Icon from '@/assets/icon/tools/draw3.svg';
import draw4Icon from '@/assets/icon/tools/draw4.svg';
import polygonIcon from '@/assets/icon/tools/polygon.svg';
import rectIcon from '@/assets/icon/tools/rect.svg';
import textIcon from '@/assets/icon/tools/text.svg';
import textBoxIcon from '@/assets/icon/tools/textBox.svg';
import triangleIcon from '@/assets/icon/tools/triangle.svg';
import qrCodeIcon from '@/assets/icon/tools/qrCode.svg';
import barCodeIcon from '@/assets/icon/tools/barCode.svg';
import { useI18n } from 'vue-i18n';

const LINE_TYPE = {
  polygon: 'polygon',
  freeDraw: 'freeDraw',
  pathText: 'pathText',
};

const defaultPosition = { shadow: '', fontFamily: 'arial' };
const { t } = useI18n();
const { fabric, canvasEditor } = useSelect();
const state = reactive({
  isDrawingLineMode: false,
  lineType: false,
});

const addText = (event) => {
  cancelDraw();
  const text = new fabric.IText(t('everything_is_fine'), {
    ...defaultPosition,
    fontSize: 80,
    fill: '#000000FF',
  });

  canvasEditor.addBaseType(text, { center: true, event });
};

const addTextBox = (event) => {
  cancelDraw();
  const text = new fabric.Textbox(t('everything_goes_well'), {
    ...defaultPosition,
    splitByGrapheme: true,
    width: 400,
    fontSize: 80,
    fill: '#000000FF',
  });

  canvasEditor.addBaseType(text, { center: true, event });
};

const addTriangle = (event) => {
  cancelDraw();
  const triangle = new fabric.Triangle({
    ...defaultPosition,
    width: 400,
    height: 400,
    fill: '#92706BFF',
    name: '三角形',
  });
  canvasEditor.addBaseType(triangle, { center: true, event });
};

const addPolygon = (event) => {
  cancelDraw();
  const polygon = new fabric.Polygon(getPolygonVertices(5, 200), {
    ...defaultPosition,
    fill: '#CCCCCCFF',
    name: '多边形',
  });
  polygon.set({
    width: 400,
    height: 400,
    pathOffset: {
      x: 0,
      y: 0,
    },
  });
  canvasEditor.addBaseType(polygon, { center: true, event });
};

const addCircle = (event) => {
  cancelDraw();
  const circle = new fabric.Circle({
    ...defaultPosition,
    radius: 150,
    fill: '#57606BFF',
    name: '圆形',
  });
  canvasEditor.addBaseType(circle, { center: true, event });
};

const addRect = (event) => {
  cancelDraw();
  const rect = new fabric.Rect({
    ...defaultPosition,
    fill: '#F57274FF',
    width: 400,
    height: 400,
    name: '矩形',
  });

  canvasEditor.addBaseType(rect, { center: true, event });
};

const drawPolygon = () => {
  const onEnd = () => {
    state.lineType = false;
    state.isDrawingLineMode = false;
    ensureObjectSelEvStatus(!state.isDrawingLineMode, !state.isDrawingLineMode);
  };
  if (state.lineType !== LINE_TYPE.polygon) {
    endConflictTools();
    endDrawingLineMode();
    state.lineType = LINE_TYPE.polygon;
    state.isDrawingLineMode = true;
    canvasEditor.beginDrawPolygon(onEnd);
    canvasEditor.endDraw();
    ensureObjectSelEvStatus(!state.isDrawingLineMode, !state.isDrawingLineMode);
  } else {
    canvasEditor.discardPolygon();
  }
};

const freeDraw = () => {
  if (state.lineType === LINE_TYPE.freeDraw) {
    canvasEditor.endDraw();
    state.lineType = false;
    state.isDrawingLineMode = false;
  } else {
    endConflictTools();
    endDrawingLineMode();
    state.lineType = LINE_TYPE.freeDraw;
    state.isDrawingLineMode = true;
    canvasEditor.startDraw({ width: 20 });
  }
};

const endConflictTools = () => {
  canvasEditor.discardPolygon();
  canvasEditor.endDraw();
  canvasEditor.endTextPathDraw();
};

const endDrawingLineMode = () => {
  state.isDrawingLineMode = false;
  state.lineType = '';
  canvasEditor.setMode(state.isDrawingLineMode);
  canvasEditor.setLineType(state.lineType);
};

const drawingLineModeSwitch = (type) => {
  if ([LINE_TYPE.polygon, LINE_TYPE.freeDraw, LINE_TYPE.pathText].includes(state.lineType)) {
    endConflictTools();
  }
  if (state.lineType === type) {
    state.isDrawingLineMode = false;
    state.lineType = '';
  } else {
    state.isDrawingLineMode = true;
    state.lineType = type;
  }
  canvasEditor.setMode(state.isDrawingLineMode);
  canvasEditor.setLineType(type);
  ensureObjectSelEvStatus(!state.isDrawingLineMode, !state.isDrawingLineMode);
};

const ensureObjectSelEvStatus = (evented, selectable) => {
  canvasEditor.canvas.forEachObject((obj) => {
    if (obj.id !== 'workspace') {
      obj.selectable = selectable;
      obj.evented = evented;
    }
  });
};

const cancelDraw = () => {
  if (!state.isDrawingLineMode) return;
  state.isDrawingLineMode = false;
  state.lineType = '';
  canvasEditor.setMode(false);
  endConflictTools();
  ensureObjectSelEvStatus(true, true);
};

onDeactivated(() => {
  cancelDraw();
});
</script>

<style scoped lang="less">
.tool-box {
  display: flex;
  justify-content: space-around;

  span {
    flex: 1;
    text-align: center;
    padding: 5px 0;
    background: #f6f6f6;
    margin-left: 2px;
    cursor: pointer;

    &:hover {
      background: #edf9ff;

      svg {
        fill: #2d8cf0;
      }
    }
  }

  .bg {
    background: #d8d8d8;

    &:hover {
      svg {
        fill: #2d8cf0;
      }
    }
  }
}
</style>
