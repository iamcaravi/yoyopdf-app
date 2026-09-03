import { escapeAttribute, escapeHtml } from '../app/escape.js';
import { renderHeader } from '../components/app-header.js';
import { deleteValidationMessage } from '../tools/delete/errors.js';
import { validateDeleteSelection } from '../tools/delete/state.js';

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderEmpty(state) {
  const disabled = state.picking ? 'disabled' : '';
  return `<section class="split-empty" aria-labelledby="delete-empty-title">
    <button class="split-upload-zone" type="button" data-delete-pick aria-label="Choose a PDF to delete pages from" ${disabled}>
      <span class="split-upload-zone__plus" aria-hidden="true">＋</span>
      <span><strong id="delete-empty-title">Choose one PDF</strong><small>Tap to browse Android files and document providers</small></span>
    </button>
    <button class="button button--primary" type="button" data-delete-pick ${disabled}>${state.picking ? 'Opening…' : 'Choose PDF'}</button>
  </section>`;
}

function renderPage(state, page) {
  const selected = state.selectedPages.includes(page);
  const thumbnail = state.thumbnails?.[page];
  return `<button class="delete-page ${selected ? 'is-selected' : ''}" type="button" data-delete-page="${page}" aria-label="Page ${page}${selected ? ', selected for deletion' : ''}" aria-pressed="${selected}">
    <span class="split-page__preview" aria-hidden="true"><img data-delete-thumbnail="${page}" ${thumbnail ? `src="${escapeAttribute(thumbnail)}"` : ''} alt=""><span data-thumbnail-placeholder ${thumbnail ? 'hidden' : ''}>PDF</span><strong data-thumbnail-placeholder ${thumbnail ? 'hidden' : ''}>${page}</strong><span class="delete-page__mark">${selected ? '✓ Delete' : 'Keep'}</span></span>
    <strong>Page ${page}</strong>
  </button>`;
}

function renderWorkspace(state) {
  const validation = validateDeleteSelection(state.selectedPages, state.file.pageCount);
  const count = state.selectedPages.length;
  const message = state.error || (validation.code === 'DELETE_ALL_PAGES' ? deleteValidationMessage(validation.code) : null);
  return `<section class="split-file-card"><span aria-hidden="true">PDF</span><div><strong>${escapeHtml(state.file.name)}</strong><small>${formatSize(state.file.size)} · ${state.file.pageCount} page${state.file.pageCount === 1 ? '' : 's'}</small></div><button class="mini-button mini-button--danger" type="button" data-delete-remove-file aria-label="Remove ${escapeAttribute(state.file.name)}">×</button></section>
    <section class="delete-toolbar" aria-label="Page deletion selection"><div><strong>${count} selected for deletion</strong><small>${validation.remaining} page${validation.remaining === 1 ? '' : 's'} will remain</small></div><span><button type="button" data-delete-select-all ${count === state.file.pageCount ? 'disabled' : ''}>Select all</button><button type="button" data-delete-clear ${count ? '' : 'disabled'}>Clear</button></span></section>
    <div class="inline-alert" role="alert" data-delete-validation ${message ? '' : 'hidden'}><strong>At least one page must remain</strong><span>${message ? escapeHtml(message) : ''}</span></div>
    <section class="split-pages" aria-labelledby="delete-pages-title"><div class="split-pages__heading"><h2 id="delete-pages-title">Choose pages to delete</h2><span>${state.file.pageCount} total</span></div>
      <p class="reorder-hint">Tap a page to mark it for deletion. Selected cards also show a “Delete” label.</p>
      <div class="delete-page-grid">${Array.from({ length: state.file.pageCount }, (_, index) => renderPage(state, index + 1)).join('')}</div>
    </section>
    <div class="split-sticky-action"><button class="button button--primary button--wide" type="button" data-delete-run ${validation.valid ? '' : 'disabled'}>${count ? `Delete ${count} Page${count === 1 ? '' : 's'}` : 'Delete Pages'}</button><small>${validation.valid ? `${validation.remaining} page${validation.remaining === 1 ? '' : 's'} will remain in a new PDF` : validation.code === 'DELETE_ALL_PAGES' ? 'Clear at least one page to continue' : 'Select one or more pages to delete'}</small></div>`;
}

export function renderDeleteResult(result) {
  return `${renderHeader({ title: 'Pages deleted', eyebrow: 'SAVED ON DEVICE', backHref: '#/files' })}
    <section class="result-page"><div class="result-check" aria-hidden="true">✓</div><p class="result-page__eyebrow">YOUR FILE IS READY</p><h2>Your updated PDF is ready</h2><p class="result-page__body">${result.deletedCount} page${result.deletedCount === 1 ? '' : 's'} removed. ${result.pageCount} page${result.pageCount === 1 ? '' : 's'} remain, and your original document was not changed.</p>
      <div class="result-file"><span aria-hidden="true">PDF</span><div><strong>${escapeHtml(result.name)}</strong><small>${formatSize(result.size)} · ${result.pageCount} pages</small></div></div>
      <div class="result-actions"><button class="button button--primary" type="button" data-result-open>Open</button><button class="button button--outline" type="button" data-result-share>Share</button></div>
      <button class="button button--quiet button--wide" type="button" data-delete-another>Delete pages from another PDF</button><a class="done-link" href="#/files">Done</a>
    </section>`;
}

export function renderDeleteScreen(state) {
  if (state.result) return renderDeleteResult(state.result);
  return `${renderHeader({ title: 'Delete Pages', eyebrow: 'ORGANIZE PDF', backHref: '#/tools' })}
    <section class="merge-intro"><h2>Keep only the pages you need</h2><p>Select unwanted pages, then save a new PDF. Your original stays unchanged and processing remains on this device.</p></section>
    ${state.file ? renderWorkspace(state) : `${state.error ? `<div class="inline-alert" role="alert"><strong>Couldn’t continue</strong><span>${escapeHtml(state.error)}</span></div>` : ''}${renderEmpty(state)}`}`;
}
