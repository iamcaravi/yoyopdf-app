import { renderBottomNav } from '../components/bottom-nav.js';
import { renderHome } from '../screens/home.js';
import { renderTools } from '../screens/tools.js';
import { renderFiles } from '../screens/files.js';
import { renderSettings } from '../screens/settings.js';
import { renderInfoScreen } from '../screens/info.js';
import { getRecentFiles } from '../services/file-service.js';
import { initTheme, setTheme } from '../theme/theme.js';
import { parseRoute } from './routes.js';

const screens = { home: renderHome, tools: renderTools, files: renderFiles, settings: renderSettings };

export function startApp(root) {
  if (!root) throw new Error('App root is missing.');
  initTheme();

  const render = () => {
    const route = parseRoute(location.hash);
    const files = getRecentFiles();
    const screen = route.root === 'settings' && route.detail
      ? renderInfoScreen(route.detail)
      : screens[route.root]({ files });
    root.innerHTML = `<div class="app-shell">
      <main class="app-content" id="main-content" tabindex="-1">${screen}</main>
      ${route.detail ? '' : renderBottomNav(route.root)}
      <div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
    </div>`;
  };

  const showToast = (message) => {
    const toast = root.querySelector('.toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('toast--visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('toast--visible'), 2600);
  };

  root.addEventListener('click', (event) => {
    const plannedAction = event.target.closest('[data-planned-action]');
    if (plannedAction) showToast(`${plannedAction.dataset.plannedAction} is planned for a future phase.`);
  });

  root.addEventListener('input', (event) => {
    if (!event.target.matches('[data-tool-search]')) return;
    const query = event.target.value.trim().toLowerCase();
    root.querySelectorAll('[data-tool-name]').forEach((item) => {
      item.hidden = !item.dataset.toolName.includes(query);
    });
    root.querySelectorAll('[data-tool-group]').forEach((group) => {
      group.hidden = !group.querySelector('[data-tool-name]:not([hidden])');
    });
    const empty = root.querySelector('[data-search-empty]');
    if (empty) empty.hidden = Boolean(root.querySelector('[data-tool-name]:not([hidden])'));
  });

  root.addEventListener('change', (event) => {
    if (event.target.name !== 'theme') return;
    setTheme(event.target.value);
    root.querySelector('[data-theme-label]').textContent = event.target.value[0].toUpperCase() + event.target.value.slice(1);
  });

  window.addEventListener('hashchange', render);
  if (!location.hash) history.replaceState(null, '', '#/home');
  render();
}
