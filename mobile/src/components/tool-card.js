import { icon } from './icons.js';

export function renderToolCard(tool, compact = false) {
  const tag = tool.status === 'available' ? 'a' : 'button';
  const action = tool.status === 'available' ? `href="${tool.route}"` : `type="button" data-planned-action="${tool.name}"`;
  return `<${tag} class="tool-card ${compact ? 'tool-card--compact' : ''}" ${action} data-tool-name="${tool.name.toLowerCase()}" aria-label="${tool.name}, ${tool.status}">
    <span class="tool-card__icon tool-card__icon--${tool.tone}">${icon(tool.icon)}</span>
    <span class="tool-card__name">${tool.name}</span>
    ${compact ? '' : `<span class="status-chip status-chip--${tool.status}">${tool.status === 'available' ? 'Available' : 'Planned'}</span>`}
  </${tag}>`;
}
