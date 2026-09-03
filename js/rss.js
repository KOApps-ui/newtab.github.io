/**
 * AuraTab Başkent - RSS & Haber Akışı Motoru (RSS Manager)
 * XML/Atom ayrıştırıcı, zengin kartlar, kategori filtreleme ve özel feed yönetimi
 */

import { Utils } from './utils.js';

export class RssManager {
  constructor(storage) {
    this.storage = storage;
    this.feeds = [];
    this.articles = [];
    this.activeCategory = 'Tümü';
    this.searchQuery = '';
    this.isLoading = false;

    this.categoriesContainer = null;
    this.newsGrid = null;
    this.searchInput = null;
    this.loadingIndicator = null;
  }

  async init() {
    this.feeds = await this.storage.getFeeds();
    this.categoriesContainer = document.getElementById('feedCategoriesBar');
    this.newsGrid = document.getElementById('newsCardsGrid');
    this.searchInput = document.getElementById('feedSearchInput');

    this.renderCategories();
    this.bindEvents();

    // Cache'den anında yükle, ardından arka planda taze haberleri çek
    const cachedArticles = await this.storage.get('cached_articles', []);
    if (cachedArticles && cachedArticles.length > 0) {
      this.articles = cachedArticles;
      this.renderNews();
    }

    // Taze akışı getir
    this.fetchAllFeeds();
  }

  renderCategories() {
    if (!this.categoriesContainer) return;
    
    // Aktif feedlerin kategorilerini topla
    const cats = new Set(['Tümü', 'Gündem', 'Teknoloji', 'Ekonomi', 'Spor', 'Bilim & Dünya']);
    this.feeds.forEach(f => {
      if (f.category) cats.add(f.category);
    });

    this.categoriesContainer.innerHTML = '';
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `category-tab-btn ${cat === this.activeCategory ? 'active' : ''}`;
      btn.setAttribute('data-category', cat);
      btn.innerHTML = `<span>${Utils.escapeHTML(cat)}</span>`;
      btn.addEventListener('click', () => {
        this.activeCategory = cat;
        this.renderCategories();
        this.renderNews();
      });
      this.categoriesContainer.appendChild(btn);
    });
  }

  async fetchFeedUrl(feed) {
    const directFetch = async () => {
      const resp = await fetch(feed.url, { mode: 'cors', cache: 'no-cache' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.text();
    };

    const proxyFetch = async () => {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error(`Proxy HTTP ${resp.status}`);
      return await resp.text();
    };

    try {
      return await directFetch();
    } catch {
      try {
        return await proxyFetch();
      } catch (err) {
        console.warn(`Feed çekilemedi: ${feed.title} (${feed.url})`, err);
        return null;
      }
    }
  }

  parseXmlFeed(xmlText, feed) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    
    // Parse error kontrolü
    if (doc.querySelector('parsererror')) {
      console.warn('XML Parse Hatası:', feed.title);
      return [];
    }

    const items = [];
    // Standart RSS 2.0 <item> veya Atom 1.0 <entry>
    const itemNodes = doc.querySelectorAll('item, entry');

    itemNodes.forEach(node => {
      const title = node.querySelector('title')?.textContent?.trim() || 'Başlıksız Haber';
      
      // Link bul
      let link = node.querySelector('link')?.textContent?.trim();
      if (!link) {
        link = node.querySelector('link')?.getAttribute('href') || '#';
      }

      // Tarih bul
      const pubDate = node.querySelector('pubDate, published, updated, dc\\:date')?.textContent?.trim() || '';

      // Açıklama bul
      let description = node.querySelector('description, summary, content')?.textContent?.trim() || '';
      
      // Akıllı Görsel Bulucu
      let image = null;

      // 1. Enclosure kontrolü
      const enclosure = node.querySelector('enclosure[type^="image"]');
      if (enclosure && enclosure.getAttribute('url')) {
        image = enclosure.getAttribute('url');
      }

      // 2. Media content/thumbnail kontrolü
      if (!image) {
        const mediaContent = node.querySelector('media\\:content, content, media\\:thumbnail');
        if (mediaContent && mediaContent.getAttribute('url')) {
          image = mediaContent.getAttribute('url');
        }
      }

      // 3. İçerik içindeki ilk <img> etiketini çıkar
      if (!image && description) {
        const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          image = imgMatch[1];
        }
      }

      // Açıklamayı temizle (HTML etiketlerinden arındır)
      const cleanSummary = Utils.stripHTML(description).slice(0, 160) + (description.length > 160 ? '...' : '');

      items.push({
        id: link + '_' + title,
        title,
        link,
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        timeAgoStr: Utils.timeAgo(pubDate),
        summary: cleanSummary,
        fullContent: description,
        image,
        source: feed.title,
        category: feed.category || 'Gündem',
        sourceIcon: Utils.getFaviconUrl(feed.url, 32)
      });
    });

    return items;
  }

  async fetchAllFeeds() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.showLoadingUI(true);

    const activeFeeds = this.feeds.filter(f => f.enabled !== false);
    const feedPromises = activeFeeds.map(async feed => {
      const xml = await this.fetchFeedUrl(feed);
      if (xml) {
        return this.parseXmlFeed(xml, feed);
      }
      return [];
    });

    try {
      const results = await Promise.allSettled(feedPromises);
      let allItems = [];

      results.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          allItems = allItems.concat(res.value);
        }
      });

      // Tarihe göre yeniden eskiye sırala
      allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

      if (allItems.length > 0) {
        this.articles = allItems;
        // İlk 80 haberi cache'e kaydet
        await this.storage.set('cached_articles', allItems.slice(0, 80));
      }

      this.renderNews();
    } catch (err) {
      console.error('RSS Fetch hatası:', err);
    } finally {
      this.isLoading = false;
      this.showLoadingUI(false);
    }
  }

  showLoadingUI(loading) {
    const refreshBtn = document.getElementById('refreshFeedBtn');
    if (refreshBtn) {
      if (loading) {
        refreshBtn.classList.add('spinning');
        refreshBtn.disabled = true;
      } else {
        refreshBtn.classList.remove('spinning');
        refreshBtn.disabled = false;
      }
    }
  }

  renderNews() {
    if (!this.newsGrid) return;

    let filtered = this.articles;

    // Kategori Filtresi
    if (this.activeCategory !== 'Tümü') {
      filtered = filtered.filter(a => a.category.toLowerCase() === this.activeCategory.toLowerCase());
    }

    // Arama Filtresi
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.source.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      this.newsGrid.innerHTML = `
        <div class="feed-empty-state" style="grid-column: 1 / -1;">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1.5" fill="none">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Bu kategoride henüz haber bulunamadı</h3>
          <p>Farklı bir kategori seçebilir veya yeni bir RSS kaynağı ekleyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    this.newsGrid.innerHTML = filtered.slice(0, 48).map(item => `
      <article class="news-card" data-id="${Utils.escapeHTML(item.id)}">
        <div class="news-card-image-wrap">
          ${item.image ? `
            <img src="${Utils.escapeHTML(item.image)}" class="news-card-img" alt="${Utils.escapeHTML(item.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'news-card-fallback-img\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><rect x=\\'2\\' y=\\'2\\' width=\\'20\\' height=\\'20\\' rx=\\'5\\'/><circle cx=\\'12\\' cy=\\'12\\' r=\\'3\\'/></svg></div>'">
          ` : `
            <div class="news-card-fallback-img">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 11a9 9 0 0 1 9 9"></path>
                <path d="M4 4a16 16 0 0 1 16 16"></path>
                <circle cx="5" cy="19" r="1"></circle>
              </svg>
            </div>
          `}
          <span class="news-category-tag">${Utils.escapeHTML(item.category)}</span>
        </div>
        
        <div class="news-card-body">
          <div class="news-meta-row">
            <div class="news-source">
              <img src="${Utils.escapeHTML(item.sourceIcon)}" class="news-source-icon" alt="">
              <span>${Utils.escapeHTML(item.source)}</span>
            </div>
            <span class="news-time-ago">${Utils.timeAgo(item.pubDate)}</span>
          </div>

          <h3 class="news-title" title="${Utils.escapeHTML(item.title)}">
            ${Utils.escapeHTML(item.title)}
          </h3>

          <p class="news-summary">${Utils.escapeHTML(item.summary)}</p>

          <div class="news-card-footer">
            <button class="news-read-btn" data-action="preview" data-link="${Utils.escapeHTML(item.link)}">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>Hızlı Oku</span>
            </button>
            <a href="${Utils.escapeHTML(item.link)}" target="_blank" rel="noopener noreferrer" class="news-direct-link" title="Orijinal Habere Git">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      </article>
    `).join('');

    // Haber tıklama olayları (Hızlı okuma veya doğrudan açma)
    this.newsGrid.querySelectorAll('.news-card').forEach(card => {
      const previewBtn = card.querySelector('[data-action="preview"]');
      const titleLink = card.querySelector('.news-title');
      
      const itemData = filtered.find(a => a.id === card.getAttribute('data-id'));

      if (previewBtn && itemData) {
        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openReaderModal(itemData);
        });
      }

      if (titleLink && itemData) {
        titleLink.addEventListener('click', () => {
          this.openReaderModal(itemData);
        });
      }
    });
  }

  openReaderModal(item) {
    const modal = document.getElementById('readerModal');
    if (!modal) return;

    const imgWrap = document.getElementById('readerImgContainer');
    const titleEl = document.getElementById('readerTitle');
    const metaEl = document.getElementById('readerMeta');
    const contentEl = document.getElementById('readerContent');
    const directBtn = document.getElementById('readerDirectLink');

    if (imgWrap) {
      if (item.image) {
        imgWrap.innerHTML = `<img src="${Utils.escapeHTML(item.image)}" class="reader-hero-img" alt="">`;
      } else {
        imgWrap.innerHTML = '';
      }
    }

    if (titleEl) titleEl.textContent = item.title;
    if (metaEl) {
      metaEl.innerHTML = `
        <span>🏷️ ${Utils.escapeHTML(item.source)}</span>
        <span>📁 ${Utils.escapeHTML(item.category)}</span>
        <span>🕒 ${Utils.timeAgo(item.pubDate)}</span>
      `;
    }
    if (contentEl) {
      contentEl.innerHTML = item.fullContent || `<p>${Utils.escapeHTML(item.summary)}</p>`;
    }
    if (directBtn) {
      directBtn.href = item.link;
    }

    modal.classList.add('active');
  }

  async addCustomFeed(title, url, category) {
    if (!url) throw new Error('RSS adresi boş bırakılamaz');

    // Feed format düzeltme
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Basit canlı test
    const testFeed = { url, title: title || 'Yeni Kaynak' };
    const xml = await this.fetchFeedUrl(testFeed);
    if (!xml) {
      throw new Error('RSS kaynağına ulaşılamadı. Lütfen URL adresini kontrol edin.');
    }

    const newFeed = {
      id: 'custom_' + Date.now(),
      title: title || Utils.getDomain(url),
      url: url,
      category: category || 'Özel',
      enabled: true
    };

    this.feeds.push(newFeed);
    await this.storage.saveFeeds(this.feeds);
    this.renderCategories();
    this.fetchAllFeeds();
    Utils.showToast(`"${newFeed.title}" RSS kaynağı başarıyla eklendi!`, 'success');
  }

  async removeFeed(feedId) {
    this.feeds = this.feeds.filter(f => f.id !== feedId);
    await this.storage.saveFeeds(this.feeds);
    this.renderCategories();
    this.fetchAllFeeds();
    Utils.showToast('RSS kaynağı kaldırıldı.', 'info');
  }

  async toggleFeed(feedId, enabled) {
    const feed = this.feeds.find(f => f.id === feedId);
    if (feed) {
      feed.enabled = enabled;
      await this.storage.saveFeeds(this.feeds);
      this.fetchAllFeeds();
    }
  }

  bindEvents() {
    // Arama filtresi
    if (this.searchInput) {
      this.searchInput.addEventListener('input', Utils.debounce((e) => {
        this.searchQuery = e.target.value.trim();
        this.renderNews();
      }, 200));
    }

    // Yenileme butonu
    const refreshBtn = document.getElementById('refreshFeedBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.fetchAllFeeds();
        Utils.showToast('Haber akışı yenileniyor...', 'info');
      });
    }

    // RSS Ekleme Butonu -> Modal açar
    const addRssBtn = document.getElementById('addRssModalBtn');
    const addRssModal = document.getElementById('addRssModal');
    if (addRssBtn && addRssModal) {
      addRssBtn.addEventListener('click', () => {
        addRssModal.classList.add('active');
      });
    }

    // Modal Kapatma
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) modal.classList.remove('active');
      });
    });

    // RSS Form Ekle
    const addRssForm = document.getElementById('addRssForm');
    if (addRssForm) {
      addRssForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const urlInput = document.getElementById('rssUrlInput');
        const titleInput = document.getElementById('rssTitleInput');
        const catSelect = document.getElementById('rssCategorySelect');

        const submitBtn = addRssForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Doğrulanıyor...';
        }

        try {
          await this.addCustomFeed(
            titleInput.value.trim(),
            urlInput.value.trim(),
            catSelect.value
          );
          addRssForm.reset();
          document.getElementById('addRssModal')?.classList.remove('active');
        } catch (err) {
          Utils.showToast(err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kaynağı Ekle';
          }
        }
      });
    }
  }
}
