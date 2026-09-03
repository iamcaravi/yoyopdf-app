import { escapeAttribute, escapeHtml } from '../app/escape.js';
import { renderHeader } from '../components/app-header.js';
import { canMerge } from '../tools/merge/state.js';

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderSelectedFile(file, index, total) {
  return `<li class="merge-file">
    <span class="merge-file__order" aria-hidden="true">${index + 1}</span>
    <span class="merge-file__copy"><strong>${escapeHtml(file.name)}</strong><small>${formatSize(file.size)}</small></span>
    <span class="merge-file__actions">
      <button class="mini-button" type="button" data-move-from="${index}" data-move-to="${index - 1}" aria-label="Move ${escapeAttribute(file.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button class="mini-button" type="button" data-move-from="${index}" data-move-to="${index + 1}" aria-label="Move ${escapeAttribute(file.name)} down" ${index === total - 1 ? 'disabled' : ''}>↓</button>
      <button class="mini-button mini-button--danger" type="button" data-remove-pdf="${escapeAttribute(file.id)}" aria-label="Remove ${escapeAttribute(file.name)}">×</button>
    </span>
  </li>`;
}

export function renderMergeScreen(state) {
  if (state.result) return renderMergeResult(state.result);
  const count = state.files.length;
  return `${renderHeader({ title: 'Merge PDF', eyebrow: 'ORGANIZE PDF', backHref: '#/tools' })}
    <section class="merge-intro"><h2>Combine PDFs in your order</h2><p>Select two or more PDFs. They stay on this device from selection through saving.</p></section>
    ${state.error ? `<div class="inline-alert" role="alert"><strong>Couldn’t continue</strong><span>${escapeHtml(state.error)}</span></div>` : ''}
    <section class="merge-panel" aria-labelledby="selected-title">
      <div class="merge-panel__heading"><div><span>${count} ${count === 1 ? 'PDF' : 'PDFs'}</span><h2 id="selected-title">Selected files</h2></div>
        <button class="button button--outline" type="button" data-merge-add ${state.picking ? 'disabled' : ''}>${state.picking ? 'Opening…' : '+ Add PDF'}</button>
      </div>
      ${count ? `<ol class="merge-files">${state.files.map((file, index) => renderSelectedFile(file, index, count)).join('')}</ol>` : `<div class="merge-drop-empty"><button class="merge-drop-empty__add" type="button" data-merge-add aria-label="Choose PDFs" ${state.picking ? 'disabled' : ''}>＋</button><h3>Add your first PDFs</h3><p>Android’s document picker supports Downloads, Documents, device storage, and compatible providers.</p><button class="button button--primary" type="button" data-merge-add ${state.picking ? 'disabled' : ''}>Choose PDFs</button></div>`}
      ${count ? '<button class="clear-button" type="button" data-merge-clear>Clear all</button>' : ''}
    </section>
    <div class="merge-order-note"><strong>Order matters</strong><span>Use the arrow controls to set the exact order of the final PDF.</span></div>
    <div class="merge-sticky-action">
      <button class="button button--primary button--wide" type="button" data-merge-run ${canMerge(state.files) ? '' : 'disabled'}>Merge PDF</button>
      <small>${count < 2 ? `Add ${2 - count} more PDF${count === 1 ? '' : 's'} to continue` : 'Android will ask where to save the result'}</small>
    </div>`;
}

export function renderMergeResult(result) {
  return `${renderHeader({ title: 'Merge complete', eyebrow: 'SAVED ON DEVICE', backHref: '#/files' })}
    <section class="result-page">
      <div class="result-check" aria-hidden="true">✓</div>
      <p class="result-page__eyebrow">YOUR PDF IS READY</p>
      <h2>Everything is in one file</h2>
      <p class="result-page__body">The merged PDF was saved locally. Your original documents were not changed.</p>
      <div class="result-file"><span aria-hidden="true">PDF</span><div><strong>${escapeHtml(result.name)}</strong><small>${formatSize(result.size)}${result.pageCount ? ` · ${result.pageCount} pages` : ''}</small></div></div>
      <div class="result-actions">
        <button class="button button--primary" type="button" data-result-open>Open PDF</button>
        <button class="button button--outline" type="button" data-result-share>Share</button>
      </div>
      <button class="button button--quiet button--wide" type="button" data-merge-another>Merge another</button>
      <a class="done-link" href="#/files">Done</a>
    </section>`;
}
