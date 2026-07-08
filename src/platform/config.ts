function trimSlash(value: string) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export const PLATFORM_PRODUCT_KEY = String(
  import.meta.env.APP_PLATFORM_PRODUCT_KEY || 'qiuai-designer'
).trim();

export const PLATFORM_API_BASE_URL = trimSlash(
  String(import.meta.env.APP_PLATFORM_API_BASE_URL || '')
);

export function isPlatformApiConfigured() {
  return Boolean(PLATFORM_API_BASE_URL);
}
