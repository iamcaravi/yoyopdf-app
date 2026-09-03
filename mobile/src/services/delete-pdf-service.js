import {
  addDeleteProgressListener,
  cancelPdfDelete,
  deletePdfPages,
  pickPdfDocuments,
  renderPdfPageThumbnail,
} from '../native/pdf-documents.js';

export async function choosePdfForDelete() {
  const selection = await pickPdfDocuments({ multiple: false });
  return { ...selection, file: selection.files?.[0] || null };
}

export async function deletePagesFromPdf(file, pages, onProgress) {
  const listener = await addDeleteProgressListener(onProgress);
  try {
    return await deletePdfPages(file.uri, pages, file.name);
  } finally {
    await listener.remove();
  }
}

export function requestDeleteCancellation() {
  return cancelPdfDelete();
}

export async function loadDeletePageThumbnail(file, page) {
  const result = await renderPdfPageThumbnail(file.uri, page);
  return result.dataUrl;
}
