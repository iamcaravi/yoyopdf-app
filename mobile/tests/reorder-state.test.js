import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyReorderSelection,
  createReorderState,
  isOriginalOrder,
  movePage,
  movePageByNumber,
  resetPageOrder,
  validatePageOrder,
  withReorderFile,
} from '../src/tools/reorder/state.js';

const file = { uri: 'content://documents/source', name: 'source.pdf', size: 1024, pageCount: 5 };

test('PDF selection creates the complete original page order', () => {
  const state = withReorderFile(createReorderState(), file);
  assert.equal(state.file.pageCount, 5);
  assert.deepEqual(state.order, [1, 2, 3, 4, 5]);
  assert.equal(isOriginalOrder(state.order, 5), true);
});

test('pages move from any position to any other position', () => {
  assert.deepEqual(movePage([1, 2, 3, 4, 5], 0, 4), [2, 3, 4, 5, 1]);
  assert.deepEqual(movePage([1, 2, 3, 4, 5], 4, 0), [5, 1, 2, 3, 4]);
  const firstMove = movePageByNumber([1, 2, 3, 4, 5], 2, 3);
  assert.deepEqual(movePageByNumber(firstMove, 5, 1), [1, 5, 3, 4, 2]);
});

test('reset restores original order after multiple moves', () => {
  assert.deepEqual(resetPageOrder(5), [1, 2, 3, 4, 5]);
  assert.equal(isOriginalOrder([2, 1, 3, 4, 5], 5), false);
});

test('validation preserves every page exactly once', () => {
  assert.equal(validatePageOrder([5, 3, 1, 4, 2], 5).valid, true);
  assert.equal(validatePageOrder([], 5).code, 'EMPTY_PAGE_ORDER');
  assert.equal(validatePageOrder([1, 2, 2, 4, 5], 5).code, 'INVALID_PAGE_ORDER');
  assert.equal(validatePageOrder([1, 2, 3, 4], 5).code, 'INVALID_PAGE_ORDER');
  assert.equal(validatePageOrder([1, 2, 3, 4, 6], 5).code, 'INVALID_PAGE_ORDER');
});

test('picker cancellation clears loading without replacing the selected file', () => {
  const state = { ...withReorderFile(createReorderState(), file), picking: true };
  const next = applyReorderSelection(state, { cancelled: true });
  assert.equal(next.picking, false);
  assert.equal(next.file.uri, file.uri);
});
