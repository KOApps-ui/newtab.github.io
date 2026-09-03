/**
 * AuraTab Başkent - Arama Motoru Yöneticisi (Search)
 */

export const SearchEngines = {
  brave: {
    name: 'Brave',
    url: 'https://search.brave.com/search?q=%s',
    icon: 'icons/favicon.svg',
    shortcut: '!b'
  },
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=%s',
    icon: 'https://www.google.com/favicon.ico',
    shortcut: '!g'
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=%s',
    icon: 'https://duckduckgo.com/favicon.ico',
    shortcut: '!ddg'
  },
  youtube: {
    name: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=%s',
    icon: 'https://www.youtube.com/favicon.ico',
    shortcut: '!yt'
  },
  yandex: {
    name: 'Yandex',
    url: 'https://yandex.com.tr/search/?text=%s',
    icon: 'https://yandex.com.tr/favicon.ico',
    shortcut: '!y'
  },
  github: {
    name: 'GitHub',
    url: 'https://github.com/search?q=%s',
    icon: 'https://github.com/favicon.ico',
    shortcut: '!gh'
  },
  wikipedia: {
    name: 'Vikipedi',
    url: 'https://tr.wikipedia.org/wiki/Special:Search?search=%s',
    icon: 'https://tr.wikipedia.org/favicon.ico',
    shortcut: '!w'
  },
  eksisozluk: {
    name: 'Ekşi Sözlük',
    url: 'https://eksisozluk.com/?q=%s',
    icon: 'https://eksisozluk.com/favicon.ico',
    shortcut: '!e'
  }
};

export class SearchManager {
  constructor(storage) {
    this.storage = storage;
    this.currentEngine = 'brave';
    this.searchInput = null;
    this.engineDropdownBtn = null;
    this.engineDropdownMenu = null;
    this.clearBtn = null;
  }

  async init() {
    const settings = await this.storage.getSettings();
    this.currentEngine = settings.searchEngine || 'brave';

    this.searchInput = document.getElementById('heroSearchInput');
    this.engineDropdownBtn = document.getElementById('engineCurrentBtn');
    this.engineDropdownMenu = document.getElementById('engineDropdownMenu');
    this.clearBtn = document.getElementById('searchClearBtn');

    this.updateCurrentEngineUI();
    this.renderEngineDropdown();
    this.bindEvents();
  }

  updateCurrentEngineUI() {
    const engine = SearchEngines[this.currentEngine] || SearchEngines.brave;
    if (this.engineDropdownBtn) {
      this.engineDropdownBtn.innerHTML = `
        <img src="${engine.icon}" class="engine-current-icon" alt="${engine.name}">
        <span>${engine.name}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      `;
    }

    if (this.searchInput) {
      this.searchInput.placeholder = `${engine.name} ile internette veya kısayollarla ara... (/ tuşuna bas)`;
    }

    // Update active pill
    document.querySelectorAll('.quick-engine-pill').forEach(pill => {
      const eng = pill.getAttribute('data-engine');
      if (eng === this.currentEngine) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  renderEngineDropdown() {
    if (!this.engineDropdownMenu) return;
    this.engineDropdownMenu.innerHTML = '';

    Object.entries(SearchEngines).forEach(([key, engine]) => {
      const btn = document.createElement('button');
      btn.className = `engine-option-btn ${key === this.currentEngine ? 'selected' : ''}`;
      btn.innerHTML = `
        <img src="${engine.icon}" alt="${engine.name}">
        <span>${engine.name}</span>
        <span class="engine-shortcut-badge">${engine.shortcut}</span>
      `;
      btn.addEventListener('click', () => {
        this.selectEngine(key);
        this.engineDropdownMenu.classList.remove('active');
      });
      this.engineDropdownMenu.appendChild(btn);
    });
  }

  async selectEngine(engineKey) {
    if (SearchEngines[engineKey]) {
      this.currentEngine = engineKey;
      this.updateCurrentEngineUI();
      this.renderEngineDropdown();
      const settings = await this.storage.getSettings();
      settings.searchEngine = engineKey;
      await this.storage.saveSettings(settings);
    }
  }

  bindEvents() {
    // Dropdown toggle
    if (this.engineDropdownBtn && this.engineDropdownMenu) {
      this.engineDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.engineDropdownMenu.classList.toggle('active');
      });

      document.addEventListener('click', () => {
        this.engineDropdownMenu.classList.remove('active');
      });
    }

    // Quick engine pill clicks
    document.querySelectorAll('.quick-engine-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const eng = pill.getAttribute('data-engine');
        this.selectEngine(eng);
      });
    });

    // Clear button
    if (this.searchInput && this.clearBtn) {
      this.searchInput.addEventListener('input', () => {
        if (this.searchInput.value.trim().length > 0) {
          this.clearBtn.style.display = 'flex';
        } else {
          this.clearBtn.style.display = 'none';
        }
      });

      this.clearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.clearBtn.style.display = 'none';
        this.searchInput.focus();
      });
    }

    // Form submit / Enter key
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.performSearch();
      });
    }

    // Global keyboard shortcuts (/ and Ctrl+K)
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        if (this.searchInput) {
          this.searchInput.focus();
          this.searchInput.select();
        }
      }
    });
  }

  performSearch() {
    if (!this.searchInput) return;
    let query = this.searchInput.value.trim();
    if (!query) return;

    // Check for search engine shortcut prefix like !g, !yt, !gh, !ddg
    let targetEngineKey = this.currentEngine;
    for (const [key, engine] of Object.entries(SearchEngines)) {
      if (query.startsWith(engine.shortcut + ' ')) {
        targetEngineKey = key;
        query = query.slice(engine.shortcut.length + 1).trim();
        break;
      }
    }

    // Check if query is directly a URL (e.g. haber7.com, https://...)
    if (/^(https?:\/\/|www\.)[^\s]+$/i.test(query)) {
      const url = query.startsWith('http') ? query : 'https://' + query;
      window.location.href = url;
      return;
    }

    const engine = SearchEngines[targetEngineKey] || SearchEngines.brave;
    const searchUrl = engine.url.replace('%s', encodeURIComponent(query));
    window.location.href = searchUrl;
  }
}
