import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySplitSelection,
  buildFixedGroups,
  buildSplitPlan,
  createSplitState,
  selectAllPages,
  toggleSelectedPage,
  validateRanges,
  withSplitFile,
} from '../src/tools/split/state.js';

const loadedState = (pageCount = 10) => withSplitFile(createSplitState(), {
  id: 'content://documents/source',
  uri: 'content://documents/source',
  name: 'source.pdf',
  size: 2048,
  pageCount,
});

test('PDF selection transitions to a page-count-aware workspace', () => {
  const state = loadedState(12);
  assert.equal(state.file.pageCount, 12);
  assert.deepEqual(state.ranges.map(({ from, to }) => ({ from, to })), [{ from: 1, to: 12 }]);
});

test('cancelled picker preserves the current screen state and clears picking', () => {
  const state = { ...loadedState(4), picking: true };
  const next = applySplitSelection(state, { cancelled: true });
  assert.equal(next.picking, false);
  assert.equal(next.file.uri, state.file.uri);
  assert.deepEqual(next.ranges, state.ranges);
});

test('custom ranges validate bounds and reject duplicate or overlapping pages', () => {
  assert.equal(validateRanges([{ from: 1, to: 5 }, { from: 6, to: 10 }], 10).valid, true);
  assert.equal(validateRanges([{ from: 0, to: 2 }], 10).code, 'RANGE_OUT_OF_BOUNDS');
  assert.equal(validateRanges([{ from: 1, to: 5 }, { from: 5, to: 8 }], 10).code, 'OVERLAPPING_RANGES');
});

test('valid ranges produce ordered output groups', () => {
  const state = { ...loadedState(10), ranges: [{ id: 1, from: 1, to: 2 }, { id: 2, from: 6, to: 8 }] };
  assert.deepEqual(buildSplitPlan(state).groups, [[1, 2], [6, 7, 8]]);
});

test('fixed pages-per-file splitting includes a final partial group', () => {
  assert.deepEqual(buildFixedGroups(10, 3), [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
});

test('page selection toggles, selects all, clears, combines, and separates', () => {
  let selected = toggleSelectedPage([], 3);
  selected = toggleSelectedPage(selected, 1);
  assert.deepEqual(selected, [1, 3]);
  assert.deepEqual(toggleSelectedPage(selected, 3), [1]);
  assert.deepEqual(selectAllPages(3), [1, 2, 3]);
  assert.deepEqual(selectAllPages(0), []);
  const state = { ...loadedState(4), mode: 'pages', selectedPages: [1, 4], pageOutput: 'combined' };
  assert.deepEqual(buildSplitPlan(state).groups, [[1, 4]]);
  assert.deepEqual(buildSplitPlan({ ...state, pageOutput: 'separate' }).groups, [[1], [4]]);
});

test('empty page selection cannot start a split', () => {
  assert.equal(buildSplitPlan({ ...loadedState(4), mode: 'pages', selectedPages: [] }).code, 'NO_PAGES_SELECTED');
});
