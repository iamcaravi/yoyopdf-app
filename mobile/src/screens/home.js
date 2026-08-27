import { renderHeader } from '../components/app-header.js';
import { renderFileList } from '../components/file-list.js';
import { renderToolCard } from '../components/tool-card.js';
import { icon } from '../components/icons.js';
import { QUICK_TOOLS } from '../tools/catalog.js';

export function renderHome({ files }) {
  return `${renderHeader({ eyebrow: 'PRIVATE PDF TOOLKIT' })}
    <section class="hero">
      <p class="hero__eyebrow">Simple. Private. Yours.</p>
      <h2>What do you want to do<br />with your PDF?</h2>
      <label class="search-field">${icon('search')}<span class="sr-only">Search PDF tools</span>
        <input type="search" placeholder="Search PDF tools" data-tool-search autocomplete="off" />
      </label>
    </section>
    <section class="section" aria-labelledby="quick-title" data-tool-group>
      <div class="section-heading"><div><span>START HERE</span><h2 id="quick-title">Quick actions</h2></div><a href="#/tools">All tools</a></div>
      <div class="quick-grid">${QUICK_TOOLS.map((item) => renderToolCard(item, true)).join('')}</div>
    </section>
    <div class="search-empty" data-search-empty hidden>No matching quick action. <a href="#/tools">Search all tools</a>.</div>
    <section class="section" aria-labelledby="recent-title">
      <div class="section-heading"><div><span>ON THIS DEVICE</span><h2 id="recent-title">Recent files</h2></div><a href="#/files">View all</a></div>
      ${renderFileList(files, true)}
    </section>`;
}
