import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDeleteResult, renderDeleteScreen } from '../src/screens/delete.js';
import { createDeleteState, withDeleteFile } from '../src/tools/delete/state.js';

test('empty Delete Pages screen has two real picker buttons', () => {
  const html = renderDeleteScreen(createDeleteState());
  assert.equal((html.match(/data-delete-pick/g) ?? []).length, 2);
  assert.match(html, /aria-label="Choose a PDF to delete pages from"/);
});

test('picker controls are disabled while opening Android documents', () => {
  const html = renderDeleteScreen({ ...createDeleteState(), picking: true });
  assert.equal((html.match(/data-delete-pick[^>]*disabled/g) ?? []).length, 2);
});

test('workspace exposes thumbnails, selected state, counts, and controls', () => {
  const base = withDeleteFile(createDeleteState(), { uri: 'content://documents/source', name: 'source.pdf', size: 2048, pageCount: 4 });
  const html = renderDeleteScreen({ ...base, selectedPages: [2], thumbnails: { 2: 'data:image/jpeg;base64,preview' } });
  assert.match(html, /4 pages/);
  assert.match(html, /1 selected for deletion/);
  assert.match(html, /3 pages will remain/);
  assert.equal((html.match(/data-delete-page=/g) ?? []).length, 4);
  assert.match(html, /aria-label="Page 2, selected for deletion" aria-pressed="true"/);
  assert.match(html, />Delete 1 Page</);
});

test('Delete action is disabled for none and all but enabled for a valid subset', () => {
  const base = withDeleteFile(createDeleteState(), { uri: 'content://documents/source', name: 'source.pdf', size: 2048, pageCount: 2 });
  assert.match(renderDeleteScreen(base), /data-delete-run disabled/);
  assert.match(renderDeleteScreen({ ...base, selectedPages: [1, 2] }), /data-delete-run disabled/);
  assert.doesNotMatch(renderDeleteScreen({ ...base, selectedPages: [1] }), /data-delete-run disabled/);
});

test('result exposes output count and Open, Share, Done actions', () => {
  const html = renderDeleteResult({ name: 'source_pages_removed.pdf', size: 3000, pageCount: 3, deletedCount: 2 });
  assert.match(html, /2 pages removed/);
  assert.match(html, /data-result-open/);
  assert.match(html, /data-result-share/);
  assert.match(html, /href="#\/files">Done/);
});
