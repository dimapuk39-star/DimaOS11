import { useEffect, useState } from 'react';

const PREFIX = 'dimaos11:';
const DATABASE_NAME = 'DimaOSDatabase';
const DATABASE_VERSION = 1;
const BLOB_STORE = 'blobs';

export function readSetting<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(`${PREFIX}${key}`);
    if (stored === null) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

export function writeSetting<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn(`DimaOS could not save setting: ${key}`, error);
  }
}

export function removeSetting(key: string): void {
  localStorage.removeItem(`${PREFIX}${key}`);
}

export function usePersistentState<T>(
  key: string,
  fallback: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const resolved = typeof fallback === 'function'
      ? (fallback as () => T)()
      : fallback;
    return readSetting(key, resolved);
  });

  useEffect(() => {
    writeSetting(key, value);
  }, [key, value]);

  return [value, setValue];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(BLOB_STORE)) {
        database.createObjectStore(BLOB_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBlob(key: string, blob: Blob): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(BLOB_STORE, 'readwrite');
    const request = transaction.objectStore(BLOB_STORE).put(blob, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function loadBlob(key: string): Promise<Blob | null> {
  const database = await openDatabase();
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const transaction = database.transaction(BLOB_STORE, 'readonly');
    const request = transaction.objectStore(BLOB_STORE).get(key);
    request.onsuccess = () => resolve((request.result as Blob | undefined) || null);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

export async function deleteBlob(key: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(BLOB_STORE, 'readwrite');
    const request = transaction.objectStore(BLOB_STORE).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export async function listBlobKeys(): Promise<string[]> {
  const database = await openDatabase();
  const result = await new Promise<string[]>((resolve, reject) => {
    const transaction = database.transaction(BLOB_STORE, 'readonly');
    const request = transaction.objectStore(BLOB_STORE).getAllKeys();
    request.onsuccess = () => resolve(request.result.map(String));
    request.onerror = () => reject(request.error);
  });
  database.close();
  return result;
}

export async function clearDimaStorage(): Promise<void> {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => localStorage.removeItem(key));

  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(BLOB_STORE, 'readwrite');
    const request = transaction.objectStore(BLOB_STORE).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  database.close();
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(header)?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export type PersistedWindow = {
  id: string;
  open: boolean;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
};

export function sanitizeWindowPosition(
  position: Pick<PersistedWindow, 'x' | 'y'>,
): Pick<PersistedWindow, 'x' | 'y'> {
  const width = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const height = typeof window === 'undefined' ? 900 : window.innerHeight;
  return {
    x: Math.max(0, Math.min(width - 500, position.x)),
    y: Math.max(0, Math.min(height - 180, position.y)),
  };
}
