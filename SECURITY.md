# Security Best Practices

## API Keys & Environment Variables

### ⚠️ CRITICAL: Never commit `.env` files to Git

This project uses **environment variables** to manage sensitive API tokens:

- `VITE_MAPILLARY_TOKEN` - Mapillary API access token
- `VITE_CESIUM_TOKEN` - Cesium Ion access token

### Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your API keys to `.env` (never commit this file):
   ```
   VITE_MAPILLARY_TOKEN=your_token_here
   VITE_CESIUM_TOKEN=your_token_here
   ```

3. Verify `.env` is in `.gitignore` (it is by default)

### Production Deployment (Vercel)

1. **Do NOT** upload `.env` to GitHub
2. Set environment variables directly in Vercel dashboard:
   - Go to **Settings** → **Environment Variables**
   - Add `VITE_MAPILLARY_TOKEN` and `VITE_CESIUM_TOKEN`
   - Vercel will inject these at build time

3. Verify in Vercel logs that tokens are NOT exposed:
   ```
   ✓ Environment variables loaded
   ```

## Code Security

### ✅ What's Been Fixed

- **Removed hardcoded Cesium token** from `js/map.js`
- **Fixed async/await issue** in `inject-env.js` that was causing build failures
- **Properly initialized CinematicEngine** with viewer reference
- **All tokens loaded from environment variables only**

### 🔒 Security Measures

1. **No secrets in source code** - All tokens come from environment variables
2. **Vite prefix requirement** - Only `VITE_*` variables are exposed to client
3. **Build-time injection** - Tokens injected during build, not at runtime
4. **Client-side only** - This is a frontend-only app; no backend secrets needed

## API Endpoints (Public, No Auth Required)

These are called directly from the browser and don't require secrets:

- **Nominatim** (OpenStreetMap) - Reverse geocoding
- **RestCountries** - Country information
- **Open-Meteo** - Weather data
- **Panoramax** (OpenStreetMap France) - Street-level imagery fallback

## Deployment Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] No `.env` file committed to Git
- [ ] Environment variables set in Vercel dashboard
- [ ] Build succeeds: `npm run build`
- [ ] No API keys visible in `dist/` folder
- [ ] No API keys visible in Vercel build logs

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly by contacting the maintainers privately rather than opening a public issue.

## Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-modes.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
