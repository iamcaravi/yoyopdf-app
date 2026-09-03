import { registerPlugin } from '@capacitor/core';

const PdfDocuments = registerPlugin('PdfDocuments');

export function isPdfDocumentsAvailable() {
  return globalThis.Capacitor?.isNativePlatform?.() === true;
}

function requireNative() {
  if (!isPdfDocumentsAvailable()) {
    const error = new Error('Merge PDF requires the Android app.');
    error.code = 'NATIVE_REQUIRED';
    throw error;
  }
}

export async function pickPdfDocuments(options = {}) {
  requireNative();
  return PdfDocuments.pickPdfs({ multiple: options.multiple !== false });
}

export async function mergePdfDocuments(uris, suggestedName) {
  requireNative();
  return PdfDocuments.mergePdfs({ uris, suggestedName });
}

export async function cancelPdfMerge() {
  requireNative();
  return PdfDocuments.cancelMerge();
}

export async function addMergeProgressListener(listener) {
  requireNative();
  return PdfDocuments.addListener('mergeProgress', listener);
}

export async function splitPdfDocument(uri, groups, sourceName) {
  requireNative();
  return PdfDocuments.splitPdf({ uri, groups, sourceName });
}

export async function cancelPdfSplit() {
  requireNative();
  return PdfDocuments.cancelSplit();
}

export async function addSplitProgressListener(listener) {
  requireNative();
  return PdfDocuments.addListener('splitProgress', listener);
}

export async function renderPdfPageThumbnail(uri, page) {
  requireNative();
  return PdfDocuments.renderPdfPage({ uri, page, maxWidth: 180 });
}

export async function reorderPdfDocument(uri, order, sourceName) {
  requireNative();
  return PdfDocuments.reorderPages({ uri, order, sourceName });
}

export async function cancelPdfReorder() {
  requireNative();
  return PdfDocuments.cancelReorder();
}

export async function addReorderProgressListener(listener) {
  requireNative();
  return PdfDocuments.addListener('reorderProgress', listener);
}

export async function deletePdfPages(uri, pages, sourceName) {
  requireNative();
  return PdfDocuments.deletePages({ uri, pages, sourceName });
}

export async function cancelPdfDelete() {
  requireNative();
  return PdfDocuments.cancelDelete();
}

export async function addDeleteProgressListener(listener) {
  requireNative();
  return PdfDocuments.addListener('deleteProgress', listener);
}

export async function getPdfStatus(uri) {
  requireNative();
  return PdfDocuments.getFileStatus({ uri });
}

export async function openPdfDocument(uri) {
  requireNative();
  return PdfDocuments.openPdf({ uri });
}

export async function sharePdfDocument(uri) {
  requireNative();
  return PdfDocuments.sharePdf({ uri });
}
