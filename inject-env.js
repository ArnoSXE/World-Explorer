// Vite injects import.meta.env from .env (VITE_*). Then loads app scripts in order.
window.MAPILLARY_TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN ?? window.MAPILLARY_TOKEN ?? '';
window.CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN ?? window.CESIUM_TOKEN ?? '';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(s);
  });
}

(async () => {
  const chain = [
    '/js/config.js',
    '/js/api.js',
    '/js/random.js',
    '/js/cinematic.js',
    '/js/ui.js',
    '/js/map.js',
    '/js/app.js',
  ];

  for (const src of chain) {
    await loadScript(src);
  }
})();
