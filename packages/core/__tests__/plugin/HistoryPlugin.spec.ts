import { afterEach, describe, expect, test, vi } from 'vitest';
import { createEditor } from '../utils/setup.ts';
import HistoryPlugin from '../../plugin/HistoryPlugin.ts';

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  });
}

describe('history plugin unload guard', () => {
  const originalUserAgent = window.navigator.userAgent;

  afterEach(() => {
    setUserAgent(originalUserAgent);
    vi.restoreAllMocks();
  });

  test('does not register blocking beforeunload prompts in Electron', () => {
    setUserAgent('Mozilla/5.0 Electron/30.0.9');
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const { cleanUp } = createEditor();

    window.editor.use(HistoryPlugin);

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    );
    cleanUp();
  });
});
