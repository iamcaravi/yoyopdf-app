import test from 'node:test';
import assert from 'node:assert/strict';
import { renderProcessingOverlay } from '../src/components/processing-overlay.js';

test('indeterminate processing never invents a percentage', () => {
  const html = renderProcessingOverlay({ status: 'processing', title: 'Working', message: 'Please wait', cancellable: true });
  assert.match(html, /is-indeterminate/);
  assert.doesNotMatch(html, /aria-valuenow|%/);
});

test('measured file progress uses real completed and total values', () => {
  const html = renderProcessingOverlay({ status: 'processing', title: 'Merging', message: 'Combined', completed: 1, total: 4 });
  assert.match(html, /aria-valuenow="1"/);
  assert.match(html, /1 of 4 PDFs combined/);
  assert.match(html, /width:25%/);
});
