import { escapeAttribute, escapeHtml } from '../app/escape.js';
import { renderHeader } from '../components/app-header.js';
import { buildSplitPlan } from '../tools/split/state.js';
import { splitValidationMessage } from '../tools/split/errors.js';

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderEmptyState(state) {
  const disabled = state.picking ? 'disabled' : '';
  return `<section class="split-empty" aria-labelledby="split-empty-title">
    <button class="split-upload-zone" type="button" data-split-pick aria-label="Choose a PDF to split" ${disabled}>
      <span class="split-upload-zone__plus" aria-hidden="true">＋</span>
      <span><strong id="split-empty-title">Choose one PDF</strong><small>Tap to browse Android files and document providers</small></span>
    </button>
    <button class="button button--primary" type="button" data-split-pick ${disabled}>${state.picking ? 'Opening…' : 'Choose PDF'}</button>
  </section>`;
}

function renderRangeMode(state) {
  if (state.rangeKind === 'fixed') {
    const plan = buildSplitPlan(state);
    return `<div class="split-options">
      <label class="split-field"><span>Split every</span><span class="split-field__inline"><input type="number" min="1" max="${state.file.pageCount}" inputmode="numeric" value="${state.everyN}" data-split-every aria-label="Pages per output file"><small>pages per file</small></span></label>
      ${plan.valid ? `<p class="split-hint">This will create ${plan.groups.length} PDF${plan.groups.length === 1 ? '' : 's'}.</p>` : ''}
    </div>`;
  }
  return `<div class="split-options">
    <div class="split-ranges">${state.ranges.map((range, index) => `<div class="split-range">
      <div class="split-range__heading"><strong>Range ${index + 1}</strong>${state.ranges.length > 1 ? `<button class="split-text-button" type="button" data-split-remove-range="${range.id}" aria-label="Remove range ${index + 1}">Remove</button>` : ''}</div>
      <div class="split-range__fields">
        <label><span>From</span><input type="number" min="1" max="${state.file.pageCount}" inputmode="numeric" value="${range.from}" data-split-range-from="${range.id}"></label>
        <label><span>To</span><input type="number" min="1" max="${state.file.pageCount}" inputmode="numeric" value="${range.to}" data-split-range-to="${range.id}"></label>
      </div>
    </div>`).join('')}</div>
    <button class="button button--quiet split-add-range" type="button" data-split-add-range>+ Add range</button>
  </div>`;
}

function renderPagesMode(state) {
  const count = state.selectedPages.length;
  return `<div class="split-options">
    <div class="split-selection-tools"><span>${count} selected</span><span><button type="button" data-split-select-all>Select all</button><button type="button" data-split-clear-pages ${count ? '' : 'disabled'}>Clear</button></span></div>
    <fieldset class="split-output-choice"><legend>Create selected pages as</legend>
      <label><input type="radio" name="split-page-output" value="combined" data-split-page-output ${state.pageOutput === 'combined' ? 'checked' : ''}> One PDF</label>
      <label><input type="radio" name="split-page-output" value="separate" data-split-page-output ${state.pageOutput === 'separate' ? 'checked' : ''}> Separate PDFs</label>
    </fieldset>
  </div>`;
}

function renderPageGrid(state) {
  const selected = new Set(state.selectedPages);
  return `<section class="split-pages" aria-labelledby="split-pages-title"><div class="split-pages__heading"><h2 id="split-pages-title">Pages</h2><span>${state.file.pageCount} total</span></div>
    <div class="split-page-grid">${Array.from({ length: state.file.pageCount }, (_, index) => {
      const page = index + 1;
      const isSelected = selected.has(page);
      const thumbnail = state.thumbnails?.[page];
      return `<button class="split-page ${isSelected ? 'is-selected' : ''}" type="button" data-split-page="${page}" aria-label="Page ${page}" aria-pressed="${isSelected}" ${state.mode === 'pages' ? '' : 'disabled'}><span class="split-page__preview" aria-hidden="true"><img data-split-thumbnail="${page}" ${thumbnail ? `src="${escapeAttribute(thumbnail)}"` : ''} alt=""><span data-thumbnail-placeholder ${thumbnail ? 'hidden' : ''}>PDF</span><strong data-thumbnail-placeholder ${thumbnail ? 'hidden' : ''}>${page}</strong></span><span>Page ${page}</span></button>`;
    }).join('')}</div>
  </section>`;
}

function renderWorkspace(state) {
  const plan = buildSplitPlan(state);
  const message = state.error || splitValidationMessage(plan.code);
  return `<section class="split-file-card"><span aria-hidden="true">PDF</span><div><strong>${escapeHtml(state.file.name)}</strong><small>${formatSize(state.file.size)} · ${state.file.pageCount} page${state.file.pageCount === 1 ? '' : 's'}</small></div><button class="mini-button mini-button--danger" type="button" data-split-remove-file aria-label="Remove ${escapeAttribute(state.file.name)}">×</button></section>
    <div class="split-tabs" role="tablist" aria-label="Split method">
      <button type="button" role="tab" data-split-mode="range" aria-selected="${state.mode === 'range'}" class="${state.mode === 'range' ? 'is-active' : ''}">Range</button>
      <button type="button" role="tab" data-split-mode="pages" aria-selected="${state.mode === 'pages'}" class="${state.mode === 'pages' ? 'is-active' : ''}">Pages</button>
    </div>
    ${state.mode === 'range' ? `<div class="split-segments" role="group" aria-label="Range type"><button type="button" data-split-range-kind="custom" aria-pressed="${state.rangeKind === 'custom'}" class="${state.rangeKind === 'custom' ? 'is-active' : ''}">Custom ranges</button><button type="button" data-split-range-kind="fixed" aria-pressed="${state.rangeKind === 'fixed'}" class="${state.rangeKind === 'fixed' ? 'is-active' : ''}">Every N pages</button></div>${renderRangeMode(state)}` : renderPagesMode(state)}
    <div class="inline-alert" role="alert" data-split-validation ${message ? '' : 'hidden'}><strong>Check your split settings</strong><span>${message ? escapeHtml(message) : ''}</span></div>
    ${renderPageGrid(state)}
    <div class="split-sticky-action"><button class="button button--primary button--wide" type="button" data-split-run ${plan.valid ? '' : 'disabled'}>Split PDF</button><small>${plan.valid ? `${plan.groups.length} output ${plan.groups.length === 1 ? 'file' : 'files'} · ${plan.groups.length === 1 ? 'PDF' : 'ZIP'} result` : 'Choose valid pages to continue'}</small></div>`;
}

export function renderSplitResult(result) {
  const isZip = result.mimeType === 'application/zip';
  return `${renderHeader({ title: 'Split complete', eyebrow: 'SAVED ON DEVICE', backHref: '#/files' })}
    <section class="result-page"><div class="result-check" aria-hidden="true">✓</div><p class="result-page__eyebrow">YOUR FILE IS READY</p><h2>${isZip ? 'Your PDFs are bundled' : 'Your PDF is ready'}</h2><p class="result-page__body">${result.outputCount} PDF${result.outputCount === 1 ? '' : 's'} created locally. Your original document was not changed.</p>
      <div class="result-file"><span aria-hidden="true">${isZip ? 'ZIP' : 'PDF'}</span><div><strong>${escapeHtml(result.name)}</strong><small>${formatSize(result.size)} · ${result.outputCount} output file${result.outputCount === 1 ? '' : 's'} · ${result.pageCount} pages</small></div></div>
      <div class="result-actions"><button class="button button--primary" type="button" data-result-open>Open</button><button class="button button--outline" type="button" data-result-share>Share</button></div>
      <button class="button button--quiet button--wide" type="button" data-split-another>Split another</button><a class="done-link" href="#/files">Done</a>
    </section>`;
}

export function renderSplitScreen(state) {
  if (state.result) return renderSplitResult(state.result);
  return `${renderHeader({ title: 'Split PDF', eyebrow: 'ORGANIZE PDF', backHref: '#/tools' })}
    <section class="merge-intro"><h2>Turn one PDF into exactly what you need</h2><p>Create custom ranges, split every few pages, or extract selected pages. Processing stays on this device.</p></section>
    ${state.file ? renderWorkspace(state) : `${state.error ? `<div class="inline-alert" role="alert"><strong>Couldn’t continue</strong><span>${escapeHtml(state.error)}</span></div>` : ''}${renderEmptyState(state)}`}`;
}
