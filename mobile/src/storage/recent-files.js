export const RECENT_FILES_KEY = 'yoyopdf.recentFiles';
const maximumRecentFiles = 25;

export function sanitizeRecentFile(value) {
  if (!value || typeof value.uri !== 'string' || !value.uri.startsWith('content://')) return null;
  const createdAt = Number(value.createdAt);
  return Object.freeze({
    id: value.uri,
    uri: value.uri,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : 'merged-pdf.pdf',
    size: Number.isFinite(Number(value.size)) ? Number(value.size) : -1,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    operation: value.operation === 'merge' ? 'merge' : 'unknown',
    available: value.available !== false,
  });
}

export function loadRecentFiles(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(RECENT_FILES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeRecentFile).filter(Boolean).slice(0, maximumRecentFiles);
  } catch {
    return [];
  }
}

export function saveRecentFiles(files, storage = globalThis.localStorage) {
  const safeFiles = files.map(sanitizeRecentFile).filter(Boolean).slice(0, maximumRecentFiles);
  try {
    storage?.setItem(RECENT_FILES_KEY, JSON.stringify(safeFiles));
  } catch {
    // Metadata persistence failure must never affect the saved PDF itself.
  }
  return safeFiles;
}

export function addRecentFile(files, value) {
  const item = sanitizeRecentFile(value);
  if (!item) return [...files];
  return [item, ...files.filter((file) => file.uri !== item.uri)].slice(0, maximumRecentFiles);
}

export function removeRecentFile(files, id) {
  return files.filter((file) => file.id !== id);
}
