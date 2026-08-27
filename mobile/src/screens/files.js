import { renderHeader } from '../components/app-header.js';
import { renderFileList } from '../components/file-list.js';

export function renderFiles({ files }) {
  return `${renderHeader({ title: 'Files', eyebrow: 'LOCAL LIBRARY' })}
    <section class="screen-intro"><h2>Your PDFs</h2><p>Recent file metadata will appear here after local import is implemented.</p></section>
    <section class="section files-panel" aria-labelledby="files-title">
      <div class="section-heading"><div><span>RECENT</span><h2 id="files-title">Recent files</h2></div></div>
      ${renderFileList(files)}
      <p class="placeholder-note">Open, share, and remove actions are planned for Phase 2.</p>
    </section>`;
}
