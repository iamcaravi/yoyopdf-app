import { renderHeader } from '../components/app-header.js';

const pages = {
  privacy: { title: 'Privacy', body: '<h2>Your documents stay yours</h2><p>YOYOPDF is designed for local, on-device document processing wherever possible. This foundation does not upload PDFs, store document bytes, or include analytics.</p><p>Future features must disclose any exception before it is introduced.</p>' },
  about: { title: 'About', body: '<h2>A focused mobile PDF toolkit</h2><p>YOYOPDF is being built as a dedicated Android application with an architecture that can support iOS later.</p><p>This is the Phase 1 foundation. PDF tools are planned but not yet connected.</p>' },
  help: { title: 'Help', body: '<h2>Getting started</h2><p>Browse planned actions from Home or Tools. File import and PDF processing will arrive in later phases, so no document workflow is active yet.</p>' },
  support: { title: 'Support', body: '<h2>Support is coming</h2><p>A verified support channel has not been configured in this foundation. No contact details are invented here.</p>' },
};

export function renderInfoScreen(key) {
  const page = pages[key] || pages.help;
  return `${renderHeader({ title: page.title, backHref: '#/settings' })}<article class="info-page">${page.body}</article>`;
}
