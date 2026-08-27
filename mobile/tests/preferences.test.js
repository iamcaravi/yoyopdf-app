import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTheme, normalizeTheme, saveTheme, THEME_KEY } from '../src/storage/preferences.js';

test('invalid theme preferences become system', () => {
  assert.equal(normalizeTheme('sepia'), 'system');
  assert.equal(normalizeTheme(null), 'system');
});

test('theme preferences persist through the storage adapter', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.equal(saveTheme('dark', storage), 'dark');
  assert.equal(values.get(THEME_KEY), 'dark');
  assert.equal(loadTheme(storage), 'dark');
});
