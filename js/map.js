/* ============================================================
   map.js — Cesium Globe Setup, Layer Management, Interactions
   ============================================================ */

const MapEngine = (() => {

  let viewer = null;
  let currentLayer = 'satellite';
  let gridPrimitive = null;
  let weatherLayer = null;
  let dayNightActive = false;

  /* ── Init Cesium Viewer ─────────────────────────────── */
  function init(containerId, onClick) {
    // Use Cesium Ion token from environment variables
    if (window.CESIUM_TOKEN) {
      Cesium.Ion.defaultAccessToken = window.CESIUM_TOKEN;
    }

    viewer = new Cesium.Viewer(containerId, {
      imageryProvider: new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
        credit: '© OpenStreetMap contributors',
      }),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      baseLayerPicker:       false,
      navigationHelpButton:  false,
      sceneModePicker:       false,
      geocoder:              false,
      homeButton:            false,
      infoBox:               false,
      selectionIndicator:    false,
      timeline:              false,
      animation:             false,
      fullscreenButton:      false,
      vrButton:              false,
      shouldAnimate:         false,
    });

    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.00005;
    viewer.scene.backgroundColor = new Cesium.Color(0.02, 0.04, 0.08, 1);

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 20000000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
    });

    // Click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(async (click) => {
      const worldPos = screenToWorld(click.position.x, click.position.y);
      if (worldPos && onClick) {
        const geo = await API.reverseGeocode(worldPos.lat, worldPos.lng);
        onClick(worldPos.lat, worldPos.lng, click.position.x, click.position.y, geo);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    setTimeout(() => setLayer('satellite'), 800);
    return viewer;
  }

  /* ── Layer Management ────────────────────────────────── */
  function setLayer(layerName) {
    if (!viewer) return;
    const layers = viewer.imageryLayers;
    layers.removeAll();
    currentLayer = layerName;

    if (layerName === 'satellite') {
      layers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
        maximumLevel: 19,
      }));
    } else if (layerName === 'osm') {
      _addOSMLayer();
    } else if (layerName === 'terrain') {
      layers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
        url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
        credit: 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under ODbL.',
        maximumLevel: 18,
      }));
    }

    document.querySelectorAll('.layer-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.layer === layerName);
    });
  }

  function _addOSMLayer() {
    viewer.imageryLayers.addImageryProvider(new Cesium.OpenStreetMapImageryProvider({
      url: 'https://tile.openstreetmap.org/',
      credit: '© OpenStreetMap contributors',
    }));
  }

  function toggleDayNight(on) {
    if (!viewer) return;
    dayNightActive = on;
    viewer.scene.globe.enableLighting = on;
    if (on) {
      viewer.clock.currentTime = Cesium.JulianDate.now();
      viewer.clock.multiplier  = 3600;
      viewer.clock.shouldAnimate = true;
    } else {
      viewer.clock.shouldAnimate = false;
      viewer.clock.multiplier  = 0;
    }
  }

  function toggleGrid(on) {
    if (!viewer) return;
    if (on && !gridPrimitive) {
      gridPrimitive = viewer.imageryLayers.addImageryProvider(new Cesium.GridImageryProvider({
        cells: 8,
        color: Cesium.Color.fromCssColorString('#00c8ff').withAlpha(0.15),
        backgroundColor: Cesium.Color.TRANSPARENT,
      }));
    } else if (!on && gridPrimitive) {
      viewer.imageryLayers.remove(gridPrimitive);
      gridPrimitive = null;
    }
  }

  function flyTo(lat, lng, heightMeters = 500000, duration = 3) {
    if (!viewer) return;
    return new Promise(resolve => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lng, lat, heightMeters),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
        duration,
        complete: resolve,
      });
    });
  }

  function addMarker(lat, lng, label = '', color = '#00c8ff') {
    if (!viewer) return null;
    return viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lng, lat),
      billboard: {
        image: _createPinCanvas(color),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        width: 32, height: 42,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      label: label ? {
        text: label,
        font: '12px "Syne", sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#e0eeff'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -50),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      } : undefined,
    });
  }

  function removeMarker(entity) {
    if (viewer && entity) viewer.entities.remove(entity);
  }

  function _createPinCanvas(color = '#00c8ff') {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 42;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(16, 14, 12, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 22);
    ctx.lineTo(16, 42);
    ctx.lineTo(22, 22);
    ctx.fillStyle = color;
    ctx.fill();
    return canvas.toDataURL();
  }

  function getCameraInfo() {
    if (!viewer) return { lat: 0, lng: 0, alt: 0 };
    const carto = Cesium.Cartographic.fromCartesian(viewer.camera.position);
    return {
      lat: Cesium.Math.toDegrees(carto.latitude),
      lng: Cesium.Math.toDegrees(carto.longitude),
      alt: carto.height / 1000,
    };
  }

  function screenToWorld(x, y) {
    if (!viewer) return null;
    const ray = viewer.camera.getPickRay(new Cesium.Cartesian2(x, y));
    const intersection = viewer.scene.globe.pick(ray, viewer.scene);
    if (!intersection) return null;
    const carto = Cesium.Cartographic.fromCartesian(intersection);
    return {
      lat: Cesium.Math.toDegrees(carto.latitude),
      lng: Cesium.Math.toDegrees(carto.longitude),
    };
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }

  function renderMiniMap(lat, lng) {
    const canvas = document.getElementById('mini-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0d1520';
    ctx.fillRect(0, 0, W, H);
    const px = (lng + 180) / 360 * W;
    const py = (90 - lat) / 180 * H;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00c8ff';
    ctx.fill();
  }

  return { init, setLayer, toggleDayNight, toggleGrid, flyTo, addMarker, removeMarker, getCameraInfo, screenToWorld, toggleFullscreen, renderMiniMap, getViewer: () => viewer };
})();
