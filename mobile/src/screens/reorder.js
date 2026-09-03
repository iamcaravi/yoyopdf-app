import { escapeAttribute, escapeHtml } from '../app/escape.js';
import { renderHeader } from '../components/app-header.js';
import { isOriginalOrder, validatePageOrder } from '../tools/reorder/state.js';
import { reorderValidationMessage } from '../tools/reorder/errors.js';

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderEmpty(state) {
  const disabled = state.picking ? 'disabled' : '';
  return `<section class="split-empty" aria-labelledby="reorder-empty-title">
    <button class="split-upload-zone" type="button" data-reorder-pick aria-label="Choose a PDF to reorder" ${disabled}>
      <span class="split-upload-zone__plus" aria-hidden="true">＋</span>
      <span><strong id="reorder-empty-title">Choose one PDF</strong><small>Tap to browse Android files and document providers</small></span>
    </button>
    <button class="button button--primary" type="button" data-reorder-pick ${disabled}>${state.picking ? 'Opening…' : 'Choose PDF'}</button>
  </section>`;
}

function pageCard(state, page, index) {
  const thumbnail = state.thumbnails?.[page];
  const count = state.order.length;
  const dragging = state.draggingPage === page;
  return `<article class="reorder-page ${dragging ? 'is-dragging' : ''}" data-reorder-card="${page}" data-reorder-index="${index}">
    <button class="reorder-page__drag" type="button" data-reorder-drag="${page}" aria-label="Drag page ${page} to reorder">⠿</button>
    <span class="reorder-page__position" aria-label="Position ${index + 1}">${index + 1}</span>
    <div class="split-page__preview" aria-hidden="true"><img data-reorder-thumbnail="${page}" ${thumbnail ? `src="${escapeAttribute(thumbnail)}"` : ''} alt=""><span data-thumbnail-placeholder ${thumbnail ? 'hidden' : ''}>PDF</span><strong data-thumbnail-placeholder ${thumbnail ? 'hidden' : ''}>${page}</strong></div>
    <strong class="reorder-page__label">Page ${page}</strong>
    <div class="reorder-page__actions" aria-label="Move page ${page}">
      <button type="button" data-reorder-move-page="${page}" data-reorder-to="0" aria-label="Move page ${page} to beginning" ${index === 0 ? 'disabled' : ''}>⇤</button>
      <button type="button" data-reorder-move-page="${page}" data-reorder-to="${index - 1}" aria-label="Move page ${page} up" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" data-reorder-move-page="${page}" data-reorder-to="${index + 1}" aria-label="Move page ${page} down" ${index === count - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" data-reorder-move-page="${page}" data-reorder-to="${count - 1}" aria-label="Move page ${page} to end" ${index === count - 1 ? 'disabled' : ''}>⇥</button>
    </div>
  </article>`;
}

function renderWorkspace(state) {
  const validation = validatePageOrder(state.order, state.file.pageCount);
  const message = state.error || reorderValidationMessage(validation.code);
  const original = isOriginalOrder(state.order, state.file.pageCount);
  return `<section class="split-file-card"><span aria-hidden="true">PDF</span><div><strong>${escapeHtml(state.file.name)}</strong><small>${formatSize(state.file.size)} · ${state.file.pageCount} page${state.file.pageCount === 1 ? '' : 's'}</small></div><button class="mini-button mini-button--danger" type="button" data-reorder-remove-file aria-label="Remove ${escapeAttribute(state.file.name)}">×</button></section>
    <section class="reorder-toolbar" aria-label="Page ordering controls"><div><strong>Page order</strong><small>Drag a handle or use the move buttons</small></div><button class="button button--quiet" type="button" data-reorder-reset ${original ? 'disabled' : ''}>Reset order</button></section>
    <div class="inline-alert" role="alert" data-reorder-validation ${message ? '' : 'hidden'}><strong>Check the page order</strong><span>${message ? escapeHtml(message) : ''}</span></div>
    <section class="split-pages reorder-pages" aria-labelledby="reorder-pages-title"><div class="split-pages__heading"><h2 id="reorder-pages-title">Pages</h2><span>${state.file.pageCount} total</span></div>
      <p class="reorder-hint">Touch and hold the grip, then drag to a new position. Every original page stays in the output.</p>
      <div class="reorder-page-grid" data-reorder-grid>${state.order.map((page, index) => pageCard(state, page, index)).join('')}</div>
    </section>
    <div class="split-sticky-action"><button class="button button--primary button--wide" type="button" data-reorder-run ${validation.valid ? '' : 'disabled'}>Reorder Pages</button><small>${original ? 'The original order will be copied to a new PDF' : 'A new PDF will use the order shown above'}</small></div>`;
}

export function renderReorderResult(result) {
  return `${renderHeader({ title: 'Reorder complete', eyebrow: 'SAVED ON DEVICE', backHref: '#/files' })}
    <section class="result-page"><div class="result-check" aria-hidden="true">✓</div><p class="result-page__eyebrow">YOUR FILE IS READY</p><h2>Your reordered PDF is ready</h2><p class="result-page__body">All ${result.pageCount} pages were saved in the order you chose. Your original document was not changed.</p>
      <div class="result-file"><span aria-hidden="true">PDF</span><div><strong>${escapeHtml(result.name)}</strong><small>${formatSize(result.size)} · ${result.pageCount} pages</small></div></div>
      <div class="result-actions"><button class="button button--primary" type="button" data-result-open>Open</button><button class="button button--outline" type="button" data-result-share>Share</button></div>
      <button class="button button--quiet button--wide" type="button" data-reorder-another>Reorder another</button><a class="done-link" href="#/files">Done</a>
    </section>`;
}

export function renderReorderScreen(state) {
  if (state.result) return renderReorderResult(state.result);
  return `${renderHeader({ title: 'Reorder Pages', eyebrow: 'ORGANIZE PDF', backHref: '#/tools' })}
    <section class="merge-intro"><h2>Put every page in the right place</h2><p>Drag pages into any order, then save a new PDF. Processing stays on this device.</p></section>
    ${state.file ? renderWorkspace(state) : `${state.error ? `<div class="inline-alert" role="alert"><strong>Couldn’t continue</strong><span>${escapeHtml(state.error)}</span></div>` : ''}${renderEmpty(state)}`}`;
}
