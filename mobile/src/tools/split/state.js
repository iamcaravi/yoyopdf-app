const validPageCount = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

export function createSplitState() {
  return {
    file: null,
    picking: false,
    mode: 'range',
    rangeKind: 'custom',
    ranges: [{ id: 1, from: 1, to: 1 }],
    nextRangeId: 2,
    everyN: 1,
    selectedPages: [],
    thumbnails: {},
    pageOutput: 'combined',
    error: null,
    result: null,
  };
}

export function withSplitFile(state, file) {
  const pageCount = Number(file?.pageCount);
  if (!file || !validPageCount(pageCount)) return { ...state, error: 'The selected PDF has no readable pages.' };
  return {
    ...createSplitState(),
    file: Object.freeze({ ...file, pageCount }),
    ranges: [{ id: 1, from: 1, to: pageCount }],
  };
}

export function applySplitSelection(state, selection) {
  if (selection?.cancelled) return { ...state, picking: false };
  if (selection?.file) return withSplitFile(state, selection.file);
  return { ...state, picking: false };
}

export function validateRanges(ranges, pageCount) {
  if (!validPageCount(pageCount) || !Array.isArray(ranges) || ranges.length === 0) {
    return { valid: false, code: 'NO_RANGES' };
  }
  const normalized = [];
  for (const range of ranges) {
    const from = Number(range?.from);
    const to = Number(range?.to);
    if (!Number.isInteger(from) || !Number.isInteger(to)) return { valid: false, code: 'INVALID_RANGE' };
    if (from < 1 || to < from || to > pageCount) return { valid: false, code: 'RANGE_OUT_OF_BOUNDS' };
    normalized.push({ from, to });
  }
  const sorted = [...normalized].sort((left, right) => left.from - right.from || left.to - right.to);
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].from <= sorted[index - 1].to) return { valid: false, code: 'OVERLAPPING_RANGES' };
  }
  return { valid: true, code: null, ranges: normalized };
}

export function buildFixedGroups(pageCount, everyN) {
  const total = Number(pageCount);
  const size = Number(everyN);
  if (!validPageCount(total) || !Number.isInteger(size) || size < 1) return [];
  const groups = [];
  for (let first = 1; first <= total; first += size) {
    groups.push(Array.from({ length: Math.min(size, total - first + 1) }, (_, index) => first + index));
  }
  return groups;
}

export function toggleSelectedPage(pages, page) {
  const value = Number(page);
  const selected = new Set((pages || []).map(Number));
  if (selected.has(value)) selected.delete(value); else selected.add(value);
  return [...selected].sort((left, right) => left - right);
}

export function selectAllPages(pageCount) {
  if (!validPageCount(pageCount)) return [];
  return Array.from({ length: Number(pageCount) }, (_, index) => index + 1);
}

export function buildSplitPlan(state) {
  const pageCount = Number(state?.file?.pageCount);
  if (!state?.file) return { valid: false, code: 'NO_FILES', groups: [] };
  if (!validPageCount(pageCount)) return { valid: false, code: 'INVALID_PDF', groups: [] };

  if (state.mode === 'range' && state.rangeKind === 'fixed') {
    const groups = buildFixedGroups(pageCount, state.everyN);
    return groups.length ? { valid: true, code: null, groups } : { valid: false, code: 'INVALID_FIXED_COUNT', groups: [] };
  }

  if (state.mode === 'range') {
    const validation = validateRanges(state.ranges, pageCount);
    if (!validation.valid) return { ...validation, groups: [] };
    return {
      valid: true,
      code: null,
      groups: validation.ranges.map(({ from, to }) => Array.from({ length: to - from + 1 }, (_, index) => from + index)),
    };
  }

  const selectedPages = [...new Set((state.selectedPages || []).map(Number))]
    .filter((page) => Number.isInteger(page) && page >= 1 && page <= pageCount)
    .sort((left, right) => left - right);
  if (!selectedPages.length) return { valid: false, code: 'NO_PAGES_SELECTED', groups: [] };
  return {
    valid: true,
    code: null,
    groups: state.pageOutput === 'separate' ? selectedPages.map((page) => [page]) : [selectedPages],
  };
}
