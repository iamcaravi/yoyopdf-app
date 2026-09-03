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

test('split PDF and ZIP outputs use the existing recent metadata store', () => {
  const split = addRecentFile([], {
    uri: 'content://downloads/source_split_parts.zip',
    name: 'source_split_parts.zip',
    size: 4096,
    operation: 'split',
    mimeType: 'application/zip',
    pageCount: 8,
    outputCount: 3,
  });
  assert.equal(split[0].operation, 'split');
  assert.equal(split[0].mimeType, 'application/zip');
  assert.equal(split[0].outputCount, 3);
  assert.equal(split[0].pageCount, 8);
});

test('reordered PDFs use the existing recent metadata store', () => {
  const files = addRecentFile([], {
    uri: 'content://downloads/source_reordered.pdf',
    name: 'source_reordered.pdf',
    size: 3072,
    operation: 'reorder',
    mimeType: 'application/pdf',
    pageCount: 5,
  });
  assert.equal(files[0].operation, 'reorder');
  assert.equal(files[0].mimeType, 'application/pdf');
  assert.equal(files[0].pageCount, 5);
});

test('page-deletion outputs use the existing recent metadata store', () => {
  const files = addRecentFile([], {
    uri: 'content://downloads/source_pages_removed.pdf',
    name: 'source_pages_removed.pdf',
    size: 2500,
    operation: 'delete',
    mimeType: 'application/pdf',
    pageCount: 3,
    deletedCount: 2,
  });
  assert.equal(files[0].operation, 'delete');
  assert.equal(files[0].pageCount, 3);
  assert.equal(files[0].deletedCount, 2);
});
