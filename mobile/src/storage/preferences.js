export const THEME_KEY = 'yoyopdf.theme';
const allowedThemes = new Set(['system', 'light', 'dark']);

export function normalizeTheme(value) {
  return allowedThemes.has(value) ? value : 'system';
}

export function loadTheme(storage = globalThis.localStorage) {
  try {
    return normalizeTheme(storage?.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export function saveTheme(value, storage = globalThis.localStorage) {
  const normalized = normalizeTheme(value);
  try {
    storage?.setItem(THEME_KEY, normalized);
  } catch {
    // Keep the session preference when storage is unavailable.
  }
  return normalized;
}
