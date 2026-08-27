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

export async function pickPdfDocuments() {
  requireNative();
  return PdfDocuments.pickPdfs();
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
