/**
 * AuraTab Başkent - Hızlı Erişim & Kısayollar Yöneticisi (Speed Dial)
 * Haber7, Hürriyet ve istenilen her sitenin tek tıkla eklenmesini/silinmesini sağlar
 */

import { Utils } from '../utils.js';

export const POPULAR_PRESETS = [
  { title: 'Haber7', url: 'https://www.haber7.com' },
  { title: 'Hürriyet', url: 'https://www.hurriyet.com.tr' },
  { title: 'Sözcü', url: 'https://www.sozcu.com.tr' },
  { title: 'Milliyet', url: 'https://www.milliyet.com.tr' },
  { title: 'Ekşi Sözlük', url: 'https://eksisozluk.com' },
  { title: 'Sahibinden', url: 'https://www.sahibinden.com' },
  { title: 'Ensonhaber', url: 'https://www.ensonhaber.com' },
  { title: 'YouTube', url: 'https://www.youtube.com' },
  { title: 'X (Twitter)', url: 'https://x.com' },
  { title: 'Instagram', url: 'https://www.instagram.com' },
  { title: 'Trendyol', url: 'https://www.trendyol.com' },
  { title: 'GitHub', url: 'https://github.com' }
];

export class ShortcutsWidget {
  constructor(storage, containerId = 'shortcutsGrid') {
    this.storage = storage;
    this.containerId = containerId;
    this.container = null;
    this.shortcuts = [];
  }

  async init() {
    this.container = document.getElementById(this.containerId);
    this.shortcuts = await this.storage.getShortcuts();
    this.render();
    this.renderPresetsInModal();
    this.bindEvents();
  }

  render() {
    if (!this.container) return;

    const tilesHtml = this.shortcuts.map(sc => `
      <div class="shortcut-tile" data-id="${Utils.escapeHTML(sc.id)}">
        <button class="shortcut-delete-btn" data-delete-id="${Utils.escapeHTML(sc.id)}" title="Kısayolu Sil">✕</button>
        <a href="${Utils.escapeHTML(sc.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;">
          <div class="shortcut-icon-wrap">
            <img src="${Utils.escapeHTML(sc.icon || Utils.getFaviconUrl(sc.url, 64))}" 
                 class="shortcut-icon" 
                 alt="${Utils.escapeHTML(sc.title)}"
                 onerror="this.onerror=null; this.src='https://www.google.com/s2/favicons?domain=${encodeURIComponent(Utils.getDomain(sc.url))}&sz=64';">
          </div>
          <span class="shortcut-title" title="${Utils.escapeHTML(sc.title)}">${Utils.escapeHTML(sc.title)}</span>
        </a>
      </div>
    `).join('');

    const addTileHtml = `
      <div class="shortcut-add-tile" id="openAddShortcutModalBtn" title="Yeni Kısayol Ekle (Haber7, Hürriyet vb.)">
        <div class="shortcut-add-icon">＋</div>
        <span class="shortcut-title" style="color:var(--color-primary);font-weight:700;">Kısayol Ekle</span>
      </div>
    `;

    this.container.innerHTML = tilesHtml + addTileHtml;

    // Silme butonları olayları
    this.container.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-delete-id');
        this.removeShortcut(id);
      });
    });

    // Yeni Kısayol Ekle butonu
    const addBtn = document.getElementById('openAddShortcutModalBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const modal = document.getElementById('addShortcutModal');
        if (modal) modal.classList.add('active');
      });
    }
  }

  renderPresetsInModal() {
    const presetContainer = document.getElementById('shortcutPresetsList');
    if (!presetContainer) return;

    presetContainer.innerHTML = POPULAR_PRESETS.map(preset => `
      <button type="button" class="preset-chip-btn" data-preset-title="${Utils.escapeHTML(preset.title)}" data-preset-url="${Utils.escapeHTML(preset.url)}">
        <img src="${Utils.getFaviconUrl(preset.url, 32)}" alt="">
        <span>${Utils.escapeHTML(preset.title)}</span>
      </button>
    `).join('');

    presetContainer.querySelectorAll('.preset-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const titleInput = document.getElementById('shortcutTitleInput');
        const urlInput = document.getElementById('shortcutUrlInput');
        if (titleInput && urlInput) {
          titleInput.value = btn.getAttribute('data-preset-title');
          urlInput.value = btn.getAttribute('data-preset-url');
          // Canlı favicon önizlemesini tetikle
          const previewImg = document.getElementById('shortcutFaviconPreview');
          if (previewImg) {
            previewImg.src = Utils.getFaviconUrl(urlInput.value, 64);
            previewImg.style.display = 'block';
          }
        }
      });
    });
  }

  async addShortcut(title, url, customIcon = null) {
    if (!url) throw new Error('Site adresi boş olamaz');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const domain = Utils.getDomain(url);
    const resolvedTitle = title || domain;
    const resolvedIcon = customIcon || Utils.getFaviconUrl(url, 64);

    const newShortcut = {
      id: 'sc_' + Date.now(),
      title: resolvedTitle,
      url: url,
      icon: resolvedIcon
    };

    this.shortcuts.push(newShortcut);
    await this.storage.saveShortcuts(this.shortcuts);
    this.render();
    Utils.showToast(`"${resolvedTitle}" kısayolu eklendi!`, 'success');
  }

  async removeShortcut(id) {
    const item = this.shortcuts.find(s => s.id === id);
    this.shortcuts = this.shortcuts.filter(s => s.id !== id);
    await this.storage.saveShortcuts(this.shortcuts);
    this.render();
    if (item) {
      Utils.showToast(`"${item.title}" kısayolu silindi.`, 'info');
    }
  }

  bindEvents() {
    const form = document.getElementById('addShortcutForm');
    const urlInput = document.getElementById('shortcutUrlInput');
    const previewImg = document.getElementById('shortcutFaviconPreview');

    if (urlInput && previewImg) {
      urlInput.addEventListener('input', Utils.debounce(() => {
        const val = urlInput.value.trim();
        if (val.length > 3) {
          previewImg.src = Utils.getFaviconUrl(val, 64);
          previewImg.style.display = 'block';
        }
      }, 300));
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('shortcutTitleInput');
        const submitBtn = form.querySelector('button[type="submit"]');

        if (submitBtn) submitBtn.disabled = true;

        try {
          await this.addShortcut(
            titleInput?.value.trim(),
            urlInput?.value.trim()
          );
          form.reset();
          if (previewImg) previewImg.style.display = 'none';
          document.getElementById('addShortcutModal')?.classList.remove('active');
        } catch (err) {
          Utils.showToast(err.message, 'error');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }
}
