import {
  addReorderProgressListener,
  cancelPdfReorder,
  pickPdfDocuments,
  renderPdfPageThumbnail,
  reorderPdfDocument,
} from '../native/pdf-documents.js';

export async function choosePdfForReorder() {
  const selection = await pickPdfDocuments({ multiple: false });
  return { ...selection, file: selection.files?.[0] || null };
}

export async function reorderPdfFile(file, order, onProgress) {
  const listener = await addReorderProgressListener(onProgress);
  try {
    return await reorderPdfDocument(file.uri, order, file.name);
  } finally {
    await listener.remove();
  }
}

export function requestReorderCancellation() {
  return cancelPdfReorder();
}

export async function loadReorderPageThumbnail(file, page) {
  const result = await renderPdfPageThumbnail(file.uri, page);
  return result.dataUrl;
}
