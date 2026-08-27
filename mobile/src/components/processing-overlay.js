import { escapeHtml } from '../app/escape.js';

export function renderProcessingOverlay(state) {
  if (!state) return '';
  const isRunning = state.status === 'processing';
  const isSuccess = state.status === 'success';
  const isFailure = state.status === 'failure';
  const hasProgress = isRunning && Number.isFinite(state.completed) && Number.isFinite(state.total) && state.total > 0;
  const percentage = hasProgress ? Math.round((state.completed / state.total) * 100) : null;
  return `<div class="processing-overlay" role="dialog" aria-modal="true" aria-labelledby="processing-title">
    <div class="processing-card processing-card--${state.status}">
      <div class="processing-mark" aria-hidden="true">${isSuccess ? '✓' : isFailure ? '!' : '<span></span>'}</div>
      <h2 id="processing-title">${escapeHtml(state.title)}</h2>
      <p>${escapeHtml(state.message)}</p>
      ${isRunning ? `<div class="processing-track" role="progressbar" ${hasProgress ? `aria-valuemin="0" aria-valuemax="${state.total}" aria-valuenow="${state.completed}"` : 'aria-label="Processing"'}>
        <span class="${hasProgress ? '' : 'is-indeterminate'}" ${hasProgress ? `style="width:${percentage}%"` : ''}></span>
      </div>` : ''}
      ${hasProgress ? `<small>${state.completed} of ${state.total} PDFs combined</small>` : ''}
      ${isRunning && state.cancellable ? `<button class="button button--quiet" type="button" data-processing-cancel ${state.cancelling ? 'disabled' : ''}>${state.cancelling ? 'Cancelling…' : 'Cancel'}</button>` : ''}
      ${isFailure ? '<button class="button button--primary" type="button" data-processing-close>Back to Merge PDF</button>' : ''}
    </div>
  </div>`;
}
