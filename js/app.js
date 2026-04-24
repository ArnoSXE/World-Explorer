/* ============================================================
   app.js — Main Application Controller
   Bootstraps all modules, wires events, manages state
   ============================================================ */

(async () => {

  /* ── App State ────────────────────────────────────────── */
  const State = {
    currentLat: 0,
    currentLng: 0,
    currentAlt: 20000000,
    currentGeo: null,
    clickedLat: null,
    clickedLng: null,
    clickedGeo: null,
    bookmarks: [],
    history: [],
    activeMarker: null,
    isGeneratingRandom: false,
    isCinematic: false,
    hud_raf: null,
    mlyViewer: null,
  };

  /* ── Loading Screen ───────────────────────────────────── */
  function setLoadingProgress(pct, text) {
    const bar   = document.getElementById('loader-bar-fill');
    const label = document.getElementById('loader-status');
    if (bar)   bar.style.width   = `${pct}%`;
    if (label) label.textContent = text;
  }

  function hideLoadingScreen() {
    const screen = document.getElementById('loading-screen');
    if (screen) screen.classList.add('fade-out');
  }

  /* ── Load from localStorage ───────────────────────────── */
  function loadPersisted() {
    try {
      const bm = localStorage.getItem('we_bookmarks');
      const hs = localStorage.getItem('we_history');
      if (bm) State.bookmarks = JSON.parse(bm);
      if (hs) State.history   = JSON.parse(hs);
    } catch(e) {}
  }

  function savePersisted() {
    try {
      localStorage.setItem('we_bookmarks', JSON.stringify(State.bookmarks));
      localStorage.setItem('we_history',   JSON.stringify(State.history));
    } catch(e) {}
  }

  /* ── History tracking ─────────────────────────────────── */
  function addHistory(lat, lng, name) {
    State.history.push({ lat, lng, name, timestamp: Date.now() });
    if (State.history.length > 50) State.history.shift();
    savePersisted();
    UI.renderHistory(State.history, flyToItem);
  }

  /* ── Bookmark ─────────────────────────────────────────── */
  function addBookmark(lat, lng, name) {
    const exists = State.bookmarks.some(
      b => Math.abs(b.lat - lat) < 0.001 && Math.abs(b.lng - lng) < 0.001
    );
    if (exists) { UI.showToast('Already bookmarked!', 'warning'); return; }

    State.bookmarks.push({ lat, lng, name, timestamp: Date.now() });
    savePersisted();
    UI.renderBookmarks(State.bookmarks, flyToItem, deleteBookmark);
    UI.showToast(`📌 Saved: ${name}`, 'success');
  }

  function deleteBookmark(idx) {
    State.bookmarks.splice(idx, 1);
    savePersisted();
    UI.renderBookmarks(State.bookmarks, flyToItem, deleteBookmark);
  }

  /* ── Fly to a saved item ─────────────────────────────── */
  function flyToItem(item) {
    flyToLocation(item.lat, item.lng, item.name, 80000);
  }

  /* ── Core: fly to any location ───────────────────────── */
  async function flyToLocation(lat, lng, name = '', height = 200000) {
    State.currentLat = lat;
    State.currentLng = lng;

    UI.setStatus(`Flying to ${name || 'location'}...`, 'loading');

    // Remove previous marker
    if (State.activeMarker) {
      MapEngine.removeMarker(State.activeMarker);
      State.activeMarker = null;
    }

    await MapEngine.flyTo(lat, lng, height, 3);

    // Add marker
    State.activeMarker = MapEngine.addMarker(lat, lng, name, '#00c8ff');
    MapEngine.renderMiniMap(lat, lng);

    // Fetch info
    UI.setStatus('Loading location data...', 'loading');
    const result = await UI.updateInfoPanel(lat, lng);

    if (result?.geo) {
      State.currentGeo = result.geo;
      const locName = result.geo.city || result.geo.name || name;
      addHistory(lat, lng, locName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
    }

    UI.setStatus('Ready');

    // Update cinematic location name
    if (State.isCinematic) {
      document.getElementById('cin-location-name').textContent = name || State.currentGeo?.country || '—';
    }
  }

  /* ── Random Location ──────────────────────────────────── */
  async function goRandom() {
    if (State.isGeneratingRandom) return;
    State.isGeneratingRandom = true;

    const btn = document.getElementById('btn-random');
    btn?.classList.add('spinning');
    UI.setStatus('Generating random location...', 'loading');
    UI.hidePopup();

    const landOnly    = document.getElementById('filter-land')?.checked ?? true;
    const interesting = document.getElementById('filter-interesting')?.checked ?? false;

    const point = await RandomEngine.generate({ landOnly, interesting });

    btn?.classList.remove('spinning');
    State.isGeneratingRandom = false;

    const height = RandomEngine.randomAltitude(800);
    await flyToLocation(point.lat, point.lng, point.name || '', height);

    UI.showToast(`🎲 ${point.name || `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`}`, 'info');
  }

  /* ── Search ──────────────────────────────────────────── */
  UI.initSearch(async (result) => {
    await flyToLocation(result.lat, result.lng, result.name, 120000);
  });

  /* ── Layer switching ─────────────────────────────────── */
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => MapEngine.setLayer(btn.dataset.layer));
  });

  /* ── Overlay toggles ─────────────────────────────────── */
  document.getElementById('toggle-daynight')?.addEventListener('change', e => {
    MapEngine.toggleDayNight(e.target.checked);
  });

  document.getElementById('toggle-grid')?.addEventListener('change', e => {
    MapEngine.toggleGrid(e.target.checked);
  });

  document.getElementById('toggle-weather')?.addEventListener('change', e => {
    if (e.target.checked) {
      UI.showToast('Weather data loaded from Open-Meteo', 'info');
    }
  });

  /* ── Random button ───────────────────────────────────── */
  document.getElementById('btn-random')?.addEventListener('click', goRandom);

  /* ── Fullscreen ──────────────────────────────────────── */
  document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
    MapEngine.toggleFullscreen();
  });

  /* ── Cinematic mode ──────────────────────────────────── */
  document.getElementById('btn-cinematic')?.addEventListener('click', () => {
    if (CinematicEngine.isActive()) {
      CinematicEngine.stop();
      State.isCinematic = false;
    } else {
      State.isCinematic = true;
      CinematicEngine.start(
        State.currentLat,
        State.currentLng,
        State.currentGeo?.name || 'Earth'
      );
    }
  });

  document.getElementById('exit-cinematic')?.addEventListener('click', () => {
    CinematicEngine.stop();
    State.isCinematic = false;
  });

  /* ── Share location ──────────────────────────────────── */
  function shareLocation(lat, lng) {
    const url = `${location.origin}${location.pathname}?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`;
    navigator.clipboard.writeText(url).then(() => {
      UI.showToast('🔗 Location link copied!', 'success');
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  }

  document.getElementById('btn-share')?.addEventListener('click', () => {
    shareLocation(State.currentLat, State.currentLng);
  });

  /* ── Bookmark HUD button ─────────────────────────────── */
  document.getElementById('btn-bookmark-hud')?.addEventListener('click', () => {
    const name = State.currentGeo?.city || State.currentGeo?.name
      || `${State.currentLat.toFixed(3)}, ${State.currentLng.toFixed(3)}`;
    addBookmark(State.currentLat, State.currentLng, name);
  });

  /* ── Popup actions ───────────────────────────────────── */
  document.getElementById('popup-fly')?.addEventListener('click', () => {
    if (State.clickedLat !== null) {
      flyToLocation(State.clickedLat, State.clickedLng, '', 50000);
      UI.hidePopup();
    }
  });

  document.getElementById('popup-save')?.addEventListener('click', () => {
    if (State.clickedLat !== null) {
      const name = State.clickedGeo?.name
        || `${State.clickedLat.toFixed(3)}, ${State.clickedLng.toFixed(3)}`;
      addBookmark(State.clickedLat, State.clickedLng, name);
      UI.hidePopup();
    }
  });

  document.getElementById('popup-streetview')?.addEventListener('click', () => {
    if (State.clickedLat !== null) openStreetView(State.clickedLat, State.clickedLng);
  });

  document.getElementById('close-popup')?.addEventListener('click', UI.hidePopup);

  /* ── Info panel action buttons ───────────────────────── */
  document.addEventListener('click', e => {
    if (e.target.id === 'info-btn-streetview') {
      openStreetView(State.currentLat, State.currentLng);
    }
    if (e.target.id === 'info-btn-save') {
      const name = State.currentGeo?.city || State.currentGeo?.name
        || `${State.currentLat.toFixed(3)}, ${State.currentLng.toFixed(3)}`;
      addBookmark(State.currentLat, State.currentLng, name);
    }
    if (e.target.id === 'info-btn-share') {
      shareLocation(State.currentLat, State.currentLng);
    }
  });

  /* ── Street View: Mapillary (token from js/secrets.js) + Panoramax fallback ─ */

  function haversineMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const r1 = lat1 * Math.PI / 180;
    const r2 = lat2 * Math.PI / 180;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(r1) * Math.cos(r2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function mapillaryAccessToken() {
    const t = (window.MAPILLARY_TOKEN || '').trim();
    if (t && /^MLY\|/.test(t)) return t;
    // Return empty string if no token provided - Mapillary will use fallback
    return '';
  }

  async function fetchNearestMapillaryImageId(lat, lng, token) {
    const pad = 0.004;
    const minLon = lng - pad;
    const minLat = lat - pad;
    const maxLon = lng + pad;
    const maxLat = lat + pad;
    const q = new URLSearchParams({
      access_token: token,
      fields: 'id,geometry',
      bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
      limit: '50',
    });
    const res = await fetch(`https://graph.mapillary.com/images?${q}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || 'Mapillary graph API error');
    const rows = data.data;
    if (!rows || !rows.length) return null;
    let bestId = rows[0].id;
    let bestD = Infinity;
    for (const img of rows) {
      const c = img.geometry && img.geometry.coordinates;
      if (!c) continue;
      const d = haversineMeters(lat, lng, c[1], c[0]);
      if (d < bestD) {
        bestD = d;
        bestId = img.id;
      }
    }
    return bestId;
  }

  async function fetchNearestPanoramaxImage(lat, lng) {
    const pad = 0.0035;
    const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`;
    const url = `https://panoramax.openstreetmap.fr/api/search?bbox=${bbox}&limit=40`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const fc = await res.json();
    const feats = fc.features || [];
    if (!feats.length) return null;
    let best = feats[0];
    let bestD = Infinity;
    for (const f of feats) {
      const c = f.geometry && f.geometry.coordinates;
      if (!c) continue;
      const d = haversineMeters(lat, lng, c[1], c[0]);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    const href = (best.assets && best.assets.sd && best.assets.sd.href)
      || (best.properties && best.properties['geovisio:image']);
    return href || null;
  }

  function scheduleMlyResize() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          if (State.mlyViewer && typeof State.mlyViewer.resize === 'function') State.mlyViewer.resize();
        } catch (_) { /* ignore */ }
      }, 120);
    });
  }

  async function openStreetView(lat, lng) {
    const modal = document.getElementById('streetview-modal');
    const viewerDiv = document.getElementById('mapillary-viewer');
    const staticWrap = document.getElementById('street-static-view');
    const staticImg = document.getElementById('street-static-img');
    const staticCredit = document.getElementById('street-static-credit');
    const fallback = document.getElementById('streetview-fallback');

    modal.classList.remove('hidden');
    fallback.classList.add('hidden');
    staticWrap.classList.add('hidden');
    viewerDiv.classList.remove('hidden');
    staticImg.removeAttribute('src');
    staticCredit.textContent = '';

    const token = mapillaryAccessToken();

    try {
      if (!token) throw new Error('No Mapillary token');
      const imageId = await fetchNearestMapillaryImageId(lat, lng, token);
      if (!imageId) throw new Error('No Mapillary coverage');

      if (!State.mlyViewer) {
        State.mlyViewer = new mapillary.Viewer({
          accessToken: token,
          container: 'mapillary-viewer',
        });
      } else if (typeof State.mlyViewer.setAccessToken === 'function') {
        await Promise.resolve(State.mlyViewer.setAccessToken(token));
      }

      await State.mlyViewer.moveTo(imageId);
      scheduleMlyResize();
      return;
    } catch (e) {
      console.warn('Mapillary:', e);
    }

    try {
      const panoUrl = await fetchNearestPanoramaxImage(lat, lng);
      if (panoUrl) {
        viewerDiv.classList.add('hidden');
        staticImg.src = panoUrl;
        staticCredit.textContent = '';
        staticCredit.appendChild(document.createTextNode('Imagery: OpenStreetMap France '));
        const pxLink = document.createElement('a');
        pxLink.href = 'https://panoramax.openstreetmap.fr';
        pxLink.target = '_blank';
        pxLink.rel = 'noopener noreferrer';
        pxLink.textContent = 'Panoramax';
        staticCredit.appendChild(pxLink);
        staticCredit.appendChild(document.createTextNode(' · CC-BY-SA-4.0'));
        staticWrap.classList.remove('hidden');
        return;
      }
    } catch (e) {
      console.warn('Panoramax:', e);
    }

    viewerDiv.classList.add('hidden');
    staticWrap.classList.add('hidden');
    fallback.classList.remove('hidden');
  }

  document.getElementById('close-streetview')?.addEventListener('click', () => {
    document.getElementById('streetview-modal').classList.add('hidden');
  });

  /* ── Initialization ───────────────────────────────────── */
  async function init() {
    setLoadingProgress(10, 'Loading configuration...');
    loadPersisted();

    setLoadingProgress(30, 'Initializing Globe Engine...');
    await MapEngine.init('cesiumContainer', (lat, lng, sx, sy, geo) => {
      State.clickedLat = lat;
      State.clickedLng = lng;
      State.clickedGeo = geo;
      UI.showPopup(lat, lng, sx, sy, geo);
    });

    setLoadingProgress(70, 'Setting up UI components...');
    CinematicEngine.init(MapEngine.getViewer());
    UI.initTabs();
    UI.initSidebarToggles();
    UI.renderBookmarks(State.bookmarks, flyToItem, deleteBookmark);
    UI.renderHistory(State.history, flyToItem);

    // Check for URL params
    const params = new URLSearchParams(window.location.search);
    const pLat = parseFloat(params.get('lat'));
    const pLng = parseFloat(params.get('lng'));

    setLoadingProgress(90, 'Finalizing...');
    if (!isNaN(pLat) && !isNaN(pLng)) {
      await flyToLocation(pLat, pLng, 'Shared Location', 50000);
    } else {
      // Default view: Space
      UI.setStatus('Ready');
    }

    hideLoadingScreen();

    // Start HUD update loop
    function updateHUD() {
      const cam = MapEngine.getCameraInfo();
      UI.updateHUD(cam.lat, cam.lng, cam.alt);
      State.hud_raf = requestAnimationFrame(updateHUD);
    }
    updateHUD();
  }

  init();

})();
