// Optional process.env (some bundlers). Does not override inject-env.js / Vite .env values.
(function () {
  var env = (typeof process !== 'undefined' && process.env) ? process.env : {};
  window.CESIUM_TOKEN = env.CESIUM_TOKEN || window.CESIUM_TOKEN || '';
  window.MAPILLARY_TOKEN = env.MAPILLARY_TOKEN || window.MAPILLARY_TOKEN || '';
})();
