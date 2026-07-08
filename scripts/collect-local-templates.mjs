import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const REMOTE_API_BASE = 'https://github.kuaitu.cc';
const REMOTE_UPLOAD_BASE = 'https://newapi.kuaitu.cc';
const OUTPUT_ROOT = path.resolve(process.cwd(), 'public', 'template-library');
const TEMPLATE_OUTPUT_DIR = path.join(OUTPUT_ROOT, 'templates');
const ASSET_OUTPUT_DIR = path.join(OUTPUT_ROOT, 'assets');
const COVER_OUTPUT_DIR = path.join(OUTPUT_ROOT, 'covers');
const FONT_OUTPUT_DIR = path.join(OUTPUT_ROOT, 'fonts');
const LOCAL_TEMPLATE_ASSET_PREFIX = '__LOCAL_TEMPLATE_ASSET__/';
const PAGE_SIZE = 100;

const assetCache = new Map();

function normalizeRemoteUrl(value) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const base = value.startsWith('/uploads') ? REMOTE_UPLOAD_BASE : REMOTE_API_BASE;
  return `${base}${value}`;
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function createStableName(url, extension) {
  const hash = createHash('sha1').update(url).digest('hex');
  return `${hash}${extension}`;
}

function guessExtensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname);
    if (extension) {
      return extension.toLowerCase();
    }
  } catch {}
  return '';
}

function sanitizeText(value) {
  return typeof value === 'string' ? value : '';
}

function detectCanvasSize(json) {
  const objects = Array.isArray(json?.objects) ? json.objects : [];
  const workspace = objects.find((item) => item?.id === 'workspace') || json?.clipPath;
  return {
    width: Number(workspace?.width) || 0,
    height: Number(workspace?.height) || 0,
  };
}

function collectFontsFromNode(node, fonts) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.fontFamily === 'string' && node.type && String(node.type).includes('text')) {
    fonts.add(node.fontFamily);
  }
  if (Array.isArray(node)) {
    node.forEach((item) => collectFontsFromNode(item, fonts));
    return;
  }
  Object.values(node).forEach((value) => collectFontsFromNode(value, fonts));
}

function rewriteTemplateAssets(node, transform) {
  if (Array.isArray(node)) {
    return Promise.all(node.map((item) => rewriteTemplateAssets(item, transform)));
  }
  if (!node || typeof node !== 'object') {
    return Promise.resolve(node);
  }

  const entries = Object.entries(node);
  return Promise.all(
    entries.map(async ([key, value]) => {
      if (key === 'src' && typeof value === 'string' && /^https?:\/\//.test(value)) {
        node[key] = await transform(value);
        return;
      }
      if (value && typeof value === 'object') {
        await rewriteTemplateAssets(value, transform);
      }
    })
  ).then(() => node);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} -> ${url}`);
  }
  return response.json();
}

async function downloadToDirectory(url, outputDir, preferredExtension = '') {
  const normalizedUrl = normalizeRemoteUrl(url);
  const cached = assetCache.get(`${outputDir}|${normalizedUrl}`);
  if (cached) {
    return cached;
  }

  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Asset download failed: ${response.status} ${response.statusText} -> ${normalizedUrl}`);
  }

  let extension = preferredExtension || guessExtensionFromUrl(normalizedUrl);
  if (!extension) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('png')) extension = '.png';
    else if (contentType.includes('jpeg')) extension = '.jpg';
    else if (contentType.includes('svg')) extension = '.svg';
    else if (contentType.includes('webp')) extension = '.webp';
    else if (contentType.includes('woff2')) extension = '.woff2';
    else if (contentType.includes('woff')) extension = '.woff';
    else if (contentType.includes('ttf')) extension = '.ttf';
    else extension = '.bin';
  }

  const fileName = createStableName(normalizedUrl, extension);
  const filePath = path.join(outputDir, fileName);
  try {
    await access(filePath);
    assetCache.set(`${outputDir}|${normalizedUrl}`, fileName);
    return fileName;
  } catch {}

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));
  assetCache.set(`${outputDir}|${normalizedUrl}`, fileName);
  return fileName;
}

async function fetchAllTemplateCategories() {
  const url = `${REMOTE_API_BASE}/api/templ-types?pagination[page]=1&pagination[pageSize]=200`;
  const payload = await fetchJson(url);
  return (payload.data || []).map((item) => ({
    id: item.id,
    name: sanitizeText(item.attributes?.name),
    sort: Number(item.attributes?.sort) || 0,
  }));
}

async function fetchAllTemplates() {
  const templates = [];
  let page = 1;
  let pageCount = 1;

  do {
    const url =
      `${REMOTE_API_BASE}/api/templs?pagination[page]=${page}` +
      `&pagination[pageSize]=${PAGE_SIZE}&populate[img]=*&populate[templ_type]=*`;
    const payload = await fetchJson(url);
    templates.push(...(payload.data || []));
    pageCount = Number(payload.meta?.pagination?.pageCount) || 1;
    page += 1;
  } while (page <= pageCount);

  return templates;
}

async function fetchRemoteFonts() {
  const url = `${REMOTE_API_BASE}/api/fonts?populate=*&pagination[pageSize]=100`;
  const payload = await fetchJson(url);
  const fontMap = new Map();
  for (const item of payload.data || []) {
    const attributes = item.attributes || {};
    const fileUrl = normalizeRemoteUrl(attributes.file?.data?.attributes?.url || '');
    if (!attributes.name || !fileUrl) continue;
    fontMap.set(attributes.name, {
      id: item.id,
      name: attributes.name,
      type: attributes.type || 'cn',
      fileUrl,
      previewUrl: normalizeRemoteUrl(attributes.img?.data?.attributes?.url || ''),
    });
  }
  return fontMap;
}

async function prepareOutputDirectories() {
  await rm(OUTPUT_ROOT, { recursive: true, force: true });
  await mkdir(TEMPLATE_OUTPUT_DIR, { recursive: true });
  await mkdir(ASSET_OUTPUT_DIR, { recursive: true });
  await mkdir(COVER_OUTPUT_DIR, { recursive: true });
  await mkdir(FONT_OUTPUT_DIR, { recursive: true });
}

async function main() {
  console.log('Collecting remote template library...');
  await prepareOutputDirectories();

  const [categories, templates, remoteFontMap] = await Promise.all([
    fetchAllTemplateCategories(),
    fetchAllTemplates(),
    fetchRemoteFonts(),
  ]);

  const usedFonts = new Set();
  const manifestTemplates = [];

  for (const template of templates) {
    const attributes = template.attributes || {};
    const rawJson = structuredClone(attributes.json || {});

    collectFontsFromNode(rawJson, usedFonts);
    await rewriteTemplateAssets(rawJson, async (remoteUrl) => {
      const fileName = await downloadToDirectory(remoteUrl, ASSET_OUTPUT_DIR);
      return `${LOCAL_TEMPLATE_ASSET_PREFIX}${fileName}`;
    });

    const coverUrl =
      normalizeRemoteUrl(
        attributes.img?.data?.attributes?.formats?.small?.url ||
          attributes.img?.data?.attributes?.url ||
          ''
      ) || '';
    const coverFileName = coverUrl
      ? await downloadToDirectory(coverUrl, COVER_OUTPUT_DIR, guessExtensionFromUrl(coverUrl))
      : '';

    const { width, height } = detectCanvasSize(rawJson);
    const category = attributes.templ_type?.data?.attributes || {};
    const categoryId = attributes.templ_type?.data?.id || null;
    const templateFileName = `${template.id}.json`;

    await writeFile(
      path.join(TEMPLATE_OUTPUT_DIR, templateFileName),
      JSON.stringify(
        {
          id: template.id,
          name: sanitizeText(attributes.name),
          desc: attributes.desc || null,
          categoryId,
          categoryName: sanitizeText(category.name),
          width,
          height,
          json: rawJson,
        },
        null,
        2
      )
    );

    manifestTemplates.push({
      id: template.id,
      name: sanitizeText(attributes.name),
      desc: attributes.desc || null,
      sort: Number(attributes.sort) || 0,
      categoryId,
      categoryName: sanitizeText(category.name),
      coverPath: coverFileName ? `template-library/covers/${coverFileName}` : '',
      templatePath: `template-library/templates/${templateFileName}`,
      width,
      height,
      objectCount: Array.isArray(rawJson?.objects) ? rawJson.objects.length : 0,
      updatedAt: attributes.updatedAt || attributes.createdAt || null,
    });
  }

  const manifestFonts = [];
  const fontCssLines = [];
  for (const fontName of [...usedFonts].sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
    const remoteFont = remoteFontMap.get(fontName);
    if (!remoteFont) {
      manifestFonts.push({
        name: fontName,
        localPath: '',
        status: 'missing',
      });
      continue;
    }

    const extension = guessExtensionFromUrl(remoteFont.fileUrl) || '.woff2';
    const fileName = await downloadToDirectory(remoteFont.fileUrl, FONT_OUTPUT_DIR, extension);
    manifestFonts.push({
      name: fontName,
      localPath: `template-library/fonts/${fileName}`,
      status: 'ready',
    });
    fontCssLines.push(
      `@font-face {`,
      `  font-family: '${fontName}';`,
      `  src: url('./${fileName}');`,
      `  font-display: swap;`,
      `}`
    );
  }

  await writeFile(path.join(FONT_OUTPUT_DIR, 'fonts.css'), fontCssLines.join('\n'));

  const manifest = {
    version: 1,
    source: REMOTE_API_BASE,
    generatedAt: new Date().toISOString(),
    assetPrefix: LOCAL_TEMPLATE_ASSET_PREFIX,
    categories: categories.sort((a, b) => a.sort - b.sort || a.id - b.id),
    templates: manifestTemplates.sort((a, b) => {
      if (a.categoryId !== b.categoryId) {
        return (a.categoryId || 999999) - (b.categoryId || 999999);
      }
      if (a.sort !== b.sort) {
        return a.sort - b.sort;
      }
      return a.id - b.id;
    }),
    fonts: {
      stylesheetPath: 'template-library/fonts/fonts.css',
      items: manifestFonts,
    },
    stats: {
      templateCount: manifestTemplates.length,
      categoryCount: categories.length,
      fontCount: manifestFonts.length,
    },
  };

  await writeFile(path.join(OUTPUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Local template library ready: ${manifest.stats.templateCount} templates`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
