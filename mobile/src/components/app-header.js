import { icon } from './icons.js';

export function renderHeader({ title = 'YOYOPDF', eyebrow = '', backHref = '' } = {}) {
  return `<header class="app-header">
    ${backHref ? `<a class="icon-button" href="${backHref}" aria-label="Go back">${icon('back')}</a>` : '<div class="brand-mark" aria-hidden="true"><span>Y</span></div>'}
    <div class="app-header__copy">${eyebrow ? `<span>${eyebrow}</span>` : ''}<h1>${title}</h1></div>
    <div class="privacy-badge" aria-label="Local-first privacy">${icon('shield')}<span>On-device</span></div>
  </header>`;
}
