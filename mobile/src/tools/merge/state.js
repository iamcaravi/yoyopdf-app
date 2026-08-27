const pdfNamePattern = /\.pdf$/i;

export function normalizePdfFile(file) {
  if (!file || typeof file.uri !== 'string' || !file.uri.startsWith('content://')) return null;
  const name = typeof file.name === 'string' && file.name.trim() ? file.name.trim() : 'document.pdf';
  if (!pdfNamePattern.test(name)) return null;
  const size = Number.isFinite(Number(file.size)) ? Number(file.size) : -1;
  return Object.freeze({
    id: file.uri,
    uri: file.uri,
    name,
    size,
    mimeType: 'application/pdf',
    available: file.available !== false,
  });
}

export function addPdfFiles(current, incoming) {
  const result = [...current];
  const seen = new Set(current.map((file) => file.id));
  let duplicateCount = 0;
  let invalidCount = 0;
  for (const candidate of incoming || []) {
    const file = normalizePdfFile(candidate);
    if (!file) {
      invalidCount += 1;
    } else if (seen.has(file.id)) {
      duplicateCount += 1;
    } else {
      seen.add(file.id);
      result.push(file);
    }
  }
  return { files: result, duplicateCount, invalidCount };
}

export function movePdf(files, fromIndex, toIndex) {
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return [...files];
  if (fromIndex < 0 || fromIndex >= files.length || toIndex < 0 || toIndex >= files.length || fromIndex === toIndex) return [...files];
  const next = [...files];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function removePdf(files, id) {
  return files.filter((file) => file.id !== id);
}

export function canMerge(files) {
  return files.length >= 2 && files.every((file) => file.available && file.uri.startsWith('content://'));
}

export function validateMerge(files) {
  if (!files.length) return { valid: false, code: 'NO_FILES' };
  if (files.length < 2) return { valid: false, code: 'TOO_FEW_FILES' };
  if (files.some((file) => !file.available)) return { valid: false, code: 'INACCESSIBLE_FILE' };
  return { valid: true, code: null };
}
