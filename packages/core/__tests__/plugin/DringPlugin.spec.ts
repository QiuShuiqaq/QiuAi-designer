import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { initPlugin } from '../utils/setup.ts';
import { DringPlugin } from '../../plugin/DringPlugin.ts';
import { wait, mouseDown, drag } from '../utils/common.ts';

describe('canvas:drag', async () => {
  let pluginInstance: DringPlugin;
  let cleanUp: () => void;

  beforeEach(() => {
    const fixture = initPlugin(DringPlugin);
    pluginInstance = fixture.pluginInstance as DringPlugin;
    cleanUp = fixture.cleanUp;
  });

  afterEach(() => {
    pluginInstance.destroy();
    cleanUp();
  });

  test('dragMode is  true', async () => {
    const instance = pluginInstance;
    instance.dragMode = true;
    const testCanvas = instance.canvas as ExtCanvas;
    testCanvas.lastPosX = 0;
    testCanvas.lastPosY = 0;
    mouseDown(testCanvas, { x: 50, y: 50 });
    await wait();
    expect([testCanvas.lastPosX, testCanvas.lastPosY]).toEqual([50, 50]);
    expect(testCanvas.isDragging).toEqual(true);
    expect(testCanvas.selection).toEqual(false);
  });

  test('dragMode is  false', async () => {
    const instance = pluginInstance;
    instance.dragMode = false;
    const testCanvas = instance.canvas as ExtCanvas;
    testCanvas.lastPosX = 0;
    testCanvas.lastPosY = 0;
    mouseDown(testCanvas, { x: 50, y: 50 });
    await wait();
    expect([testCanvas.lastPosX, testCanvas.lastPosY]).toEqual([0, 0]);
  });

  test('canvas drag', async () => {
    const instance = pluginInstance;
    instance.dragMode = true;
    const testCanvas = pluginInstance.canvas as ExtCanvas;
    testCanvas.lastPosX = 0;
    testCanvas.lastPosY = 0;
    drag(testCanvas, { x: 50, y: 50 }, { x: 100, y: 100 });
    await wait();
    expect([testCanvas.lastPosX, testCanvas.lastPosY]).toEqual([100, 100]);
    expect(testCanvas.isDragging).toEqual(false);
    expect(testCanvas.selection).toEqual(true);
  });
});
