/**
 * AuraTab Başkent - Ana Başlatıcı (Main App)
 */

import { Utils } from './utils.js';
import { Storage } from './storage.js';
import { SearchManager } from './search.js';
import { RssManager } from './rss.js';
import { AnkaragucuWidget } from './widgets/ankaragucu.js';
import { ShortcutsWidget } from './widgets/shortcuts.js';
import { WeatherWidget } from './widgets/weather.js';
import { FinanceWidget } from './widgets/finance.js';
import { TodosWidget } from './widgets/todos.js';
import { SettingsManager } from './settings.js';

class App {
  constructor() {
    this.storage = Storage;
    this.search = new SearchManager(this.storage);
    this.rss = new RssManager(this.storage);
    this.shortcuts = new ShortcutsWidget(this.storage);
    this.weather = new WeatherWidget(this.storage);
    this.finance = new FinanceWidget(this.storage);
    this.todos = new TodosWidget(this.storage);
    this.settings = new SettingsManager(this.storage, this.rss, this.shortcuts);
    this.ankaragucu = new AnkaragucuWidget();
  }

  async start() {
    // 1. Saat & Tarih başlat
    this.initClockAndGreeting();

    // 2. Modülleri paralel başlat
    await Promise.allSettled([
      this.settings.init(),
      this.search.init(),
      this.shortcuts.init(),
      this.weather.init(),
      this.finance.init(),
      this.todos.init(),
      this.rss.init()
    ]);

    // 3. Ankaragücü özel bileşeni başlat
    this.ankaragucu.init();

    // 4. Genel kısayol dinleyicileri
    this.bindGlobalKeys();

    // 5. Mobil Widget Dock ve Bottom-Sheet yöneticisini başlat
    this.initMobileDock();

    // 6. Service Worker (PWA & Offline) kaydı
    this.registerServiceWorker();

    console.log('🚀 KO|Apps - Açılış Sayfası başarıyla başlatıldı.');
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('📱 [Service Worker] Başarıyla kaydedildi:', reg.scope))
          .catch(err => console.warn('Service Worker kaydı yapılamadı:', err));
      });
    }
  }

  initMobileDock() {
    // Mobil Bottom-Sheet Açıcıları
    const openSheet = (sheetId, sourceWidgetId, targetBodyId) => {
      const sheet = document.getElementById(sheetId);
      const targetBody = document.getElementById(targetBodyId);
      const sourceWidget = document.getElementById(sourceWidgetId);

      if (sheet && targetBody && sourceWidget) {
        // Masaüstü kartının içeriğini mobil sheet içine klonla/aktar
        targetBody.innerHTML = sourceWidget.innerHTML;
        sheet.classList.add('active');

        // Klonlanan butonlardaki özel dinleyicileri bağla
        const agStandingsBtn = targetBody.querySelector('#openAgStandingsBtn');
        if (agStandingsBtn) {
          agStandingsBtn.addEventListener('click', () => {
            sheet.classList.remove('active');
            this.ankaragucu.renderStandingsModal('2lig');
            const stModal = document.getElementById('standingsModal');
            if (stModal) stModal.classList.add('active');
          });
        }
      }
    };

    // 1. Ankaragücü Mobil Rozeti
    const agBtn = document.getElementById('mobileDockAgBtn');
    if (agBtn) {
      agBtn.addEventListener('click', () => openSheet('mobileAgSheet', 'ankaragucuWidget', 'mobileAgSheetBody'));
    }

    // 2. Puan Durumu Rozeti
    const stBtn = document.getElementById('mobileDockStandingsBtn');
    if (stBtn) {
      stBtn.addEventListener('click', () => {
        this.ankaragucu.renderStandingsModal('2lig');
        const stModal = document.getElementById('standingsModal');
        if (stModal) stModal.classList.add('active');
      });
    }

    // 3. Hava Durumu Rozeti
    const weatherBtn = document.getElementById('mobileDockWeatherBtn');
    if (weatherBtn) {
      weatherBtn.addEventListener('click', () => openSheet('mobileWeatherSheet', 'weatherWidget', 'mobileWeatherSheetBody'));
    }

    // 4. Finans / Borsa Rozeti
    const financeBtn = document.getElementById('mobileDockFinanceBtn');
    if (financeBtn) {
      financeBtn.addEventListener('click', () => {
        const sheet = document.getElementById('mobileFinanceSheet');
        const body = document.getElementById('mobileFinanceSheetBody');
        const ticker = document.getElementById('liveTickerStrip');
        if (sheet && body) {
          body.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:12px;">
              <p style="font-size:0.8rem;color:var(--text-muted);">Canlı piyasa ve döviz kurları:</p>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                ${ticker ? ticker.innerHTML : '<span>Yükleniyor...</span>'}
              </div>
            </div>
          `;
          sheet.classList.add('active');
        }
      });
    }

    // 5. Kısayollar Rozeti
    const shortcutsBtn = document.getElementById('mobileDockShortcutsBtn');
    if (shortcutsBtn) {
      shortcutsBtn.addEventListener('click', () => openSheet('mobileShortcutsSheet', 'shortcutsWidgetCard', 'mobileShortcutsSheetBody'));
    }

    // 6. Notlar Rozeti
    const todosBtn = document.getElementById('mobileDockTodosBtn');
    if (todosBtn) {
      todosBtn.addEventListener('click', () => openSheet('mobileTodosSheet', 'todosWidget', 'mobileTodosSheetBody'));
    }

    // Mobil Sheet Backdrop ve Kapatma Butonları
    document.querySelectorAll('.mobile-sheet-backdrop').forEach(sheet => {
      sheet.addEventListener('click', (e) => {
        if (e.target === sheet) {
          sheet.classList.remove('active');
        }
      });

      sheet.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
          sheet.classList.remove('active');
        });
      });
    });
  }

  initClockAndGreeting() {
    const clockEl = document.getElementById('headerClock');
    const dateEl = document.getElementById('headerDate');
    const greetingEl = document.getElementById('headerGreeting');

    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      if (clockEl) {
        clockEl.textContent = `${hours}:${minutes}:${seconds}`;
      }
      if (dateEl) {
        dateEl.textContent = Utils.getFormattedDate();
      }
      if (greetingEl) {
        greetingEl.textContent = `${Utils.getGreeting()}, Başkentli! 💛💙`;
      }
    };

    updateTime();
    setInterval(updateTime, 1000);
  }

  bindGlobalKeys() {
    // Escape tuşuna basıldığında açık tüm modalları ve sheetleri kapat
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active, .mobile-sheet-backdrop.active').forEach(m => {
          m.classList.remove('active');
        });
      }
    });

    // Modal dışına tıklandığında kapat
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  }
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
