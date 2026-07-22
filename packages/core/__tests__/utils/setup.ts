import Editor from '../../Editor.ts';
import { fabric } from 'fabric';

type CanvasContextMock = Record<string, unknown>;

function createCanvasContextMock(canvas: HTMLCanvasElement): CanvasContextMock {
  const gradient = {
    addColorStop: () => undefined,
  };

  return {
    canvas,
    clearRect: () => undefined,
    fillRect: () => undefined,
    strokeRect: () => undefined,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => undefined,
    createImageData: () => ({ data: new Uint8ClampedArray(4) }),
    setTransform: () => undefined,
    resetTransform: () => undefined,
    getTransform: () => new DOMMatrix(),
    drawImage: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    closePath: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    bezierCurveTo: () => undefined,
    quadraticCurveTo: () => undefined,
    arc: () => undefined,
    rect: () => undefined,
    fill: () => undefined,
    stroke: () => undefined,
    clip: () => undefined,
    translate: () => undefined,
    rotate: () => undefined,
    scale: () => undefined,
    transform: () => undefined,
    measureText: () => ({ width: 0 }),
    fillText: () => undefined,
    strokeText: () => undefined,
    createPattern: () => null,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
}

function installCanvasMock() {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(contextId: string) {
      if (contextId !== '2d') {
        return null;
      }
      return createCanvasContextMock(this);
    },
  });

  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    configurable: true,
    value() {
      return 'data:image/png;base64,';
    },
  });
}

installCanvasMock();

function createTestCanvasElement(id: string) {
  const existing = document.getElementById(id);
  existing?.remove();

  const canvasElement = document.createElement('canvas');
  canvasElement.id = id;
  canvasElement.width = 800;
  canvasElement.height = 600;
  document.body.appendChild(canvasElement);

  return canvasElement;
}

export function createEditor() {
  const editor = new Editor();
  const canvasElement = createTestCanvasElement('canvas');
  const canvas = new fabric.Canvas('canvas', {
    fireRightClick: true,
    stopContextMenu: true,
    controlsAboveOverlay: true,
    imageSmoothingEnabled: false,
    preserveObjectStacking: true,
  });
  editor.init(canvas);
  window.editor = editor;

  return {
    cleanUp: () => {
      editor.destory();
      canvasElement.remove();
    },
  };
}

export function initPlugin(plugin: new (canvas: fabric.Canvas, editor: Editor) => unknown) {
  const editor = new Editor();
  const canvasElement = createTestCanvasElement('canvas');
  const canvas = new fabric.Canvas('canvas', {});
  const pluginInstance = new plugin(canvas, editor);

  return {
    pluginInstance,
    cleanUp: () => {
      editor.destory();
      try {
        canvas.dispose();
      } catch {
        // Fabric expects full browser canvas internals; jsdom cleanup can be partial.
      }
      canvasElement.remove();
    },
  };
}
