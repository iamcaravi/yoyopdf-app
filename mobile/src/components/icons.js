const paths = {
  home: '<path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  tools: '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8m-7.2 7.2-2.8 2.8"/><circle cx="12" cy="12" r="3"/>',
  files: '<path d="M4 4h6l2 3h8v13H4z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  merge: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M3 12h8m-4-4 4 4-4 4"/>',
  split: '<path d="M8 3h9v18H8zM3 12h10m-4-4 4 4-4 4"/>',
  compress: '<path d="M7 3h10v18H7zM3 8h7M7 5l3 3-3 3m14 5h-7m3-3-3 3 3 3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 4 3-3 5 4"/>',
  arrow: '<path d="m9 18 6-6-6-6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  shield: '<path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
};

export function icon(name, label = '') {
  const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="icon" ${aria} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.tools}</svg>`;
}
