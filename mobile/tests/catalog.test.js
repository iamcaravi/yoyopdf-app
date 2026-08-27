import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_CATEGORIES } from '../src/tools/catalog.js';

test('the catalog has unique tools and only Merge PDF is available', () => {
  const tools = TOOL_CATEGORIES.flatMap((category) => category.tools);
  assert.equal(tools.length, 23);
  assert.equal(new Set(tools.map((tool) => tool.name)).size, tools.length);
  assert.deepEqual(tools.filter((tool) => tool.status === 'available').map((tool) => tool.name), ['Merge PDF']);
  assert.ok(tools.filter((tool) => tool.name !== 'Merge PDF').every((tool) => tool.status === 'planned'));
});
