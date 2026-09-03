/**
 * AuraTab Başkent - Depolama Yöneticisi (Storage)
 * Chrome.storage.local ve localStorage arasında sorunsuz köprü kurar.
 */

const DEFAULT_SETTINGS = {
  theme: 'ankaragucu',
  wallpaper: {
    type: 'gradient',
    url: '',
    blur: 6,
    opacity: 0.4
  },
  searchEngine: 'brave',
  weatherCity: {
    name: 'Ankara',
    lat: 39.9334,
    lon: 32.8597
  },
  widgetsVisibility: {
    ankaragucu: true,
    finance: true,
    weather: true,
    shortcuts: true,
    todos: true,
    quotes: true
  },
  zoomLevel: 1.25
};

const DEFAULT_SHORTCUTS = [
  { id: '1', title: 'Haber7', url: 'https://www.haber7.com', icon: 'https://www.google.com/s2/favicons?domain=haber7.com&sz=64' },
  { id: '2', title: 'Hürriyet', url: 'https://www.hurriyet.com.tr', icon: 'https://www.google.com/s2/favicons?domain=hurriyet.com.tr&sz=64' },
  { id: '3', title: 'Ankaragücü', url: 'https://ankaragucu.org.tr', icon: 'icons/ankaragucu-logo.png' },
  { id: '4', title: 'Ekşi Sözlük', url: 'https://eksisozluk.com', icon: 'https://www.google.com/s2/favicons?domain=eksisozluk.com&sz=64' },
  { id: '5', title: 'YouTube', url: 'https://www.youtube.com', icon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64' },
  { id: '6', title: 'GitHub', url: 'https://github.com', icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64' },
  { id: '7', title: 'ChatGPT', url: 'https://chatgpt.com', icon: 'https://www.google.com/s2/favicons?domain=openai.com&sz=64' },
  { id: '8', title: 'Brave Search', url: 'https://search.brave.com', icon: 'https://www.google.com/s2/favicons?domain=brave.com&sz=64' }
];

const DEFAULT_FEEDS = [
  // Gündem
  { id: 'f1', title: 'BBC Türkçe', url: 'https://feeds.bbci.co.uk/turkce/rss.xml', category: 'Gündem', enabled: true },
  { id: 'f2', title: 'NTV Gündem', url: 'https://www.ntv.com.tr/gundem.rss', category: 'Gündem', enabled: true },
  { id: 'f3', title: 'Sözcü Gündem', url: 'https://www.sozcu.com.tr/feeds-son-dakika', category: 'Gündem', enabled: true },
  
  // Teknoloji
  { id: 'f4', title: 'Webrazzi', url: 'https://webrazzi.com/feed/', category: 'Teknoloji', enabled: true },
  { id: 'f5', title: 'ShiftDelete.Net', url: 'https://shiftdelete.net/feed', category: 'Teknoloji', enabled: true },
  { id: 'f6', title: 'Chip Online', url: 'https://www.chip.com.tr/rss', category: 'Teknoloji', enabled: true },
  { id: 'f7', title: 'DonanımHaber', url: 'https://www.donanimhaber.com/rss/tum/', category: 'Teknoloji', enabled: true },

  // Ekonomi
  { id: 'f8', title: 'NTV Para / Ekonomi', url: 'https://www.ntv.com.tr/ntvpara.rss', category: 'Ekonomi', enabled: true },
  { id: 'f9', title: 'Bloomberg HT', url: 'https://www.bloomberght.com/rss', category: 'Ekonomi', enabled: true },

  // Spor
  { id: 'f10', title: 'NTV Spor', url: 'https://www.ntv.com.tr/sporskor.rss', category: 'Spor', enabled: true },
  { id: 'f11', title: 'Sporx', url: 'https://www.sporx.com/rss/', category: 'Spor', enabled: true },

  // Bilim & Dünya
  { id: 'f12', title: 'Evrim Ağacı', url: 'https://evrimagaci.org/rss.xml', category: 'Bilim & Dünya', enabled: true },
  { id: 'f13', title: 'Webtekno', url: 'https://www.webtekno.com/rss.xml', category: 'Bilim & Dünya', enabled: true }
];

export const Storage = {
  isExtension: typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local,

  async get(key, defaultValue = null) {
    return new Promise((resolve) => {
      if (this.isExtension) {
        chrome.storage.local.get([key], (result) => {
          if (result && result[key] !== undefined) {
            resolve(result[key]);
          } else {
            resolve(defaultValue);
          }
        });
      } else {
        try {
          const item = localStorage.getItem(`auratab_${key}`);
          resolve(item !== null ? JSON.parse(item) : defaultValue);
        } catch {
          resolve(defaultValue);
        }
      }
    });
  },

  async set(key, value) {
    return new Promise((resolve) => {
      if (this.isExtension) {
        chrome.storage.local.set({ [key]: value }, () => resolve(true));
      } else {
        try {
          localStorage.setItem(`auratab_${key}`, JSON.stringify(value));
          resolve(true);
        } catch (e) {
          console.error('Storage set error:', e);
          resolve(false);
        }
      }
    });
  },

  async getSettings() {
    const saved = await this.get('settings', DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...saved };
  },

  async saveSettings(settings) {
    return this.set('settings', settings);
  },

  async getShortcuts() {
    return this.get('shortcuts', DEFAULT_SHORTCUTS);
  },

  async saveShortcuts(shortcuts) {
    return this.set('shortcuts', shortcuts);
  },

  async getFeeds() {
    return this.get('feeds', DEFAULT_FEEDS);
  },

  async saveFeeds(feeds) {
    return this.set('feeds', feeds);
  },

  async getTodos() {
    return this.get('todos', [
      { id: '1', text: 'Ankaragücü maç biletini kontrol et', completed: false },
      { id: '2', text: 'Günün teknoloji haberlerini incele', completed: true }
    ]);
  },

  async saveTodos(todos) {
    return this.set('todos', todos);
  },

  async getQuickNotes() {
    return this.get('quick_notes', '📌 Buraya hızlı notlarınızı yazabilirsiniz. Otomatik olarak kaydedilir.');
  },

  async saveQuickNotes(notes) {
    return this.set('quick_notes', notes);
  }
};
