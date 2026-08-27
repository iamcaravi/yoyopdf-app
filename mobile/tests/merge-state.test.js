import test from 'node:test';
import assert from 'node:assert/strict';
import { addPdfFiles, canMerge, movePdf, removePdf, validateMerge } from '../src/tools/merge/state.js';

const pdf = (name) => ({ id: `content://documents/${name}`, uri: `content://documents/${name}`, name: `${name}.pdf`, size: 1024, available: true });
const names = (files) => files.map((file) => file.name);

test('selection preserves initial order and skips duplicate content URIs', () => {
  const result = addPdfFiles([], [pdf('first'), pdf('second'), pdf('first')]);
  assert.deepEqual(names(result.files), ['first.pdf', 'second.pdf']);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.invalidCount, 0);
});

test('subsequent selections append without disturbing existing order', () => {
  const initial = addPdfFiles([], [pdf('first'), pdf('second')]).files;
  const result = addPdfFiles(initial, [pdf('third')]);
  assert.deepEqual(names(result.files), ['first.pdf', 'second.pdf', 'third.pdf']);
});

test('invalid file references are not added', () => {
  const result = addPdfFiles([], [{ uri: 'file:///unsafe.pdf', name: 'unsafe.pdf' }, { uri: 'content://ok', name: 'not-text.txt' }]);
  assert.equal(result.files.length, 0);
  assert.equal(result.invalidCount, 2);
});

test('moving first to last preserves exact requested order', () => {
  assert.deepEqual(names(movePdf([pdf('a'), pdf('b'), pdf('c')], 0, 2)), ['b.pdf', 'c.pdf', 'a.pdf']);
});

test('moving last to first preserves exact requested order', () => {
  assert.deepEqual(names(movePdf([pdf('a'), pdf('b'), pdf('c')], 2, 0)), ['c.pdf', 'a.pdf', 'b.pdf']);
});

test('moving middle items works in either direction', () => {
  const files = [pdf('a'), pdf('b'), pdf('c'), pdf('d')];
  assert.deepEqual(names(movePdf(files, 1, 2)), ['a.pdf', 'c.pdf', 'b.pdf', 'd.pdf']);
  assert.deepEqual(names(movePdf(files, 2, 1)), ['a.pdf', 'c.pdf', 'b.pdf', 'd.pdf']);
});

test('removing after reorder removes only the selected document', () => {
  const reordered = movePdf([pdf('a'), pdf('b'), pdf('c')], 0, 2);
  assert.deepEqual(names(removePdf(reordered, pdf('c').uri)), ['b.pdf', 'a.pdf']);
});

test('merge validation requires at least two accessible PDFs', () => {
  assert.deepEqual(validateMerge([]), { valid: false, code: 'NO_FILES' });
  assert.deepEqual(validateMerge([pdf('a')]), { valid: false, code: 'TOO_FEW_FILES' });
  assert.equal(canMerge([pdf('a'), pdf('b')]), true);
  assert.equal(canMerge([{ ...pdf('a'), available: false }, pdf('b')]), false);
});
