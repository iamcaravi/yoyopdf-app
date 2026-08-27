import { icon } from './icons.js';

export function renderToolCard(tool, compact = false) {
  return `<button class="tool-card ${compact ? 'tool-card--compact' : ''}" type="button" data-tool-name="${tool.name.toLowerCase()}" data-planned-action="${tool.name}" aria-label="${tool.name}, planned">
    <span class="tool-card__icon tool-card__icon--${tool.tone}">${icon(tool.icon)}</span>
    <span class="tool-card__name">${tool.name}</span>
    ${compact ? '' : '<span class="status-chip">Planned</span>'}
  </button>`;
}
