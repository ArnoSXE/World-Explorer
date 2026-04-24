/* ============================================================
   cinematic.js — Cinematic Mode: Flythrough, Auto-Orbit
   ============================================================ */

const CinematicEngine = (() => {

  let active = false;
  let orbitInterval = null;
  let flyThroughInterval = null;
  let orbitAngle = 0;
  let orbitTarget = null;
  let viewer = null; // Cesium viewer reference

  /* ── Initialize with Cesium viewer ──────────────────── */
  function init(cesiumViewer) {
    viewer = cesiumViewer;
  }

  /* ── Start cinematic mode ──────────────────────────── */
  function start(targetLat, targetLng, locationName) {
    if (!viewer) return;
    active = true;

    orbitTarget = { lat: targetLat, lng: targetLng };
    orbitAngle = 0;

    const overlay = document.getElementById('cinematic-overlay');
    const nameEl  = document.getElementById('cin-location-name');

    overlay.classList.remove('hidden');
    nameEl.textContent = locationName || '—';

    // First: dramatic zoom-in
    _dramaticFlyIn(targetLat, targetLng, () => {
      // Then start orbit
      _startOrbit();
    });

    UI.showToast('Cinematic mode activated — press C or ESC to exit', 'info');
  }

  /* ── Stop cinematic mode ──────────────────────────── */
  function stop() {
    active = false;
    clearInterval(orbitInterval);
    clearInterval(flyThroughInterval);
    orbitInterval = null;
    orbitTarget = null;

    const overlay = document.getElementById('cinematic-overlay');
    overlay.classList.add('hidden');

    // Restore default camera controls
    if (viewer) {
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableZoom   = true;
      viewer.scene.screenSpaceCameraController.enableTilt   = true;
      viewer.scene.screenSpaceCameraController.enableLook   = true;
    }
  }

  /* ── Auto flythrough (random tour) ──────────────────── */
  async function startTour() {
    if (!viewer) return;
    active = true;

    const places = API.getAllInteresting().slice(0, 8);
    let idx = 0;

    const overlay = document.getElementById('cinematic-overlay');
    overlay.classList.remove('hidden');

    async function flyNext() {
      if (!active) return;
      const place = places[idx % places.length];
      idx++;

      document.getElementById('cin-location-name').textContent = place.name;

      await _flyTo(place.lat, place.lng, 3000);

      // Pause at each spot
      await _sleep(5000);

      if (active) flyNext();
    }

    flyNext();
  }

  /* ── Dramatic fly-in (space → ground) ─────────────── */
  function _dramaticFlyIn(lat, lng, onComplete) {
    if (!viewer) return;

    const destination = Cesium.Cartesian3.fromDegrees(lng, lat, 8000000);
    const orientation = {
      heading: Cesium.Math.toRadians(0),
      pitch:   Cesium.Math.toRadians(-45),
      roll: 0,
    };

    viewer.camera.flyTo({
      destination,
      orientation,
      duration: 3,
      easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
      complete: () => {
        // Second phase: zoom to surface
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(lng, lat, 5000),
          orientation: {
            heading: Cesium.Math.toRadians(Math.random() * 360),
            pitch:   Cesium.Math.toRadians(-25),
            roll: 0,
          },
          duration: 4,
          easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
          complete: onComplete,
        });
      },
    });
  }

  /* ── Orbit around target point ──────────────────────── */
  function _startOrbit() {
    if (!viewer || !orbitTarget) return;

    const { lat, lng } = orbitTarget;
    const radius = 0.15; // degrees offset
    const height = 4000;
    const speed  = 0.006; // degrees per tick

    // Lock camera controls during orbit
    viewer.scene.screenSpaceCameraController.enableRotate = false;
    viewer.scene.screenSpaceCameraController.enableZoom   = false;

    orbitInterval = setInterval(() => {
      if (!active) { clearInterval(orbitInterval); return; }

      orbitAngle += speed;

      const camLng = lng + radius * Math.cos(orbitAngle);
      const camLat = lat + radius * 0.5 * Math.sin(orbitAngle);

      viewer.camera.lookAt(
        Cesium.Cartesian3.fromDegrees(lng, lat, 0),
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(orbitAngle * (180 / Math.PI)),
          Cesium.Math.toRadians(-20),
          height
        )
      );
    }, 50);
  }

  /* ── Fly to location (Promise) ──────────────────────── */
  function _flyTo(lat, lng, height = 15000) {
    return new Promise(resolve => {
      if (!viewer) { resolve(); return; }
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
        orientation: {
          heading: Cesium.Math.toRadians(Math.random() * 360),
          pitch:   Cesium.Math.toRadians(-35),
          roll: 0,
        },
        duration: 4,
        complete: resolve,
      });
    });
  }

  /* ── Sleep helper ─────────────────────────────────── */
  function _sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function isActive() { return active; }

  return { init, start, stop, startTour, isActive };
})();
