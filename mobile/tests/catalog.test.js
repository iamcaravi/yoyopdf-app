import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_CATEGORIES } from '../src/tools/catalog.js';

test('the catalog exposes all implemented on-device PDF tools', () => {
  const tools = TOOL_CATEGORIES.flatMap((category) => category.tools);
  assert.equal(tools.length, 23);
  assert.equal(new Set(tools.map((tool) => tool.name)).size, tools.length);
  assert.deepEqual(tools.filter((tool) => tool.status === 'available').map((tool) => tool.name), ['Merge PDF', 'Split PDF', 'Reorder Pages', 'Delete Pages']);
  assert.ok(tools.filter((tool) => !['Merge PDF', 'Split PDF', 'Reorder Pages', 'Delete Pages'].includes(tool.name)).every((tool) => tool.status === 'planned'));
  assert.equal(tools.find((tool) => tool.name === 'Split PDF').route, '#/tools/split');
  assert.equal(tools.find((tool) => tool.name === 'Reorder Pages').route, '#/tools/reorder');
  assert.equal(tools.find((tool) => tool.name === 'Delete Pages').route, '#/tools/delete');
});
