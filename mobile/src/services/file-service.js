import { getPdfStatus, openPdfDocument, sharePdfDocument } from '../native/pdf-documents.js';
import {
  addRecentFile,
  loadRecentFiles,
  removeRecentFile,
  saveRecentFiles,
} from '../storage/recent-files.js';

export function getRecentFiles() {
  return loadRecentFiles();
}

export function recordRecentFile(files, metadata) {
  return saveRecentFiles(addRecentFile(files, metadata));
}

export function removeRecentFileMetadata(files, id) {
  return saveRecentFiles(removeRecentFile(files, id));
}

export function markRecentFileUnavailable(files, id) {
  return saveRecentFiles(files.map((file) => file.id === id ? { ...file, available: false } : file));
}

export async function refreshRecentFileAvailability(files) {
  const refreshed = await Promise.all(files.map(async (file) => {
    try {
      const status = await getPdfStatus(file.uri);
      return {
        ...file,
        name: status.name || file.name,
        size: Number.isFinite(Number(status.size)) ? Number(status.size) : file.size,
        available: status.available === true,
      };
    } catch {
      return { ...file, available: false };
    }
  }));
  return saveRecentFiles(refreshed);
}

export function openRecentFile(file) {
  return openPdfDocument(file.uri);
}

export function shareRecentFile(file) {
  return sharePdfDocument(file.uri);
}
