/**
 * AuraTab Başkent - Yardımcı Fonksiyonlar (Utils)
 */

export const Utils = {
  /**
   * HTML karakterlerini zararlı kodlara karşı güvenli hale getirir
   */
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Metin içerisindeki HTML etiketlerini temizler (örneğin RSS summary içinden)
   */
  stripHTML(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },

  /**
   * Türkçe göreceli zaman hesaplar (ör: "5 dk önce", "2 saat önce", "Dün")
   */
  timeAgo(dateInput) {
    if (!dateInput) return 'Yeni';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Yeni';

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Az önce';
    if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return `${mins} dk önce`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours} saat önce`;
    }
    if (diffSec < 172800) {
      return 'Dün';
    }
    const days = Math.floor(diffSec / 86400);
    if (days < 30) {
      return `${days} gün önce`;
    }
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  },

  /**
   * Güncel Türkçe tarih formatı
   */
  getFormattedDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('tr-TR', options);
  },

  /**
   * Saate göre selamlama metni döndürür
   */
  getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Günaydın';
    if (hour >= 11 && hour < 17) return 'İyi Günler';
    if (hour >= 17 && hour < 22) return 'İyi Akşamlar';
    return 'İyi Geceler';
  },

  /**
   * URL'den ana domaini çıkarır
   */
  getDomain(url) {
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  },

  /**
   * Domainden yüksek çözünürlüklü favicon çeker (Google Favicon API)
   */
  getFaviconUrl(url, size = 64) {
    try {
      let domain = this.getDomain(url);
      return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
    } catch {
      return 'icons/favicon.svg';
    }
  },

  /**
   * Toast bildirim gösterir
   */
  showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 6L9 17l-5-5"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${this.escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Fonksiyon debounce
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};
