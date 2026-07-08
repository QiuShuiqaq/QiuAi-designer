import FontFaceObserver from 'fontfaceobserver';
import { loadLocalTemplateManifest, resolveTemplateLibraryPath } from './service';

let bootstrapPromise: Promise<void> | null = null;

function ensureStylesheet(href: string) {
  const existingLink = document.querySelector(`link[data-template-fonts="${href}"]`);
  if (existingLink) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.templateFonts = href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

export async function bootstrapLocalTemplateLibrary() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const manifest = await loadLocalTemplateManifest();
        const stylesheetPath = manifest.fonts?.stylesheetPath;
        if (stylesheetPath) {
          await ensureStylesheet(resolveTemplateLibraryPath(stylesheetPath));
        }

        const readyFonts = (manifest.fonts?.items || [])
          .filter((item) => item.status === 'ready')
          .map((item) => item.name);

        await Promise.all(
          readyFonts.map((fontName) =>
            new FontFaceObserver(fontName).load(null, 15000).catch(() => undefined)
          )
        );
      } catch {
        // The editor still works without local template fonts; text rendering may fall back.
      }
    })();
  }

  return bootstrapPromise;
}
