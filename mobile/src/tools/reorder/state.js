const pageSequence = (pageCount) => Array.from({ length: Number(pageCount) }, (_, index) => index + 1);

export function createReorderState() {
  return {
    file: null,
    picking: false,
    order: [],
    thumbnails: {},
    draggingPage: null,
    error: null,
    result: null,
  };
}

export function withReorderFile(state, file) {
  const pageCount = Number(file?.pageCount);
  if (!file || !Number.isInteger(pageCount) || pageCount < 1) {
    return { ...state, picking: false, error: 'The selected PDF has no readable pages.' };
  }
  return {
    ...createReorderState(),
    file: Object.freeze({ ...file, pageCount }),
    order: pageSequence(pageCount),
  };
}

export function applyReorderSelection(state, selection) {
  if (selection?.cancelled) return { ...state, picking: false };
  return selection?.file ? withReorderFile(state, selection.file) : { ...state, picking: false };
}

export function movePage(order, fromIndex, toIndex) {
  if (!Array.isArray(order) || !Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return [...(order || [])];
  if (fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length || fromIndex === toIndex) return [...order];
  const next = [...order];
  const [page] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, page);
  return next;
}

export function movePageByNumber(order, page, toIndex) {
  return movePage(order, order.indexOf(Number(page)), toIndex);
}

export function resetPageOrder(pageCount) {
  return Number.isInteger(Number(pageCount)) && Number(pageCount) > 0 ? pageSequence(pageCount) : [];
}

export function validatePageOrder(order, pageCount) {
  const total = Number(pageCount);
  if (!Array.isArray(order) || !order.length) return { valid: false, code: 'EMPTY_PAGE_ORDER' };
  if (!Number.isInteger(total) || total < 1 || order.length !== total) return { valid: false, code: 'INVALID_PAGE_ORDER' };
  const expected = new Set(pageSequence(total));
  const actual = new Set(order.map(Number));
  if (actual.size !== total || [...actual].some((page) => !expected.has(page))) return { valid: false, code: 'INVALID_PAGE_ORDER' };
  return { valid: true, code: null, order: order.map(Number) };
}

export function isOriginalOrder(order, pageCount) {
  const original = resetPageOrder(pageCount);
  return original.length === order?.length && original.every((page, index) => page === order[index]);
}
