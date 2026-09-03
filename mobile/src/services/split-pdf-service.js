import {
  addSplitProgressListener,
  cancelPdfSplit,
  pickPdfDocuments,
  renderPdfPageThumbnail,
  splitPdfDocument,
} from '../native/pdf-documents.js';

export async function choosePdfForSplit() {
  const selection = await pickPdfDocuments({ multiple: false });
  return {
    ...selection,
    file: selection.files?.[0] || null,
  };
}

export async function splitPdfFile(file, groups, onProgress) {
  const listener = await addSplitProgressListener(onProgress);
  try {
    return await splitPdfDocument(file.uri, groups, file.name);
  } finally {
    await listener.remove();
  }
}

export function requestSplitCancellation() {
  return cancelPdfSplit();
}

export async function loadSplitPageThumbnail(file, page) {
  const result = await renderPdfPageThumbnail(file.uri, page);
  return result.dataUrl;
}
