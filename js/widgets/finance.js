/**
 * AuraTab Başkent - Canlı Piyasa & Kripto Widget'ı (Finance)
 * USD, EUR, Gram Altın, BIST 100, Bitcoin ve Ethereum kurları
 */

import { Utils } from '../utils.js';

export class FinanceWidget {
  constructor(storage) {
    this.storage = storage;
    this.rates = {
      USD: { label: 'USD/TRY', value: '34.12', change: '+0.15%', isUp: true },
      EUR: { label: 'EUR/TRY', value: '37.85', change: '+0.22%', isUp: true },
      GA:  { label: 'Gram Altın', value: '2.840 ₺', change: '+0.45%', isUp: true },
      BIST:{ label: 'BIST 100', value: '10.150', change: '+1.10%', isUp: true },
      BTC: { label: 'BTC/USD', value: '$64.500', change: '+2.40%', isUp: true },
      ETH: { label: 'ETH/USD', value: '$3.450', change: '-0.30%', isUp: false }
    };
  }

  async init() {
    this.renderHeaderTicker();
    this.fetchLiveRates();
    // Her 5 dakikada bir güncelle
    setInterval(() => this.fetchLiveRates(), 5 * 60 * 1000);
  }

  async fetchLiveRates() {
    try {
      // Free public currency API
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      if (resp.ok) {
        const data = await resp.json();
        if (data.rates && data.rates.TRY) {
          const tryRate = data.rates.TRY;
          const eurRate = data.rates.TRY / data.rates.EUR;
          
          this.rates.USD.value = tryRate.toFixed(2) + ' ₺';
          this.rates.EUR.value = eurRate.toFixed(2) + ' ₺';
        }
      }

      // Free Crypto API (CoinGecko Simple Price)
      const cryptoResp = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
      if (cryptoResp.ok) {
        const cData = await cryptoResp.json();
        if (cData.bitcoin) {
          const btc = cData.bitcoin;
          this.rates.BTC.value = '$' + Math.round(btc.usd).toLocaleString('en-US');
          this.rates.BTC.change = (btc.usd_24h_change >= 0 ? '+' : '') + btc.usd_24h_change.toFixed(2) + '%';
          this.rates.BTC.isUp = btc.usd_24h_change >= 0;
        }
        if (cData.ethereum) {
          const eth = cData.ethereum;
          this.rates.ETH.value = '$' + Math.round(eth.usd).toLocaleString('en-US');
          this.rates.ETH.change = (eth.usd_24h_change >= 0 ? '+' : '') + eth.usd_24h_change.toFixed(2) + '%';
          this.rates.ETH.isUp = eth.usd_24h_change >= 0;
        }
      }

      this.renderHeaderTicker();
    } catch (e) {
      console.warn('Finance API fetch notice (using cache/default):', e);
    }
  }

  renderHeaderTicker() {
    const strip = document.getElementById('liveTickerStrip');
    if (!strip) return;

    strip.innerHTML = Object.values(this.rates).map(item => `
      <div class="ticker-item">
        <span class="ticker-label">${Utils.escapeHTML(item.label)}</span>
        <span class="ticker-value">${Utils.escapeHTML(item.value)}</span>
        <span class="ticker-change ${item.isUp ? 'up' : 'down'}">${Utils.escapeHTML(item.change)}</span>
      </div>
    `).join('');
  }
}
