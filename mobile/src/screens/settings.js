import { renderHeader } from '../components/app-header.js';
import { icon } from '../components/icons.js';
import { loadTheme } from '../storage/preferences.js';

const preferenceLabel = (value) => value[0].toUpperCase() + value.slice(1);

export function renderSettings() {
  const theme = loadTheme();
  const themeOptions = ['system', 'light', 'dark'];
  return `${renderHeader({ title: 'Settings', eyebrow: 'YOUR PREFERENCES' })}
    <section class="settings-section" aria-labelledby="appearance-title"><h2 id="appearance-title">Appearance</h2>
      <div class="settings-card"><div class="settings-row settings-row--stack"><div><strong>Theme</strong><span data-theme-label>${preferenceLabel(theme)}</span></div>
        <div class="segmented" role="radiogroup" aria-label="Theme preference">${themeOptions.map((option) => `<label><input type="radio" name="theme" value="${option}" ${theme === option ? 'checked' : ''} /><span>${preferenceLabel(option)}</span></label>`).join('')}</div>
      </div></div>
    </section>
    <section class="settings-section" aria-labelledby="support-title"><h2 id="support-title">YOYOPDF</h2>
      <div class="settings-card settings-links">
        ${[['privacy', 'Privacy', 'How YOYOPDF handles documents'], ['about', 'About', 'App purpose and current status'], ['help', 'Help', 'Guidance for using the app'], ['support', 'Support', 'Ways to get assistance']].map(([href, title, copy]) => `<a href="#/settings/${href}"><span><strong>${title}</strong><small>${copy}</small></span>${icon('arrow')}</a>`).join('')}
      </div>
    </section>
    <p class="settings-footer">YOYOPDF foundation · Version 0.1.0</p>`;
}
