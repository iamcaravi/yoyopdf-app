import { renderEmptyState } from './empty-state.js';

export function renderFileList(files, compact = false) {
  if (!files.length) {
    return renderEmptyState({
      icon: '▱',
      title: compact ? 'No recent files' : 'Your files will appear here',
      body: 'Files you choose will stay on this device. Nothing has been imported yet.',
      action: compact ? '' : '<button class="button button--primary" type="button" data-planned-action="Choose a PDF">Choose a PDF</button>',
    });
  }
  return `<ul class="file-list">${files.map((file) => `<li>${file.name}</li>`).join('')}</ul>`;
}
