import { saveLocalImageAsset, type LocalAssetSource } from './store';

function toReadableTime() {
  return new Date().toLocaleString();
}

function getMimeTypeFromDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+)[;,]/.exec(dataUrl);
  return match?.[1] || '';
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取图片失败。'));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取图片失败。'));
    reader.readAsDataURL(blob);
  });
}

export async function saveUploadedImageFile(file: File) {
  const dataUrl = await fileToDataUrl(file);
  return saveLocalImageAsset({
    source: 'upload',
    name: file.name || `上传图片 ${toReadableTime()}`,
    dataUrl,
    mimeType: file.type || getMimeTypeFromDataUrl(dataUrl),
    size: file.size || dataUrl.length,
  });
}

export async function saveImageSourceAsLocalAsset(input: {
  src: string;
  source: LocalAssetSource;
  name?: string;
}) {
  const src = String(input.src || '').trim();
  if (!src) {
    return null;
  }

  if (src.startsWith('data:')) {
    return saveLocalImageAsset({
      source: input.source,
      name: input.name || `AI生成图片 ${toReadableTime()}`,
      dataUrl: src,
      mimeType: getMimeTypeFromDataUrl(src),
      size: src.length,
    });
  }

  try {
    const response = await fetch(src, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`下载图片失败：${response.status}`);
    }

    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    return saveLocalImageAsset({
      source: input.source,
      name: input.name || `AI生成图片 ${toReadableTime()}`,
      dataUrl,
      mimeType: blob.type || getMimeTypeFromDataUrl(dataUrl),
      size: blob.size || dataUrl.length,
    });
  } catch {
    return saveLocalImageAsset({
      source: input.source,
      name: input.name || `AI生成图片 ${toReadableTime()}`,
      dataUrl: src,
      previewDataUrl: src,
      size: 0,
    });
  }
}
