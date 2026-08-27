import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOutputFilename } from '../src/tools/merge/output-name.js';
import { userMessageForError, validationMessage } from '../src/tools/merge/errors.js';

test('output naming is sensible, bounded, and removes unsafe filename characters', () => {
  assert.equal(buildOutputFilename(), 'merged-pdf.pdf');
  assert.equal(buildOutputFilename('combined.pdf'), 'combined.pdf');
  assert.equal(buildOutputFilename('quarter:one/report'), 'quarter-one-report.pdf');
  assert.ok(buildOutputFilename('x'.repeat(200)).length <= 74);
});

test('native error codes become actionable user messages without stack details', () => {
  assert.match(userMessageForError({ code: 'ENCRYPTED_PDF', message: 'java stack' }), /Password-protected/i);
  assert.match(userMessageForError({ code: 'INSUFFICIENT_STORAGE' }), /free storage/i);
  assert.match(validationMessage('TOO_FEW_FILES'), /at least two/i);
  assert.doesNotMatch(userMessageForError({ message: 'java.lang.RuntimeException' }), /java\.lang/i);
});
