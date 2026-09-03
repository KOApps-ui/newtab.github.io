/**
 * AuraTab Başkent - Ayarlar & Kişiselleştirme Yöneticisi (Settings)
 */

import { Utils } from './utils.js';

export const THEMES = [
  { id: 'ankaragucu', name: '💛💙 Ankaragücü 1910', colors: ['#002D62', '#FFCC00', '#020817'] },
  { id: 'gecekondu', name: '🖤 Gecekondu Karanlığı', colors: ['#0E121B', '#F59E0B', '#07090E'] },
  { id: 'cyberpunk', name: '💜 Cyberpunk Neon', colors: ['#15062C', '#00F0FF', '#FF007F'] },
  { id: 'aurora', name: '💚 Aurora Cam Efekti', colors: ['#062824', '#10B981', '#031412'] },
  { id: 'oled', name: '⬛ Minimalist OLED', colors: ['#000000', '#FFFFFF', '#18181B'] },
  { id: 'light', name: '☀️ Aydınlık Mod', colors: ['#F1F5F9', '#002D62', '#FFFFFF'] }
];

export const WALLPAPERS = [
  { name: 'Koyu Degrade (Varsayılan)', url: '' },
  { name: 'Ankara Anıtkabir & Gece', url: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1920&q=80' },
  { name: 'Sarı-Lacivert Işıklar', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80' },
  { name: 'Siber Şehir & Neon', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80' },
  { name: 'Gece Dağ & Yıldızlar', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80' }
];

export class SettingsManager {
  constructor(storage, rssManager, shortcutsManager) {
    this.storage = storage;
    this.rssManager = rssManager;
    this.shortcutsManager = shortcutsManager;
    this.settings = null;
  }

  async init() {
    this.settings = await this.storage.getSettings();
    this.applyTheme(this.settings.theme || 'ankaragucu');
    this.applyWallpaper(this.settings.wallpaper);
    this.applyZoom(this.settings.zoomLevel || 1.25);

    this.renderThemeOptions();
    this.renderWallpaperPresets();
    this.bindEvents();
  }

  applyZoom(zoomValue) {
    const zoom = zoomValue || this.settings.zoomLevel || 1.25;
    const container = document.querySelector('.app-container');
    if (container) {
      container.style.zoom = zoom;
    }
    document.documentElement.style.setProperty('--app-zoom', zoom);
    this.settings.zoomLevel = parseFloat(zoom);

    document.querySelectorAll('#zoomPresetList .preset-chip-btn').forEach(btn => {
      const z = parseFloat(btn.getAttribute('data-zoom'));
      if (Math.abs(z - parseFloat(zoom)) < 0.02) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  applyTheme(themeId) {
    document.body.setAttribute('data-theme', themeId);
    this.settings.theme = themeId;
  }

  applyWallpaper(wpConfig) {
    const bgLayer = document.getElementById('backgroundLayer');
    if (!bgLayer) return;

    if (wpConfig && wpConfig.url) {
      bgLayer.style.backgroundImage = `url('${wpConfig.url}')`;
      bgLayer.style.opacity = wpConfig.opacity !== undefined ? wpConfig.opacity : '0.4';
      bgLayer.style.filter = `blur(${wpConfig.blur !== undefined ? wpConfig.blur : 6}px)`;
    } else {
      bgLayer.style.backgroundImage = 'none';
    }
  }

  renderThemeOptions() {
    const grid = document.getElementById('themeOptionsGrid');
    if (!grid) return;

    grid.innerHTML = THEMES.map(t => `
      <div class="theme-card-option ${t.id === this.settings.theme ? 'active' : ''}" data-theme-id="${t.id}">
        <div class="theme-preview-dots">
          ${t.colors.map(c => `<span class="theme-dot" style="background:${c};"></span>`).join('')}
        </div>
        <span class="theme-card-name">${t.name}</span>
      </div>
    `).join('');

    grid.querySelectorAll('[data-theme-id]').forEach(card => {
      card.addEventListener('click', async () => {
        const themeId = card.getAttribute('data-theme-id');
        this.applyTheme(themeId);
        await this.storage.saveSettings(this.settings);
        this.renderThemeOptions();
        Utils.showToast(`Tema değiştirildi: ${themeId}`, 'info');
      });
    });
  }

  renderWallpaperPresets() {
    const container = document.getElementById('wallpaperPresets');
    if (!container) return;

    container.innerHTML = WALLPAPERS.map(wp => `
      <button type="button" class="preset-chip-btn" data-wp-url="${wp.url}">
        <span>${wp.name}</span>
      </button>
    `).join('');

    container.querySelectorAll('[data-wp-url]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.getAttribute('data-wp-url');
        const urlInput = document.getElementById('customWallpaperUrl');
        if (urlInput) urlInput.value = url;

        this.settings.wallpaper.url = url;
        this.applyWallpaper(this.settings.wallpaper);
        await this.storage.saveSettings(this.settings);
        Utils.showToast('Duvar kağıdı uygulandı!', 'success');
      });
    });
  }

  renderRssManagerList() {
    const listContainer = document.getElementById('settingsRssList');
    if (!listContainer) return;

    const feeds = this.rssManager.feeds;
    if (feeds.length === 0) {
      listContainer.innerHTML = '<div style="color:var(--text-muted);padding:10px;">Kayıtlı RSS kaynağı bulunmuyor.</div>';
      return;
    }

    listContainer.innerHTML = feeds.map(feed => `
      <div class="rss-manage-item" data-feed-id="${feed.id}">
        <div class="rss-item-info">
          <span class="rss-item-title">${Utils.escapeHTML(feed.title)}</span>
          <div class="rss-item-meta">
            <span class="rss-item-category">📁 ${Utils.escapeHTML(feed.category)}</span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:250px;">${Utils.escapeHTML(feed.url)}</span>
          </div>
        </div>
        <div class="rss-item-actions">
          <input type="checkbox" ${feed.enabled !== false ? 'checked' : ''} class="todo-checkbox" data-feed-toggle="${feed.id}" title="Aktif/Pasif">
          <button class="widget-action-btn" data-feed-delete="${feed.id}" title="Kaynağı Sil" style="color:var(--color-danger);">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    // Toggle feed
    listContainer.querySelectorAll('[data-feed-toggle]').forEach(box => {
      box.addEventListener('change', () => {
        const id = box.getAttribute('data-feed-toggle');
        this.rssManager.toggleFeed(id, box.checked);
      });
    });

    // Delete feed
    listContainer.querySelectorAll('[data-feed-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-feed-delete');
        this.rssManager.removeFeed(id);
        this.renderRssManagerList();
      });
    });
  }

  bindEvents() {
    // Open Settings Modal
    const openBtn = document.getElementById('openSettingsBtn');
    const modal = document.getElementById('settingsModal');
    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        this.renderRssManagerList();
        modal.classList.add('active');
      });
    }

    // Settings Tabs
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-target-tab');
        
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');

        if (targetTab === 'tabRssManage') {
          this.renderRssManagerList();
        }
      });
    });

    // Wallpaper Blur & Opacity Sliders
    const blurSlider = document.getElementById('wallpaperBlurSlider');
    const opacitySlider = document.getElementById('wallpaperOpacitySlider');
    const customUrlInput = document.getElementById('customWallpaperUrl');

    if (blurSlider) {
      blurSlider.value = this.settings.wallpaper.blur !== undefined ? this.settings.wallpaper.blur : 6;
      blurSlider.addEventListener('input', (e) => {
        this.settings.wallpaper.blur = parseInt(e.target.value, 10);
        this.applyWallpaper(this.settings.wallpaper);
        this.storage.saveSettings(this.settings);
      });
    }

    if (opacitySlider) {
      opacitySlider.value = (this.settings.wallpaper.opacity || 0.4) * 100;
      opacitySlider.addEventListener('input', (e) => {
        this.settings.wallpaper.opacity = parseFloat(e.target.value) / 100;
        this.applyWallpaper(this.settings.wallpaper);
        this.storage.saveSettings(this.settings);
      });
    }

    if (customUrlInput) {
      customUrlInput.value = this.settings.wallpaper.url || '';
      customUrlInput.addEventListener('change', (e) => {
        this.settings.wallpaper.url = e.target.value.trim();
        this.applyWallpaper(this.settings.wallpaper);
        this.storage.saveSettings(this.settings);
      });
    }

    // Export Backup JSON
    const exportBtn = document.getElementById('exportBackupBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const backupData = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          settings: await this.storage.getSettings(),
          shortcuts: await this.storage.getShortcuts(),
          feeds: await this.storage.getFeeds(),
          todos: await this.storage.getTodos(),
          quickNotes: await this.storage.getQuickNotes()
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AuraTab_Baskent_Yedek_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        Utils.showToast('Yedek dosyası başarıyla indirildi!', 'success');
      });
    }

    // Import Backup JSON
    const importInput = document.getElementById('importBackupInput');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.settings) await this.storage.saveSettings(data.settings);
            if (data.shortcuts) await this.storage.saveShortcuts(data.shortcuts);
            if (data.feeds) await this.storage.saveFeeds(data.feeds);
            if (data.todos) await this.storage.saveTodos(data.todos);
            if (data.quickNotes) await this.storage.saveQuickNotes(data.quickNotes);

            Utils.showToast('Yedek başarıyla geri yüklendi! Yenileniyor...', 'success');
            setTimeout(() => window.location.reload(), 1200);
          } catch (err) {
            Utils.showToast('Geçersiz yedek JSON dosyası!', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Zoom Preset Buttons Click
    document.querySelectorAll('#zoomPresetList .preset-chip-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const zoom = parseFloat(btn.getAttribute('data-zoom'));
        this.applyZoom(zoom);
        await this.storage.saveSettings(this.settings);
        Utils.showToast(`Sayfa boyutu: %${Math.round(zoom * 100)} olarak ayarlandı`, 'success');
      });
    });
  }
}
