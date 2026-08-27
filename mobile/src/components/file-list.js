import { renderEmptyState } from './empty-state.js';
import { escapeAttribute, escapeHtml } from '../app/escape.js';

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function renderFileList(files, compact = false) {
  if (!files.length) {
    return renderEmptyState({
      icon: '▱',
      title: compact ? 'No recent files' : 'Your files will appear here',
      body: 'Files you choose will stay on this device. Nothing has been imported yet.',
      action: compact ? '' : '<button class="button button--primary" type="button" data-planned-action="Choose a PDF">Choose a PDF</button>',
    });
  }
  return `<ul class="file-list">${files.map((file) => `<li class="recent-file ${file.available ? '' : 'is-unavailable'}">
    <span class="recent-file__icon" aria-hidden="true">PDF</span>
    <span class="recent-file__copy"><strong>${escapeHtml(file.name)}</strong><small>${formatSize(file.size)} · ${file.operation === 'merge' ? 'Merged PDF' : 'PDF'}${file.available ? '' : ' · Unavailable'}</small></span>
    ${compact ? '' : `<span class="recent-file__actions">
      <button class="mini-button" type="button" data-recent-open="${escapeAttribute(file.id)}" aria-label="Open ${escapeAttribute(file.name)}" ${file.available ? '' : 'disabled'}>Open</button>
      <button class="mini-button" type="button" data-recent-share="${escapeAttribute(file.id)}" aria-label="Share ${escapeAttribute(file.name)}" ${file.available ? '' : 'disabled'}>Share</button>
      <button class="mini-button mini-button--danger" type="button" data-recent-remove="${escapeAttribute(file.id)}" aria-label="Remove ${escapeAttribute(file.name)} from recent files">×</button>
    </span>`}
  </li>`).join('')}</ul>`;
}
