import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSplitScreen } from '../src/screens/split.js';
import { createSplitState, withSplitFile } from '../src/tools/split/state.js';

test('empty Split PDF upload zone and Choose PDF button share the picker hook', () => {
  const html = renderSplitScreen(createSplitState());
  assert.equal((html.match(/data-split-pick/g) ?? []).length, 2);
  assert.match(html, /<button class="split-upload-zone"/);
  assert.match(html, /aria-label="Choose a PDF to split"/);
  assert.match(html, />Choose PDF<\/button>/);
});

test('picking disables every Split PDF upload affordance', () => {
  const html = renderSplitScreen({ ...createSplitState(), picking: true });
  assert.equal((html.match(/data-split-pick[^>]*disabled/g) ?? []).length, 2);
});

test('loaded Split PDF workspace displays page count and accessible page grid', () => {
  const state = withSplitFile(createSplitState(), {
    uri: 'content://documents/source',
    name: 'source.pdf',
    size: 1024,
    pageCount: 3,
  });
  const html = renderSplitScreen({ ...state, mode: 'pages', selectedPages: [2] });
  assert.match(html, /3 pages/);
  assert.equal((html.match(/data-split-page="/g) ?? []).length, 3);
  assert.match(html, /aria-label="Page 2" aria-pressed="true"/);
  assert.match(html, /Select all/);
  assert.match(html, />Clear<\/button>/);
});

test('one output advertises PDF and multiple outputs advertise ZIP', () => {
  const base = withSplitFile(createSplitState(), { uri: 'content://documents/source', name: 'source.pdf', size: 1024, pageCount: 6 });
  assert.match(renderSplitScreen(base), /1 output file · PDF result/);
  const multiple = { ...base, ranges: [{ id: 1, from: 1, to: 2 }, { id: 2, from: 3, to: 6 }] };
  assert.match(renderSplitScreen(multiple), /2 output files · ZIP result/);
});
