import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'qiuai-designer-local-workspace';
const DB_VERSION = 1;
const DESIGN_STORE = 'designs';
const ASSET_STORE = 'assets';

export type LocalDesign = {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  canvasJson: unknown;
  previewDataUrl: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};

export type LocalAssetKind = 'image';
export type LocalAssetSource = 'upload' | 'ai-generated';

export type LocalAsset = {
  id: string;
  kind: LocalAssetKind;
  source: LocalAssetSource;
  name: string;
  dataUrl: string;
  previewDataUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
};

export type SaveLocalDesignInput = Partial<Pick<LocalDesign, 'id' | 'createdAt'>> &
  Pick<LocalDesign, 'canvasJson' | 'previewDataUrl' | 'width' | 'height'> & {
    name?: string;
    templateId?: string;
    templateName?: string;
  };

export type SaveLocalImageAssetInput = Partial<
  Pick<LocalAsset, 'id' | 'createdAt' | 'previewDataUrl' | 'mimeType' | 'size'>
> & {
  source: LocalAssetSource;
  name?: string;
  dataUrl: string;
};

export const LOCAL_WORKSPACE_CHANGED_EVENT = 'qiuai-designer-local-workspace-changed';

function canUseIndexedDb() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function emitWorkspaceChanged(detail: { store: 'designs' | 'assets' }) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(LOCAL_WORKSPACE_CHANGED_EVENT, { detail }));
}

function openDb() {
  if (!canUseIndexedDb()) {
    return Promise.reject(new Error('当前环境不支持本地数据库。'));
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DESIGN_STORE)) {
        const store = db.createObjectStore(DESIGN_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }

      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        const store = db.createObjectStore(ASSET_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('kind', 'kind');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('打开本地数据库失败。'));
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
) {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = callback(store);
    let requestResult: T | undefined;

    if (request) {
      request.onsuccess = () => {
        requestResult = request.result;
      };
      request.onerror = () => reject(request.error || new Error('本地数据库操作失败。'));
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(requestResult as T);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('本地数据库事务失败。'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('本地数据库事务已中止。'));
    };
  });
}

async function getAllFromStore<T>(storeName: string) {
  return withStore<T[]>(storeName, 'readonly', (store) => store.getAll() as IDBRequest<T[]>);
}

function sortByUpdatedAtDesc<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function sortByCreatedAtDesc<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function normalizeName(value: string | undefined, fallback: string) {
  return String(value || '').trim() || fallback;
}

export async function listLocalDesigns() {
  const items = await getAllFromStore<LocalDesign>(DESIGN_STORE);
  return sortByUpdatedAtDesc(items);
}

export async function getLocalDesign(id: string) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) {
    return null;
  }

  const result = await withStore<LocalDesign | undefined>(DESIGN_STORE, 'readonly', (store) =>
    store.get(normalizedId)
  );
  return result || null;
}

export async function saveLocalDesign(input: SaveLocalDesignInput) {
  const now = new Date().toISOString();
  const design: LocalDesign = {
    id: input.id || uuidv4(),
    name: normalizeName(input.name, `未命名设计 ${new Date().toLocaleString()}`),
    templateId: String(input.templateId || 'local-current'),
    templateName: String(input.templateName || ''),
    canvasJson: input.canvasJson,
    previewDataUrl: input.previewDataUrl,
    width: Number(input.width || 0),
    height: Number(input.height || 0),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  await withStore(DESIGN_STORE, 'readwrite', (store) => store.put(design));
  emitWorkspaceChanged({ store: 'designs' });
  return design;
}

export async function deleteLocalDesign(id: string) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) {
    return;
  }

  await withStore(DESIGN_STORE, 'readwrite', (store) => store.delete(normalizedId));
  emitWorkspaceChanged({ store: 'designs' });
}

export async function listLocalImageAssets() {
  const items = await getAllFromStore<LocalAsset>(ASSET_STORE);
  return sortByCreatedAtDesc(items.filter((item) => item.kind === 'image'));
}

export async function saveLocalImageAsset(input: SaveLocalImageAssetInput) {
  const now = new Date().toISOString();
  const asset: LocalAsset = {
    id: input.id || uuidv4(),
    kind: 'image',
    source: input.source,
    name: normalizeName(input.name, `图片素材 ${new Date().toLocaleString()}`),
    dataUrl: input.dataUrl,
    previewDataUrl: input.previewDataUrl || input.dataUrl,
    mimeType: input.mimeType || '',
    size: Number(input.size || 0),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };

  await withStore(ASSET_STORE, 'readwrite', (store) => store.put(asset));
  emitWorkspaceChanged({ store: 'assets' });
  return asset;
}

export async function deleteLocalImageAsset(id: string) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) {
    return;
  }

  await withStore(ASSET_STORE, 'readwrite', (store) => store.delete(normalizedId));
  emitWorkspaceChanged({ store: 'assets' });
}
