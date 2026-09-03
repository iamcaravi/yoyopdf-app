import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDeleteSelection,
  createDeleteState,
  selectAllDeletePages,
  toggleDeletePage,
  validateDeleteSelection,
  withDeleteFile,
} from '../src/tools/delete/state.js';

const file = { uri: 'content://documents/source', name: 'source.pdf', size: 1024, pageCount: 5 };

test('PDF selection creates a page-count-aware deletion workspace', () => {
  const state = withDeleteFile(createDeleteState(), file);
  assert.equal(state.file.pageCount, 5);
  assert.deepEqual(state.selectedPages, []);
});

test('pages can be selected and deselected', () => {
  assert.deepEqual(toggleDeletePage([], 3), [3]);
  assert.deepEqual(toggleDeletePage([1, 3], 3), [1]);
  assert.deepEqual(toggleDeletePage([4, 2], 3), [2, 3, 4]);
});

test('Select all and Clear-compatible state preserve remaining counts', () => {
  const all = selectAllDeletePages(5);
  assert.deepEqual(all, [1, 2, 3, 4, 5]);
  assert.equal(validateDeleteSelection([2, 4], 5).remaining, 3);
  assert.equal(validateDeleteSelection([], 5).remaining, 5);
});

test('no selection and deleting every page disable processing', () => {
  assert.equal(validateDeleteSelection([], 5).code, 'NO_PAGES_SELECTED');
  assert.equal(validateDeleteSelection([1, 2, 3, 4, 5], 5).code, 'DELETE_ALL_PAGES');
  assert.equal(validateDeleteSelection([1, 3, 5], 5).valid, true);
  assert.equal(validateDeleteSelection([6], 5).code, 'INVALID_PAGE_INDEX');
});

test('picker cancellation preserves the screen and clears picking', () => {
  const state = { ...withDeleteFile(createDeleteState(), file), picking: true };
  const next = applyDeleteSelection(state, { cancelled: true });
  assert.equal(next.picking, false);
  assert.equal(next.file.uri, file.uri);
});
