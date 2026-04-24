/* ============================================================
   random.js — Smart Random Location Generator
   Modes: pure random, land-only, interesting places
   ============================================================ */

const RandomEngine = (() => {

  /* ── Land polygons (simplified bounding boxes) ──────────
     We use a weighted biome/region approach so results are
     spread across continents, not ocean-heavy.
  ─────────────────────────────────────────────────────────── */
  const LAND_REGIONS = [
    // [name, minLat, maxLat, minLng, maxLng, weight]
    ['North America',     10,  70,  -170,  -52,  12],
    ['Central America',    7,  20,  -92,   -77,   2],
    ['South America',    -55,  12,  -81,   -34,  14],
    ['Europe',            35,  71,  -10,    40,   8],
    ['Africa',           -35,  37,  -17,    51,  20],
    ['Middle East',        12,  38,   24,    63,   4],
    ['Central Asia',      35,  55,   50,    90,   5],
    ['South Asia',        7,   36,   61,    97,   6],
    ['East Asia',         20,  53,   99,   145,   8],
    ['Southeast Asia',   -10,  28,   93,   141,   7],
    ['Australia',        -43,  -10, 113,   154,   7],
    ['New Zealand',      -47,  -34, 166,   178,   2],
    ['Greenland',         60,  83,  -55,   -17,   1],
    ['Russia / Siberia',  50,  72,   60,   180,   4],
  ];

  const totalWeight = LAND_REGIONS.reduce((s, r) => s + r[6], 0);

  function pickWeightedRegion() {
    let rand = Math.random() * totalWeight;
    for (const region of LAND_REGIONS) {
      rand -= region[6];
      if (rand <= 0) return region;
    }
    return LAND_REGIONS[0];
  }

  /* ── Pure random (globe surface, any) ─────────────────── */
  function pureRandom() {
    // Use spherical distribution to avoid polar bias
    const u = Math.random();
    const v = Math.random();
    const lat = Math.asin(2 * u - 1) * (180 / Math.PI);
    const lng = (v * 360) - 180;
    return { lat, lng };
  }

  /* ── Land-biased random ─────────────────────────────────  */
  function landBiased() {
    const region = pickWeightedRegion();
    const lat = region[1] + Math.random() * (region[2] - region[1]);
    const lng = region[3] + Math.random() * (region[4] - region[3]);
    return { lat, lng, region: region[0] };
  }

  /* ── Generate point with land check ──────────────────── */
  async function getRandomLand(maxTries = 8) {
    for (let i = 0; i < maxTries; i++) {
      const point = landBiased();
      const onLand = await API.isOnLand(point.lat, point.lng);
      if (onLand) return point;
    }
    // Fallback: return biased point anyway
    return landBiased();
  }

  /* ── Interesting place ───────────────────────────────── */
  function getInteresting() {
    return API.getRandomInteresting();
  }

  /* ── Master generator ───────────────────────────────── */
  async function generate(options = {}) {
    const {
      landOnly = true,
      interesting = false,
    } = options;

    if (interesting) {
      const place = getInteresting();
      return { lat: place.lat, lng: place.lng, name: place.name, mode: 'interesting' };
    }

    if (landOnly) {
      const point = await getRandomLand();
      return { ...point, mode: 'land' };
    }

    return { ...pureRandom(), mode: 'pure' };
  }

  /* ── Random height for fly-in (dramatic variation) ───── */
  function randomAltitude(baseKm = 5000) {
    const factors = [0.3, 0.5, 0.8, 1.0, 1.5, 2.0];
    const f = factors[Math.floor(Math.random() * factors.length)];
    return baseKm * f * 1000; // return in meters
  }

  return { generate, pureRandom, landBiased, getInteresting, randomAltitude };
})();
