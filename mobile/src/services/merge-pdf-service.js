import {
  addMergeProgressListener,
  cancelPdfMerge,
  mergePdfDocuments,
  pickPdfDocuments,
} from '../native/pdf-documents.js';
import { buildOutputFilename } from '../tools/merge/output-name.js';

export async function choosePdfFiles() {
  return pickPdfDocuments();
}

export async function mergePdfFiles(files, onProgress) {
  const listener = await addMergeProgressListener(onProgress);
  try {
    return await mergePdfDocuments(files.map((file) => file.uri), buildOutputFilename());
  } finally {
    await listener.remove();
  }
}

export function requestMergeCancellation() {
  return cancelPdfMerge();
}
