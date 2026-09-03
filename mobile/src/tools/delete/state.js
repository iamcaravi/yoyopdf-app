export function createDeleteState() {
  return {
    file: null,
    picking: false,
    selectedPages: [],
    thumbnails: {},
    error: null,
    result: null,
  };
}

export function withDeleteFile(state, file) {
  const pageCount = Number(file?.pageCount);
  if (!file || !Number.isInteger(pageCount) || pageCount < 1) {
    return { ...state, picking: false, error: 'The selected PDF has no readable pages.' };
  }
  return { ...createDeleteState(), file: Object.freeze({ ...file, pageCount }) };
}

export function applyDeleteSelection(state, selection) {
  if (selection?.cancelled) return { ...state, picking: false };
  return selection?.file ? withDeleteFile(state, selection.file) : { ...state, picking: false };
}

export function toggleDeletePage(selectedPages, page) {
  const value = Number(page);
  const selected = new Set((selectedPages || []).map(Number));
  if (selected.has(value)) selected.delete(value); else selected.add(value);
  return [...selected].sort((left, right) => left - right);
}

export function selectAllDeletePages(pageCount) {
  const total = Number(pageCount);
  if (!Number.isInteger(total) || total < 1) return [];
  return Array.from({ length: total }, (_, index) => index + 1);
}

export function validateDeleteSelection(selectedPages, pageCount) {
  const total = Number(pageCount);
  if (!Number.isInteger(total) || total < 1) return { valid: false, code: 'INVALID_PDF', pages: [], remaining: 0 };
  const pages = [...new Set((selectedPages || []).map(Number))]
    .filter((page) => Number.isInteger(page))
    .sort((left, right) => left - right);
  if (!pages.length) return { valid: false, code: 'NO_PAGES_SELECTED', pages, remaining: total };
  if (pages.some((page) => page < 1 || page > total)) return { valid: false, code: 'INVALID_PAGE_INDEX', pages, remaining: total };
  if (pages.length >= total) return { valid: false, code: 'DELETE_ALL_PAGES', pages, remaining: 0 };
  return { valid: true, code: null, pages, remaining: total - pages.length };
}
