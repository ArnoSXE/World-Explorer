/* ============================================================
   ui.js — UI Controller: panels, tabs, toasts, info cards
   ============================================================ */

const UI = (() => {

  /* ── Toast System ──────────────────────────────────────── */
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.innerHTML = `<span style="font-size:13px">${icons[type] || 'ℹ'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 320);
    }, duration);
  }

  /* ── Status HUD ────────────────────────────────────────── */
  function setStatus(text, state = 'ok') {
    const dot  = document.getElementById('status-dot');
    const span = document.getElementById('status-text');
    if (!dot || !span) return;
    dot.className  = `status-dot ${state === 'ok' ? '' : state}`;
    span.textContent = text;
  }

  /* ── HUD Coordinates ─────────────────────────────────── */
  function updateHUD(lat, lng, altMeters) {
    const latEl  = document.getElementById('hud-lat');
    const lngEl  = document.getElementById('hud-lng');
    const altEl  = document.getElementById('hud-alt');

    if (latEl) {
      latEl.textContent = lat.toFixed(6);
      latEl.classList.add('updated');
      setTimeout(() => latEl.classList.remove('updated'), 300);
    }
    if (lngEl) lngEl.textContent = lng.toFixed(6);
    if (altEl) {
      const km = altMeters / 1000;
      altEl.textContent = km >= 1 ? `${km.toFixed(0)} km` : `${altMeters.toFixed(0)} m`;
    }
  }

  /* ── Search ─────────────────────────────────────────── */
  let searchTimeout = null;

  function initSearch(onSelectCallback) {
    const input    = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');
    const btn      = document.getElementById('search-btn');

    if (!input) return;

    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = input.value.trim();
      if (q.length < 2) { dropdown.classList.add('hidden'); return; }

      searchTimeout = setTimeout(async () => {
        setStatus('Searching...', 'loading');
        const results = await API.searchPlaces(q);
        setStatus('Ready');
        renderSearchDropdown(results, dropdown, input, onSelectCallback);
      }, 400);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        const q = input.value.trim();
        if (!q) return;
        performSearch(q, dropdown, input, onSelectCallback);
      }
      if (e.key === 'Escape') dropdown.classList.add('hidden');
    });

    btn.addEventListener('click', () => {
      const q = input.value.trim();
      if (q) performSearch(q, dropdown, input, onSelectCallback);
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#search-container')) {
        dropdown.classList.add('hidden');
      }
    });
  }

  async function performSearch(q, dropdown, input, onSelect) {
    setStatus('Searching...', 'loading');
    const results = await API.searchPlaces(q, 6);
    setStatus('Ready');
    if (results.length === 1) {
      onSelect(results[0]);
      dropdown.classList.add('hidden');
      input.value = results[0].name;
    } else {
      renderSearchDropdown(results, dropdown, input, onSelect);
    }
  }

  function renderSearchDropdown(results, dropdown, input, onSelect) {
    dropdown.innerHTML = '';
    if (!results.length) {
      dropdown.innerHTML = '<div style="padding:12px 16px;color:rgba(255,255,255,0.3);font-size:12px">No results found</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    results.forEach(r => {
      const el = document.createElement('div');
      el.className = 'search-result-item';
      el.innerHTML = `
        <span class="result-icon">⊕</span>
        <span class="result-name">${escapeHtml(r.name)}</span>
        <span class="result-country">${escapeHtml(r.country)}</span>
      `;
      el.addEventListener('click', () => {
        onSelect(r);
        input.value = r.name;
        dropdown.classList.add('hidden');
      });
      dropdown.appendChild(el);
    });

    dropdown.classList.remove('hidden');
  }

  /* ── Tabs ─────────────────────────────────────────────── */
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${target}`)?.classList.add('active');
      });
    });
  }

  /* ── Sidebar Toggle ────────────────────────────────────── */
  function initSidebarToggles() {
    document.getElementById('toggle-left')?.addEventListener('click', () => {
      document.getElementById('sidebar-left').classList.toggle('collapsed');
    });
  }

  /* ── Info Panel ─────────────────────────────────────────── */
  async function updateInfoPanel(lat, lng) {
    const container = document.getElementById('location-info');
    if (!container) return;

    // Show skeleton
    container.innerHTML = `
      <div style="padding:16px;display:flex;flex-direction:column;gap:10px">
        <div class="skeleton skeleton-line wide"></div>
        <div class="skeleton skeleton-line mid"></div>
        <div class="skeleton skeleton-line wide"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line wide"></div>
      </div>`;

    const [geo, weather] = await Promise.all([
      API.reverseGeocode(lat, lng),
      API.getWeather(lat, lng),
    ]);

    let country = null;
    if (geo?.countryCode) {
      country = await API.getCountryInfo(geo.countryCode);
    }

    container.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'info-card';

    // Flag + Country Name
    if (country) {
      card.innerHTML += `
        <div class="info-flag">${country.flag}</div>
        <div class="info-country">${escapeHtml(country.name)}</div>
        <div class="info-region">${escapeHtml(geo.city || geo.state || '')}</div>
        <div class="info-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
      `;
    } else {
      card.innerHTML += `
        <div class="info-flag">🌍</div>
        <div class="info-country">${geo ? escapeHtml(geo.name) : 'Open Water'}</div>
        <div class="info-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
      `;
    }

    // Stats grid
    if (country) {
      card.innerHTML += `
        <div class="info-grid">
          <div class="info-stat">
            <div class="stat-label">POPULATION</div>
            <div class="stat-value">${fmtPop(country.population)}</div>
          </div>
          <div class="info-stat">
            <div class="stat-label">CAPITAL</div>
            <div class="stat-value">${escapeHtml(country.capital)}</div>
          </div>
          <div class="info-stat">
            <div class="stat-label">REGION</div>
            <div class="stat-value">${escapeHtml(country.region)}</div>
          </div>
          <div class="info-stat">
            <div class="stat-label">AREA</div>
            <div class="stat-value">${fmtArea(country.area)}</div>
          </div>
        </div>`;
    }

    if (geo?.state && geo.state !== country?.name) {
      card.innerHTML += `
        <div class="info-stat">
          <div class="stat-label">STATE / REGION</div>
          <div class="stat-value">${escapeHtml(geo.state)}</div>
        </div>`;
    }

    // Weather
    if (weather) {
      card.innerHTML += `
        <div class="info-stat">
          <div class="stat-label">WEATHER</div>
          <div class="stat-value">${weather.emoji} ${weather.condition} · ${weather.temp}°C</div>
        </div>`;
    }

    // Languages
    if (country?.languages) {
      card.innerHTML += `
        <div class="info-stat">
          <div class="stat-label">LANGUAGES</div>
          <div class="stat-value" style="font-size:10px">${escapeHtml(country.languages)}</div>
        </div>`;
    }

    // Action buttons
    card.innerHTML += `
      <div class="info-actions">
        <button class="info-btn" id="info-btn-streetview">👁 STREET</button>
        <button class="info-btn" id="info-btn-save">⊕ SAVE</button>
        <button class="info-btn" id="info-btn-share">⊞ SHARE</button>
      </div>`;

    container.appendChild(card);

    return { geo, country, weather };
  }

  /* ── Popup ───────────────────────────────────────────── */
  function showPopup(lat, lng, screenX, screenY, geoData) {
    const popup = document.getElementById('location-popup');
    const title = document.getElementById('popup-title');
    const latEl = document.getElementById('popup-lat');
    const lngEl = document.getElementById('popup-lng');
    const det   = document.getElementById('popup-details');

    if (!popup) return;

    title.textContent = geoData?.name || 'Unknown Location';
    latEl.textContent = `${lat.toFixed(5)}°`;
    lngEl.textContent = `${lng.toFixed(5)}°`;
    det.textContent   = geoData?.country || '';

    // Position popup near click point (with boundary clamping)
    const pw = 260, ph = 200;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = screenX + 16;
    let top  = screenY - 60;
    if (left + pw > vw - 20) left = screenX - pw - 16;
    if (top + ph > vh - 80)  top  = vh - ph - 80;
    if (top < 70) top = 70;

    popup.style.left = `${left}px`;
    popup.style.top  = `${top}px`;
    popup.classList.remove('hidden');
  }

  function hidePopup() {
    document.getElementById('location-popup')?.classList.add('hidden');
  }

  /* ── Bookmarks List ────────────────────────────────────── */
  function renderBookmarks(bookmarks, onFly, onDelete) {
    const list  = document.getElementById('bookmarks-list');
    const count = document.getElementById('bookmark-count');
    if (!list) return;

    count.textContent = `${bookmarks.length} saved`;

    if (!bookmarks.length) {
      list.innerHTML = '<div class="empty-state">No bookmarks yet.<br/>Press <kbd>B</kbd> to save a location.</div>';
      return;
    }

    list.innerHTML = '';
    bookmarks.forEach((bm, i) => {
      const el = document.createElement('div');
      el.className = 'item-card';
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div class="item-name">${escapeHtml(bm.name)}</div>
          <button class="item-delete" data-i="${i}" title="Delete">✕</button>
        </div>
        <div class="item-coords">${bm.lat.toFixed(4)}, ${bm.lng.toFixed(4)}</div>
        <div class="item-time">${fmtDate(bm.timestamp)}</div>
      `;
      el.addEventListener('click', e => {
        if (!e.target.matches('.item-delete')) onFly(bm);
      });
      el.querySelector('.item-delete').addEventListener('click', e => {
        e.stopPropagation();
        onDelete(i);
      });
      list.appendChild(el);
    });
  }

  /* ── History List ────────────────────────────────────── */
  function renderHistory(history, onFly) {
    const list  = document.getElementById('history-list');
    const count = document.getElementById('history-count');
    if (!list) return;

    count.textContent = `${history.length} visited`;

    if (!history.length) {
      list.innerHTML = '<div class="empty-state">No history yet.<br/>Start exploring!</div>';
      return;
    }

    list.innerHTML = '';
    history.slice().reverse().forEach(h => {
      const el = document.createElement('div');
      el.className = 'item-card';
      el.innerHTML = `
        <div class="item-name">${escapeHtml(h.name)}</div>
        <div class="item-coords">${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</div>
        <div class="item-time">${fmtDate(h.timestamp)}</div>
      `;
      el.addEventListener('click', () => onFly(h));
      list.appendChild(el);
    });
  }

  /* ── Helpers ─────────────────────────────────────────── */
  function escapeHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtPop(n) {
    if (!n) return '—';
    if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
    return n.toString();
  }

  function fmtArea(km2) {
    if (!km2) return '—';
    if (km2 >= 1e6) return `${(km2/1e6).toFixed(1)}M km²`;
    return `${Math.round(km2).toLocaleString()} km²`;
  }

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return {
    showToast,
    setStatus,
    updateHUD,
    initSearch,
    initTabs,
    initSidebarToggles,
    updateInfoPanel,
    showPopup,
    hidePopup,
    renderBookmarks,
    renderHistory,
    escapeHtml,
    fmtDate,
  };
})();
