import { loadTheme, saveTheme } from '../storage/preferences.js';

const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');

function applyTheme(preference) {
  const resolved = preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#151414' : '#f7f5f2');
}

export function initTheme() {
  applyTheme(loadTheme());
  media?.addEventListener?.('change', () => {
    if (document.documentElement.dataset.themePreference === 'system') applyTheme('system');
  });
}

export function setTheme(preference) {
  applyTheme(saveTheme(preference));
}
