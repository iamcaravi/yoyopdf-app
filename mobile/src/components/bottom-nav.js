import { icon } from './icons.js';
import { routeHref } from '../app/routes.js';

const items = [['home', 'Home'], ['tools', 'Tools'], ['files', 'Files'], ['settings', 'Settings']];

export function renderBottomNav(active) {
  return `<nav class="bottom-nav" aria-label="Primary navigation">${items.map(([route, label]) => `
    <a class="bottom-nav__item ${active === route ? 'is-active' : ''}" href="${routeHref(route)}" ${active === route ? 'aria-current="page"' : ''}>
      ${icon(route)}<span>${label}</span>
    </a>`).join('')}</nav>`;
}
