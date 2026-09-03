import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReorderResult, renderReorderScreen } from '../src/screens/reorder.js';
import { createReorderState, withReorderFile } from '../src/tools/reorder/state.js';

test('empty Reorder Pages screen uses two real picker buttons', () => {
  const html = renderReorderScreen(createReorderState());
  assert.equal((html.match(/data-reorder-pick/g) ?? []).length, 2);
  assert.match(html, /<button class="split-upload-zone"/);
  assert.match(html, /aria-label="Choose a PDF to reorder"/);
});

test('picker controls are disabled while selection is opening', () => {
  const html = renderReorderScreen({ ...createReorderState(), picking: true });
  assert.equal((html.match(/data-reorder-pick[^>]*disabled/g) ?? []).length, 2);
});

test('selected PDF shows page count, thumbnails, drag handles, and accessible moves', () => {
  const state = withReorderFile(createReorderState(), { uri: 'content://documents/source', name: 'source.pdf', size: 2048, pageCount: 3 });
  const html = renderReorderScreen({ ...state, thumbnails: { 2: 'data:image/jpeg;base64,preview' } });
  assert.match(html, /3 pages/);
  assert.equal((html.match(/data-reorder-card=/g) ?? []).length, 3);
  assert.equal((html.match(/data-reorder-thumbnail=/g) ?? []).length, 3);
  assert.equal((html.match(/data-reorder-drag=/g) ?? []).length, 3);
  assert.match(html, /aria-label="Move page 2 up"/);
  assert.match(html, /data:image\/jpeg;base64,preview/);
});

test('result exposes Open, Share, Done, and another-file actions', () => {
  const html = renderReorderResult({ name: 'source_reordered.pdf', size: 4096, pageCount: 3 });
  assert.match(html, /data-result-open/);
  assert.match(html, /data-result-share/);
  assert.match(html, /data-reorder-another/);
  assert.match(html, /href="#\/files">Done/);
});
