/* ============================================================
   api.js — External API calls: Geocoding, Location Info
   Uses: Nominatim (OSM), RestCountries, Open-Meteo (weather)
   ============================================================ */

const API = (() => {

  const NOMINATIM = 'https://nominatim.openstreetmap.org';
  const RESTCOUNTRIES = 'https://restcountries.com/v3.1';
  const OPENMETEO = 'https://api.open-meteo.com/v1/forecast';

  /* --- Cache to avoid hammering APIs ---------------------- */
  const cache = new Map();

  function cacheKey(...args) {
    return args.join('|');
  }

  async function fetchWithCache(url, key) {
    if (cache.has(key)) return cache.get(key);
    try {
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en-US,en' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache.set(key, data);
      return data;
    } catch (e) {
      console.warn('[API]', e);
      return null;
    }
  }

  /* --- Reverse geocode: lat/lng → place name -------------- */
  async function reverseGeocode(lat, lng) {
    const key = cacheKey('rev', lat.toFixed(4), lng.toFixed(4));
    const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    const data = await fetchWithCache(url, key);
    if (!data || data.error) return null;

    return {
      display: data.display_name,
      name: data.name || data.address?.city || data.address?.town
            || data.address?.village || data.address?.county || 'Unknown',
      country: data.address?.country || '',
      countryCode: (data.address?.country_code || '').toUpperCase(),
      state: data.address?.state || '',
      city: data.address?.city || data.address?.town || data.address?.village || '',
      type: data.type || data.addresstype || '',
      osm_id: data.osm_id,
    };
  }

  /* --- Forward geocode: search term → locations ----------- */
  async function searchPlaces(query, limit = 6) {
    const key = cacheKey('fwd', query, limit);
    const url = `${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1`;
    const data = await fetchWithCache(url, key);
    if (!data) return [];

    return data.map(r => ({
      name: r.display_name.split(',')[0],
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      country: r.address?.country || '',
      type: r.type,
      importance: r.importance,
    }));
  }

  /* --- Country info from RestCountries ------------------- */
  async function getCountryInfo(countryCode) {
    if (!countryCode || countryCode.length !== 2) return null;
    const key = cacheKey('country', countryCode);
    const url = `${RESTCOUNTRIES}/alpha/${countryCode}`;
    const data = await fetchWithCache(url, key);
    if (!data || !data[0]) return null;

    const c = data[0];
    return {
      name: c.name?.common || '',
      official: c.name?.official || '',
      capital: c.capital?.[0] || '',
      population: c.population || 0,
      area: c.area || 0,
      region: c.region || '',
      subregion: c.subregion || '',
      languages: Object.values(c.languages || {}).join(', '),
      currencies: Object.values(c.currencies || {}).map(v => v.name).join(', '),
      flag: c.flag || '',
      flagUrl: c.flags?.svg || c.flags?.png || '',
      timezone: c.timezones?.[0] || '',
    };
  }

  /* --- Weather at location -------------------------------- */
  async function getWeather(lat, lng) {
    const key = cacheKey('weather', lat.toFixed(2), lng.toFixed(2));
    const url = `${OPENMETEO}?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=precipitation_probability`;
    const data = await fetchWithCache(url, key);
    if (!data?.current_weather) return null;

    const cw = data.current_weather;
    const codes = {
      0:'Clear', 1:'Mainly Clear', 2:'Partly Cloudy', 3:'Overcast',
      45:'Fog', 48:'Icy Fog', 51:'Light Drizzle', 53:'Drizzle', 55:'Heavy Drizzle',
      61:'Light Rain', 63:'Rain', 65:'Heavy Rain',
      71:'Light Snow', 73:'Snow', 75:'Heavy Snow',
      80:'Showers', 81:'Heavy Showers', 82:'Violent Showers',
      95:'Thunderstorm', 96:'Hail Storm', 99:'Severe Hail'
    };

    const emojis = {
      0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
      45:'🌫️', 48:'🌫️', 51:'🌦️', 53:'🌦️', 55:'🌧️',
      61:'🌧️', 63:'🌧️', 65:'⛈️',
      71:'🌨️', 73:'❄️', 75:'🌨️',
      80:'🌦️', 81:'🌧️', 82:'⛈️',
      95:'⛈️', 96:'⛈️', 99:'⛈️'
    };

    return {
      temp: cw.temperature,
      windspeed: cw.windspeed,
      weatherCode: cw.weathercode,
      condition: codes[cw.weathercode] || 'Unknown',
      emoji: emojis[cw.weathercode] || '🌡️',
      isDay: cw.is_day === 1,
    };
  }

  /* --- Check if coordinates are on land (simple poly) ---- */
  // We use a lightweight approach via Nominatim reverse geocode result
  async function isOnLand(lat, lng) {
    const data = await reverseGeocode(lat, lng);
    if (!data) return false;
    // If we got a country code, it's on land
    return !!data.countryCode && data.countryCode.length === 2;
  }

  /* --- Interesting places list (curated) ----------------- */
  const INTERESTING = [
    // Natural wonders
    { name: 'Grand Canyon', lat: 36.1069, lng: -112.1129 },
    { name: 'Sahara Desert', lat: 23.4162, lng: 25.6628 },
    { name: 'Amazon Rainforest', lat: -3.4653, lng: -62.2159 },
    { name: 'Himalayas', lat: 27.9878, lng: 86.9250 },
    { name: 'Great Barrier Reef', lat: -18.2871, lng: 147.6992 },
    { name: 'Victoria Falls', lat: -17.9243, lng: 25.8572 },
    { name: 'Patagonia', lat: -50.9423, lng: -73.4068 },
    { name: 'Namib Desert', lat: -24.7636, lng: 15.9366 },
    { name: 'Fjords of Norway', lat: 61.0, lng: 6.5 },
    { name: 'Gobi Desert', lat: 42.5882, lng: 103.0562 },
    // Cities
    { name: 'New York City', lat: 40.7128, lng: -74.0060 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
    { name: 'Paris', lat: 48.8566, lng: 2.3522 },
    { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
    { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
    { name: 'Cairo', lat: 30.0444, lng: 31.2357 },
    { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Moscow', lat: 55.7558, lng: 37.6173 },
    { name: 'Cape Town', lat: -33.9249, lng: 18.4241 },
    // Historic sites
    { name: 'Machu Picchu', lat: -13.1631, lng: -72.5450 },
    { name: 'Angkor Wat', lat: 13.4125, lng: 103.8670 },
    { name: 'Pyramids of Giza', lat: 29.9792, lng: 31.1342 },
    { name: 'Stonehenge', lat: 51.1789, lng: -1.8262 },
    { name: 'Colosseum', lat: 41.8902, lng: 12.4922 },
    { name: 'Chichen Itza', lat: 20.6843, lng: -88.5678 },
    { name: 'Petra', lat: 30.3285, lng: 35.4444 },
    { name: 'Acropolis', lat: 37.9715, lng: 23.7267 },
    { name: 'Easter Island', lat: -27.1127, lng: -109.3497 },
    { name: 'Great Wall of China', lat: 40.4319, lng: 116.5704 },
  ];

  function getRandomInteresting() {
    return INTERESTING[Math.floor(Math.random() * INTERESTING.length)];
  }

  function getAllInteresting() {
    return INTERESTING;
  }

  return {
    reverseGeocode,
    searchPlaces,
    getCountryInfo,
    getWeather,
    isOnLand,
    getRandomInteresting,
    getAllInteresting,
  };
})();
