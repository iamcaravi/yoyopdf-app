import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeHref } from '../src/app/routes.js';

test('unknown routes fall back to home', () => {
  assert.deepEqual(parseRoute('#/unknown'), { root: 'home', detail: null });
});

test('settings details are parsed', () => {
  assert.deepEqual(parseRoute('#/settings/privacy'), { root: 'settings', detail: 'privacy' });
  assert.equal(routeHref('settings', 'privacy'), '#/settings/privacy');
});

test('Reorder Pages navigation preserves the tool detail route', () => {
  assert.deepEqual(parseRoute('#/tools/reorder'), { root: 'tools', detail: 'reorder' });
});

test('Delete Pages navigation preserves the tool detail route', () => {
  assert.deepEqual(parseRoute('#/tools/delete'), { root: 'tools', detail: 'delete' });
});
