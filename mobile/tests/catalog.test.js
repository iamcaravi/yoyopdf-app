import test from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_CATEGORIES } from '../src/tools/catalog.js';

test('the planned catalog has unique tool names and no false ready states', () => {
  const tools = TOOL_CATEGORIES.flatMap((category) => category.tools);
  assert.equal(tools.length, 23);
  assert.equal(new Set(tools.map((tool) => tool.name)).size, tools.length);
  assert.ok(tools.every((tool) => tool.status === 'planned'));
});
