const LOCAL_TEMPLATE_ASSET_PREFIX = '__LOCAL_TEMPLATE_ASSET__/';

export interface LocalTemplateCategory {
  id: number;
  name: string;
  sort: number;
}

export interface LocalTemplateManifestItem {
  id: number;
  name: string;
  desc: string | null;
  sort: number;
  categoryId: number | null;
  categoryName: string;
  coverPath: string;
  templatePath: string;
  width: number;
  height: number;
  objectCount: number;
  updatedAt: string | null;
}

export interface LocalTemplateManifest {
  version: number;
  source: string;
  generatedAt: string;
  assetPrefix: string;
  categories: LocalTemplateCategory[];
  templates: LocalTemplateManifestItem[];
  fonts?: {
    stylesheetPath?: string;
    items?: Array<{
      name: string;
      localPath: string;
      status: string;
    }>;
  };
}

export interface LocalTemplateRecord {
  id: number;
  name: string;
  desc: string | null;
  categoryId: number | null;
  categoryName: string;
  width: number;
  height: number;
  json: Record<string, any>;
}

export interface LocalTemplateListItem extends LocalTemplateManifestItem {
  previewSrc: string;
  src: string;
}

export interface LocalTemplateQuery {
  categoryId?: number | '' | null;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

let manifestPromise: Promise<LocalTemplateManifest> | null = null;

function basePath() {
  return import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
}

export function resolveTemplateLibraryPath(pathname: string) {
  const relativePath = pathname.replace(/^\/+/, '');
  return `${basePath()}${relativePath}`;
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeTemplateJson(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => normalizeTemplateJson(item));
  }
  if (!isObject(node)) {
    return node;
  }

  const next = { ...node };
  Object.entries(next).forEach(([key, value]) => {
    if (
      key === 'src' &&
      typeof value === 'string' &&
      value.startsWith(LOCAL_TEMPLATE_ASSET_PREFIX)
    ) {
      const relativePath = value.slice(LOCAL_TEMPLATE_ASSET_PREFIX.length);
      next[key] = resolveTemplateLibraryPath(`template-library/assets/${relativePath}`);
      return;
    }
    next[key] = normalizeTemplateJson(value);
  });
  return next;
}

export async function loadLocalTemplateManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(resolveTemplateLibraryPath('template-library/manifest.json')).then(
      async (response) => {
        if (!response.ok) {
          throw new Error(`Local template manifest was not found: ${response.status}`);
        }
        return response.json() as Promise<LocalTemplateManifest>;
      }
    );
  }
  return manifestPromise;
}

export async function listLocalTemplateCategories() {
  const manifest = await loadLocalTemplateManifest();
  return manifest.categories;
}

export async function queryLocalTemplates(query: LocalTemplateQuery = {}) {
  const manifest = await loadLocalTemplateManifest();
  const keyword = (query.keyword || '').trim().toLowerCase();
  const categoryId = query.categoryId === '' ? null : query.categoryId ?? null;
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.max(1, Number(query.pageSize) || 20);

  const filtered = manifest.templates.filter((item) => {
    if (categoryId && item.categoryId !== Number(categoryId)) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const haystack = `${item.name} ${item.desc || ''} ${item.categoryName || ''}`.toLowerCase();
    return haystack.includes(keyword);
  });

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map((item) => ({
    ...item,
    previewSrc: item.coverPath ? resolveTemplateLibraryPath(item.coverPath) : '',
    src: item.coverPath ? resolveTemplateLibraryPath(item.coverPath) : '',
  }));

  return {
    items,
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function loadLocalTemplateById(templateId: number | string) {
  const manifest = await loadLocalTemplateManifest();
  const target = manifest.templates.find((item) => item.id === Number(templateId));
  if (!target) {
    throw new Error(`Template ${templateId} was not found in local library`);
  }

  const response = await fetch(resolveTemplateLibraryPath(target.templatePath));
  if (!response.ok) {
    throw new Error(`Local template payload was not found: ${response.status}`);
  }

  const payload = (await response.json()) as LocalTemplateRecord;
  return {
    ...payload,
    json: normalizeTemplateJson(payload.json) as Record<string, any>,
  };
}
