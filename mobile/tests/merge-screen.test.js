import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMergeScreen } from '../src/screens/merge.js';

const state = (overrides = {}) => ({
  files: [],
  picking: false,
  error: null,
  result: null,
  ...overrides,
});

test('empty merge screen exposes the icon and text picker controls', () => {
  const html = renderMergeScreen(state());
  const pickerControls = html.match(/data-merge-add/g) ?? [];

  assert.equal(pickerControls.length, 3);
  assert.match(html, /<button class="merge-drop-empty__add" type="button" data-merge-add aria-label="Choose PDFs" >＋<\/button>/);
  assert.match(html, />Choose PDFs<\/button>/);
  assert.match(html, />\+ Add PDF<\/button>/);
});

test('all empty-state picker controls are disabled while picking', () => {
  const html = renderMergeScreen(state({ picking: true }));
  const pickerControls = html.match(/<button[^>]*data-merge-add[^>]*disabled[^>]*>/g) ?? [];

  assert.equal(pickerControls.length, 3);
});

test('selected merge screen keeps the add PDF picker control', () => {
  const html = renderMergeScreen(state({
    files: [{ id: 'content://documents/first', uri: 'content://documents/first', name: 'first.pdf', size: 1024, available: true }],
  }));

  assert.equal((html.match(/data-merge-add/g) ?? []).length, 1);
  assert.match(html, />\+ Add PDF<\/button>/);
});
