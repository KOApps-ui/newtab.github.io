/**
 * KO|Apps - MKE Ankaragücü Özel Widget'ı
 * Fikstür, maç geri sayımı, tribün besteleri & kulüp haberleri
 */

import { Utils } from '../utils.js';

const ANKARAGUCU_QUOTES = [
  { text: "1910'dan bugüne Başkentin asil temsilcisi Ankaragücü!", author: "1910 Ruhu" },
  { text: "Sensiz geçen günlerin kazası yok be Ankaragücüm...", author: "Gecekondu Tribünü" },
  { text: "Başkent kolay pes etmez! Sarı-Lacivert sevda hiçbir yere sığmaz.", author: "Başkent Sevdası" },
  { text: "Sarı-Lacivert renklere adadık ömrümüzü, her zaman dimdik Başkentin arkasındayız!", author: "Sarı Lacivert Aşk" },
  { text: "Düşsek de kalkarız, her zaman Başkentin gururuyuz!", author: "Ankaragüçlüler" },
  { text: "Eryaman Stadyumu'nda inletiriz gökleri, şampiyonluk yolunda daima yanındayız!", author: "Gecekondu" }
];

export class AnkaragucuWidget {
  constructor(containerId = 'ankaragucuWidget') {
    this.containerId = containerId;
    this.container = null;
    this.currentQuoteIndex = 0;
    this.countdownTimer = null;
    
    // Gelecek Maç Bilgisi (Nesine 2. Lig Kırmızı Grup • Başkent Derbisi)
    this.nextMatch = {
      opponent: 'Ankara Demirspor',
      opponentShort: 'AD',
      competition: 'Nesine 2. Lig • 1. Hafta',
      stadium: 'Eryaman Stadyumu, Ankara',
      isHome: true,
      matchDate: new Date('2026-09-06T19:00:00')
    };

    // Eğer maç tarihi geçmişse dinamik sonraki hafta maçına ayarla
    if (this.nextMatch.matchDate.getTime() < Date.now()) {
      this.nextMatch.matchDate = new Date(Date.now() + (3 * 24 * 60 * 60 + 4 * 3600) * 1000);
    }

    this.fixtures = [
      { week: '1. Hafta', home: 'MKE Ankaragücü', away: 'Ankara Demirspor', venue: 'Eryaman Stadyumu', date: '6 Eyl 19:00' },
      { week: '2. Hafta', home: '12 Bingöl Spor', away: 'MKE Ankaragücü', venue: 'Bingöl Şehir Stadı', date: '13 Eyl 15:30' },
      { week: '3. Hafta', home: 'MKE Ankaragücü', away: 'Serik Spor', venue: 'Eryaman Stadyumu', date: '20 Eyl 19:00' }
    ];
  }

  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) return;

    this.render();
    this.startCountdown();
    this.bindEvents();
  }

  render() {
    if (!this.container) return;

    const quote = ANKARAGUCU_QUOTES[this.currentQuoteIndex];

    this.container.innerHTML = `
      <div class="ag-banner">
        <img src="icons/ankaragucu-logo.png" class="ag-emblem" alt="MKE Ankaragücü">
        <div class="ag-banner-info">
          <span class="ag-club-name">MKE ANKARAGÜCÜ</span>
          <span class="ag-motto">1910 • Başkentin Gücü</span>
        </div>
        <button type="button" class="ag-standings-pill-btn" id="openAgStandingsBtn" title="Puan Durumu Tablosunu Aç">
          🏆 Puan Tablosu
        </button>
      </div>

      <!-- Gelecek Maç Kutusu (Başkent Derbisi) -->
      <div class="ag-match-box">
        <div class="ag-match-header">
          <span class="ag-match-comp">⚽ ${this.nextMatch.competition}</span>
          <span class="ag-match-venue-badge">${this.nextMatch.isHome ? 'İÇ SAHA' : 'DEPLASMAN'}</span>
        </div>

        <div class="ag-teams-row">
          <div class="ag-team">
            <img src="icons/ankaragucu-logo.png" class="ag-team-logo" alt="Ankaragücü">
            <span class="ag-team-name">Ankaragücü</span>
          </div>

          <div class="ag-vs-badge">
            <span class="ag-vs-text">VS</span>
            <span class="ag-match-time">${this.formatMatchDate(this.nextMatch.matchDate)}</span>
          </div>

          <div class="ag-team">
            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#002B7F,#0055A5);border:1.5px solid #60A5FA;display:flex;align-items:center;justify-content:center;font-weight:900;color:#FFF;font-size:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
              AD
            </div>
            <span class="ag-team-name">${this.nextMatch.opponent}</span>
          </div>
        </div>

        <!-- Geri Sayım -->
        <div class="ag-countdown" id="agCountdownWrap">
          <div class="countdown-unit">
            <span class="countdown-val" id="agDays">00</span>
            <span class="countdown-lbl">GÜN</span>
          </div>
          <div class="countdown-unit">
            <span class="countdown-val" id="agHours">00</span>
            <span class="countdown-lbl">SAAT</span>
          </div>
          <div class="countdown-unit">
            <span class="countdown-val" id="agMins">00</span>
            <span class="countdown-lbl">DK</span>
          </div>
          <div class="countdown-unit">
            <span class="countdown-val" id="agSecs">00</span>
            <span class="countdown-lbl">SN</span>
          </div>
        </div>

        <!-- Fikstür Bilgi Şeridi -->
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;color:var(--text-muted);">
          <span>📍 ${this.nextMatch.stadium}</span>
          <span style="color:var(--color-primary);font-weight:700;">Başkent Derbisi</span>
        </div>
      </div>

      <!-- Tribün Sözü & Beste Kartı -->
      <div class="ag-quote-box" id="agQuoteCard" title="Başka bir söz görmek için tıkla!">
        <p>"${Utils.escapeHTML(quote.text)}"</p>
        <span class="ag-quote-author">— ${Utils.escapeHTML(quote.author)} 🎲</span>
      </div>

      <!-- Hızlı Kulüp Bağlantıları -->
      <div class="ag-quick-links">
        <a href="https://ankaragucu.org.tr" target="_blank" rel="noopener noreferrer" class="ag-link-btn" title="Resmi Web Sitesi">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>Resmi</span>
        </a>
        <a href="https://www.ankaragucustore.com.tr" target="_blank" rel="noopener noreferrer" class="ag-link-btn" title="Ankaragücü Store">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span>Store</span>
        </a>
        <a href="https://www.passo.com.tr" target="_blank" rel="noopener noreferrer" class="ag-link-btn" title="Passo Bilet Al">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <span>Bilet</span>
        </a>
        <button type="button" class="ag-link-btn" id="agStandingsFooterBtn" title="Puan Durumu Tablosunu Aç" style="background:rgba(255,204,0,0.15);color:var(--color-primary);border-color:rgba(255,204,0,0.4);cursor:pointer;">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <span>Puan</span>
        </button>
      </div>
    `;
  }

  formatMatchDate(date) {
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  startCountdown() {
    const update = () => {
      const now = new Date().getTime();
      const distance = this.nextMatch.matchDate.getTime() - now;

      if (distance < 0) {
        const daysEl = document.getElementById('agDays');
        if (daysEl) daysEl.textContent = '00';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((distance % (1000 * 60)) / 1000);

      const dEl = document.getElementById('agDays');
      const hEl = document.getElementById('agHours');
      const mEl = document.getElementById('agMins');
      const sEl = document.getElementById('agSecs');

      if (dEl) dEl.textContent = String(days).padStart(2, '0');
      if (hEl) hEl.textContent = String(hours).padStart(2, '0');
      if (mEl) mEl.textContent = String(mins).padStart(2, '0');
      if (sEl) sEl.textContent = String(secs).padStart(2, '0');
    };

    update();
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(update, 1000);
  }

  bindEvents() {
    const quoteCard = document.getElementById('agQuoteCard');
    if (quoteCard) {
      quoteCard.addEventListener('click', () => {
        this.currentQuoteIndex = (this.currentQuoteIndex + 1) % ANKARAGUCU_QUOTES.length;
        const quote = ANKARAGUCU_QUOTES[this.currentQuoteIndex];
        quoteCard.innerHTML = `
          <p>"${Utils.escapeHTML(quote.text)}"</p>
          <span class="ag-quote-author">— ${Utils.escapeHTML(quote.author)} 🎲</span>
        `;
      });
    }

    // Puan Tablosu Modal Açıcıları
    const openStandings = () => {
      this.renderStandingsModal('2lig');
      const modal = document.getElementById('standingsModal');
      if (modal) modal.classList.add('active');
    };

    const pillBtn = document.getElementById('openAgStandingsBtn');
    const footerBtn = document.getElementById('agStandingsFooterBtn');
    if (pillBtn) pillBtn.addEventListener('click', openStandings);
    if (footerBtn) footerBtn.addEventListener('click', openStandings);

    // Modal içi Lig Tab Değişimi
    document.querySelectorAll('.standings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.standings-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const league = btn.getAttribute('data-league');
        this.renderStandingsModal(league);
      });
    });
  }

  renderStandingsModal(league = '2lig') {
    const tableBody = document.getElementById('standingsTableBody');
    const titleEl = document.getElementById('standingsLeagueTitle');
    const legendEl = document.getElementById('standingsLegend');
    if (!tableBody) return;

    if (league === '2lig') {
      if (titleEl) titleEl.textContent = 'Nesine 2. Lig Kırmızı Grup (2026-2027)';
      if (legendEl) {
        legendEl.innerHTML = `
          <div class="legend-item"><span class="legend-dot" style="background:#10B981;"></span><span>1: Doğrudan 1. Lig'e Yükselme</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#00D2FF;"></span><span>2-6: Play-Off Hattı</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#EF4444;"></span><span>16-18: Düşme Hattı</span></div>
        `;
      }
      const teams = [
        { rank: 1, name: 'MKE Ankaragücü', isAG: true, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['W','W','W','W','W'] },
        { rank: 2, name: 'Ankara Demirspor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['D','W','D','L','W'] },
        { rank: 3, name: '1461 Trabzon FK', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['W','D','W','L','D'] },
        { rank: 4, name: 'Fethiyespor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['W','L','D','W','W'] },
        { rank: 5, name: 'İnegölspor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['D','W','L','W','D'] },
        { rank: 6, name: 'Karacabey Belediye Spor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['W','W','L','D','L'] },
        { rank: 7, name: 'Serik Spor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['L','W','W','D','D'] },
        { rank: 8, name: 'Adana 01 FK', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['D','D','W','L','W'] },
        { rank: 9, name: 'Kahramanmaraş İstiklal Spor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['W','L','D','D','L'] },
        { rank: 10, name: 'Kütahyaspor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['L','W','L','W','D'] },
        { rank: 11, name: 'Kırklarelispor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['D','L','W','D','L'] },
        { rank: 12, name: 'İskenderunspor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['L','D','L','W','W'] },
        { rank: 13, name: 'Beyoğlu Yeni Çarşı', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['W','L','L','D','D'] },
        { rank: 14, name: 'Anagold 24Erzincanspor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['D','L','D','W','L'] },
        { rank: 15, name: 'Sakaryaspor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['L','D','W','L','D'] },
        { rank: 16, name: '52 Orduspor FK', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['L','L','D','L','W'] },
        { rank: 17, name: '12 Bingöl Spor', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['D','L','L','L','D'] },
        { rank: 18, name: 'Bucaspor 1928', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: ['L','L','L','D','L'] }
      ];

      tableBody.innerHTML = teams.map(t => `
        <tr class="standings-row ${t.isAG ? 'standings-row-ag' : ''}">
          <td class="standings-rank">
            <span class="rank-badge ${t.rank === 1 ? 'rank-direct' : t.rank <= 6 ? 'rank-playoff' : t.rank >= 16 ? 'rank-relegation' : ''}">
              ${t.rank}
            </span>
          </td>
          <td class="standings-team-cell">
            ${t.isAG ? '<img src="icons/ankaragucu-logo.png" class="standings-team-mini-logo" alt="">' : ''}
            <span class="standings-team-name ${t.isAG ? 'ag-team-highlight' : ''}">${Utils.escapeHTML(t.name)} ${t.isAG ? '💛💙' : ''}</span>
          </td>
          <td class="standings-col-num">${t.played}</td>
          <td class="standings-col-num">${t.w}</td>
          <td class="standings-col-num">${t.d}</td>
          <td class="standings-col-num">${t.l}</td>
          <td class="standings-col-num">${t.gf}</td>
          <td class="standings-col-num">${t.ga}</td>
          <td class="standings-col-num">${t.gd > 0 ? '+' + t.gd : t.gd}</td>
          <td class="standings-col-pts">${t.pts}</td>
          <td class="standings-col-form">
            <div class="form-indicators">
              ${t.form.map(f => `<span class="form-dot form-${f.toLowerCase()}">${f === 'W' ? 'G' : f === 'D' ? 'B' : 'M'}</span>`).join('')}
            </div>
          </td>
        </tr>
      `).join('');
    } else if (league === '1lig') {
      if (titleEl) titleEl.textContent = 'Trendyol 1. Lig Puan Durumu (2026-2027)';
      if (legendEl) {
        legendEl.innerHTML = `
          <div class="legend-item"><span class="legend-dot" style="background:#10B981;"></span><span>1-2: Süper Lig'e Doğrudan Yükselme</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#00D2FF;"></span><span>3-7: Play-Off Hattı</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#EF4444;"></span><span>17-20: Düşme Hattı</span></div>
        `;
      }
      const teams = [
        { rank: 1, name: 'Kocaelispor', played: 4, w: 3, d: 1, l: 0, gf: 8, ga: 2, gd: 6, pts: 10, form: ['W','W','D','W','W'] },
        { rank: 2, name: 'Fatih Karagümrük', played: 4, w: 3, d: 0, l: 1, gf: 7, ga: 3, gd: 4, pts: 9, form: ['W','L','W','W','W'] },
        { rank: 3, name: 'Bandırmaspor', played: 4, w: 2, d: 2, l: 0, gf: 6, ga: 3, gd: 3, pts: 8, form: ['D','W','D','W','W'] },
        { rank: 4, name: 'Erzurumspor FK', played: 4, w: 2, d: 1, l: 1, gf: 5, ga: 3, gd: 2, pts: 7, form: ['W','D','W','L','W'] },
        { rank: 5, name: 'Gençlerbirliği', played: 4, w: 2, d: 1, l: 1, gf: 4, ga: 3, gd: 1, pts: 7, form: ['W','L','D','W','W'] },
        { rank: 6, name: 'Iğdır FK', played: 4, w: 2, d: 0, l: 2, gf: 6, ga: 5, gd: 1, pts: 6, form: ['L','W','W','L','W'] },
        { rank: 7, name: 'Boluspor', played: 4, w: 1, d: 2, l: 1, gf: 4, ga: 4, gd: 0, pts: 5, form: ['D','W','L','D','W'] },
        { rank: 8, name: 'Çorum FK', played: 4, w: 1, d: 2, l: 1, gf: 5, ga: 5, gd: 0, pts: 5, form: ['W','D','D','L','D'] },
        { rank: 9, name: 'İstanbulspor', played: 4, w: 1, d: 1, l: 2, gf: 4, ga: 5, gd: -1, pts: 4, form: ['L','W','L','D','L'] },
        { rank: 10, name: 'Manisa FK', played: 4, w: 1, d: 1, l: 2, gf: 3, ga: 5, gd: -2, pts: 4, form: ['L','L','W','D','L'] }
      ];

      tableBody.innerHTML = teams.map(t => `
        <tr class="standings-row">
          <td class="standings-rank">
            <span class="rank-badge ${t.rank <= 2 ? 'rank-direct' : t.rank <= 7 ? 'rank-playoff' : t.rank >= 17 ? 'rank-relegation' : ''}">
              ${t.rank}
            </span>
          </td>
          <td class="standings-team-cell">
            <span class="standings-team-name">${Utils.escapeHTML(t.name)}</span>
          </td>
          <td class="standings-col-num">${t.played}</td>
          <td class="standings-col-num">${t.w}</td>
          <td class="standings-col-num">${t.d}</td>
          <td class="standings-col-num">${t.l}</td>
          <td class="standings-col-num">${t.gf}</td>
          <td class="standings-col-num">${t.ga}</td>
          <td class="standings-col-num">${t.gd > 0 ? '+' + t.gd : t.gd}</td>
          <td class="standings-col-pts">${t.pts}</td>
          <td class="standings-col-form">
            <div class="form-indicators">
              ${t.form.map(f => `<span class="form-dot form-${f.toLowerCase()}">${f === 'W' ? 'G' : f === 'D' ? 'B' : 'M'}</span>`).join('')}
            </div>
          </td>
        </tr>
      `).join('');
    } else {
      if (titleEl) titleEl.textContent = 'Trendyol Süper Lig Puan Durumu (2026-2027)';
      if (legendEl) {
        legendEl.innerHTML = `
          <div class="legend-item"><span class="legend-dot" style="background:#10B981;"></span><span>1: Şampiyonlar Ligi</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#00D2FF;"></span><span>2-4: Avrupa Kupaları</span></div>
          <div class="legend-item"><span class="legend-dot" style="background:#EF4444;"></span><span>16-19: Düşme Hattı</span></div>
        `;
      }
      const superTeams = [
        { rank: 1, name: 'Galatasaray', played: 4, w: 4, d: 0, l: 0, gf: 11, ga: 2, gd: 9, pts: 12, form: ['W','W','W','W','W'] },
        { rank: 2, name: 'Fenerbahçe', played: 4, w: 3, d: 1, l: 0, gf: 10, ga: 3, gd: 7, pts: 10, form: ['W','W','D','W','W'] },
        { rank: 3, name: 'Beşiktaş', played: 4, w: 3, d: 0, l: 1, gf: 8, ga: 4, gd: 4, pts: 9, form: ['W','W','L','W','W'] },
        { rank: 4, name: 'Samsunspor', played: 4, w: 2, d: 1, l: 1, gf: 6, ga: 4, gd: 2, pts: 7, form: ['W','D','W','L','W'] },
        { rank: 5, name: 'Trabzonspor', played: 4, w: 2, d: 1, l: 1, gf: 5, ga: 4, gd: 1, pts: 7, form: ['W','D','L','W','W'] },
        { rank: 6, name: 'Eyüpspor', played: 4, w: 2, d: 0, l: 2, gf: 6, ga: 5, gd: 1, pts: 6, form: ['L','W','W','L','W'] },
        { rank: 7, name: 'Göztepe', played: 4, w: 1, d: 3, l: 0, gf: 5, ga: 4, gd: 1, pts: 6, form: ['D','W','D','D','W'] },
        { rank: 8, name: 'Başakşehir', played: 4, w: 1, d: 2, l: 1, gf: 4, ga: 4, gd: 0, pts: 5, form: ['D','W','L','D','W'] },
        { rank: 9, name: 'Sivasspor', played: 4, w: 1, d: 1, l: 2, gf: 4, ga: 6, gd: -2, pts: 4, form: ['L','L','W','D','L'] },
        { rank: 10, name: 'Antalyaspor', played: 4, w: 1, d: 1, l: 2, gf: 3, ga: 6, gd: -3, pts: 4, form: ['W','L','D','L','L'] }
      ];

      tableBody.innerHTML = superTeams.map(t => `
        <tr class="standings-row">
          <td class="standings-rank">
            <span class="rank-badge ${t.rank === 1 ? 'rank-direct' : t.rank <= 4 ? 'rank-playoff' : t.rank >= 16 ? 'rank-relegation' : ''}">
              ${t.rank}
            </span>
          </td>
          <td class="standings-team-cell">
            <span class="standings-team-name">${Utils.escapeHTML(t.name)}</span>
          </td>
          <td class="standings-col-num">${t.played}</td>
          <td class="standings-col-num">${t.w}</td>
          <td class="standings-col-num">${t.d}</td>
          <td class="standings-col-num">${t.l}</td>
          <td class="standings-col-num">${t.gf}</td>
          <td class="standings-col-num">${t.ga}</td>
          <td class="standings-col-num">${t.gd > 0 ? '+' + t.gd : t.gd}</td>
          <td class="standings-col-pts">${t.pts}</td>
          <td class="standings-col-form">
            <div class="form-indicators">
              ${t.form.map(f => `<span class="form-dot form-${f.toLowerCase()}">${f === 'W' ? 'G' : f === 'D' ? 'B' : 'M'}</span>`).join('')}
            </div>
          </td>
        </tr>
      `).join('');
    }
  }
}
