import test from 'node:test';
import assert from 'node:assert/strict';
import { addRecentFile, loadRecentFiles, removeRecentFile, saveRecentFiles, RECENT_FILES_KEY } from '../src/storage/recent-files.js';

const output = (name = 'merged-pdf.pdf') => ({
  uri: `content://downloads/${name}`,
  name,
  size: 2048,
  createdAt: 1700000000000,
  operation: 'merge',
});

test('recent metadata stores references but never document bytes', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  const saved = saveRecentFiles([output()], storage);
  assert.equal(saved.length, 1);
  assert.doesNotMatch(values.get(RECENT_FILES_KEY), /base64|arrayBuffer|bytes/i);
  assert.deepEqual(loadRecentFiles(storage), saved);
});

test('new results are first, duplicate URIs are replaced, and removal is metadata-only', () => {
  const first = output('first.pdf');
  const second = output('second.pdf');
  let files = addRecentFile([], first);
  files = addRecentFile(files, second);
  files = addRecentFile(files, { ...first, size: 4096 });
  assert.deepEqual(files.map((file) => file.name), ['first.pdf', 'second.pdf']);
  assert.equal(files[0].size, 4096);
  assert.deepEqual(removeRecentFile(files, first.uri).map((file) => file.name), ['second.pdf']);
});

test('unsafe or corrupted persisted references are ignored', () => {
  const storage = { getItem: () => JSON.stringify([{ uri: 'file:///private.pdf', name: 'bad.pdf' }, null]) };
  assert.deepEqual(loadRecentFiles(storage), []);
});
