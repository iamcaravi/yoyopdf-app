export const ROOT_ROUTES = Object.freeze(['home', 'tools', 'files', 'settings']);

export function parseRoute(hash = '') {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const root = ROOT_ROUTES.includes(parts[0]) ? parts[0] : 'home';
  return { root, detail: parts[1] || null };
}

export function routeHref(root, detail) {
  return `#/${root}${detail ? `/${detail}` : ''}`;
}
