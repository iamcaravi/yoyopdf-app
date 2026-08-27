export function buildOutputFilename(base = 'merged-pdf') {
  const cleaned = String(base)
    .replace(/\.pdf$/i, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .trim()
    .slice(0, 70);
  return `${cleaned || 'merged-pdf'}.pdf`;
}
