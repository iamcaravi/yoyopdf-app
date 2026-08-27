export function renderEmptyState({ icon = '◇', title, body, action = '' }) {
  return `<div class="empty-state">
    <div class="empty-state__icon" aria-hidden="true">${icon}</div>
    <h3>${title}</h3><p>${body}</p>${action}
  </div>`;
}
