import { renderHeader } from '../components/app-header.js';
import { renderToolCard } from '../components/tool-card.js';
import { icon } from '../components/icons.js';
import { TOOL_CATEGORIES } from '../tools/catalog.js';

export function renderTools() {
  return `${renderHeader({ title: 'Tools', eyebrow: 'PDF TOOLKIT' })}
    <section class="screen-intro"><h2>Every tool, one place</h2><p>Choose a planned workflow to see its current availability.</p>
      <label class="search-field search-field--flat">${icon('search')}<span class="sr-only">Search all tools</span><input type="search" placeholder="Search all tools" data-tool-search autocomplete="off" /></label>
    </section>
    <div class="tool-browser">${TOOL_CATEGORIES.map((category) => `<section class="tool-group" data-tool-group><h2>${category.name}</h2><div class="tool-list">${category.tools.map((item) => renderToolCard(item)).join('')}</div></section>`).join('')}</div>
    <div class="search-empty" data-search-empty hidden>No tools match your search.</div>`;
}
