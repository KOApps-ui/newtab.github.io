/**
 * AuraTab Başkent - Canlı Hava Durumu Widget'ı (Weather)
 * Open-Meteo ücretsiz API entegrasyonu, Ankara ve Türkiye şehirleri hava tahmini
 */

import { Utils } from '../utils.js';

const WMO_CODES = {
  0: { desc: 'Açık / Güneşli', icon: '☀️' },
  1: { desc: 'Çoğunlukla Açık', icon: '🌤️' },
  2: { desc: 'Parçalı Bulutlu', icon: '⛅' },
  3: { desc: 'Kapalı / Bulutlu', icon: '☁️' },
  45: { desc: 'Sisli', icon: '🌫️' },
  48: { desc: 'Kırağılı Sis', icon: '🌫️' },
  51: { desc: 'Hafif Çisenti', icon: '🌦️' },
  53: { desc: 'Orta Çisenti', icon: '🌦️' },
  55: { desc: 'Yoğun Çisenti', icon: '🌧️' },
  61: { desc: 'Hafif Yağmur', icon: '🌧️' },
  63: { desc: 'Orta Yağmur', icon: '🌧️' },
  65: { desc: 'Kuvvetli Yağmur', icon: '🌧️' },
  71: { desc: 'Hafif Kar', icon: '🌨️' },
  73: { desc: 'Orta Kar', icon: '🌨️' },
  75: { desc: 'Yoğun Kar Yağışı', icon: '❄️' },
  80: { desc: 'Sağanak Yağış', icon: '🌦️' },
  81: { desc: 'Kuvvetli Sağanak', icon: '🌧️' },
  82: { desc: 'Şiddetli Sağanak', icon: '⛈️' },
  95: { desc: 'Gök Gürültülü Fırtına', icon: '⚡' }
};

export class WeatherWidget {
  constructor(storage, containerId = 'weatherWidget') {
    this.storage = storage;
    this.containerId = containerId;
    this.container = null;
    this.currentCity = { name: 'Ankara', lat: 39.9334, lon: 32.8597 };
    this.weatherData = null;
  }

  async init() {
    this.container = document.getElementById(this.containerId);
    const settings = await this.storage.getSettings();
    if (settings.weatherCity) {
      this.currentCity = settings.weatherCity;
    }

    // Cache'deki son veriyi göster
    const cached = await this.storage.get('cached_weather', null);
    if (cached) {
      this.weatherData = cached;
      this.render();
    }

    this.fetchWeather();
    this.bindEvents();
  }

  async fetchWeather() {
    const { lat, lon } = this.currentCity;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Hava durumu verisi alınamadı');
      const data = await resp.json();
      this.weatherData = data;
      await this.storage.set('cached_weather', data);
      this.render();
    } catch (err) {
      console.warn('Weather fetch error:', err);
    }
  }

  render() {
    if (!this.container) return;

    if (!this.weatherData || !this.weatherData.current) {
      this.container.innerHTML = `
        <div style="text-align:center;padding:20px;color:var(--text-muted);">
          <span>Hava durumu yükleniyor...</span>
        </div>
      `;
      return;
    }

    const cur = this.weatherData.current;
    const daily = this.weatherData.daily;
    const codeInfo = WMO_CODES[cur.weather_code] || { desc: 'Açık', icon: '☀️' };

    // 4 Günlük Tahmin
    const daysName = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    let forecastHtml = '';

    if (daily && daily.time) {
      for (let i = 1; i < Math.min(5, daily.time.length); i++) {
        const d = new Date(daily.time[i]);
        const dName = daysName[d.getDay()];
        const dCode = daily.weather_code[i];
        const dInfo = WMO_CODES[dCode] || { desc: 'Açık', icon: '☀️' };
        const maxT = Math.round(daily.temperature_2m_max[i]);
        const minT = Math.round(daily.temperature_2m_min[i]);

        forecastHtml += `
          <div class="forecast-day-item">
            <span class="forecast-day-name">${dName}</span>
            <span style="font-size:1.2rem;">${dInfo.icon}</span>
            <span class="forecast-day-temp">${maxT}° / ${minT}°</span>
          </div>
        `;
      }
    }

    this.container.innerHTML = `
      <div class="widget-header">
        <div class="widget-title-group">
          <div class="widget-icon">
            <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
          </div>
          <span class="widget-title">${Utils.escapeHTML(this.currentCity.name)} Hava Durumu</span>
        </div>
        <button class="widget-action-btn" id="refreshWeatherBtn" title="Hava Durumunu Yenile">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        </button>
      </div>

      <div class="weather-main-row">
        <div class="weather-temp-wrap">
          <span style="font-size:2.8rem;line-height:1;">${codeInfo.icon}</span>
          <div>
            <div class="weather-temp-val">${Math.round(cur.temperature_2m)}°C</div>
            <div class="weather-condition-desc">${codeInfo.desc}</div>
          </div>
        </div>
      </div>

      <div class="weather-details-grid">
        <div class="weather-detail-item">
          <span class="weather-detail-lbl">Hissedilen</span>
          <span class="weather-detail-val">${Math.round(cur.apparent_temperature)}°C</span>
        </div>
        <div class="weather-detail-item">
          <span class="weather-detail-lbl">Nem</span>
          <span class="weather-detail-val">%${cur.relative_humidity_2m}</span>
        </div>
        <div class="weather-detail-item">
          <span class="weather-detail-lbl">Rüzgar</span>
          <span class="weather-detail-val">${Math.round(cur.wind_speed_10m)} km/s</span>
        </div>
      </div>

      <div class="weather-forecast-row">
        ${forecastHtml}
      </div>
    `;

    // Header üzerindeki mini hava durumu rozetini de güncelle
    const miniBadge = document.getElementById('headerMiniWeather');
    if (miniBadge) {
      miniBadge.innerHTML = `${codeInfo.icon} ${Math.round(cur.temperature_2m)}°C Ankara`;
    }
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      if (e.target && (e.target.id === 'refreshWeatherBtn' || e.target.closest('#refreshWeatherBtn'))) {
        this.fetchWeather();
        Utils.showToast('Hava durumu güncellendi.', 'info');
      }
    });
  }
}
