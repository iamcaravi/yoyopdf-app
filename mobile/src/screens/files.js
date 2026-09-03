import { renderHeader } from '../components/app-header.js';
import { renderFileList } from '../components/file-list.js';

export function renderFiles({ files }) {
  return `${renderHeader({ title: 'Files', eyebrow: 'LOCAL LIBRARY' })}
    <section class="screen-intro"><h2>Your files</h2><p>Saved PDF tool results appear here as secure Android document references.</p></section>
    <section class="section files-panel" aria-labelledby="files-title">
      <div class="section-heading"><div><span>RECENT</span><h2 id="files-title">Recent files</h2></div></div>
      ${renderFileList(files)}
      <p class="placeholder-note">Removing an item clears its recent metadata only. The saved file stays on your device.</p>
    </section>`;
}
