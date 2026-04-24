# Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (free tier available)
- Git installed locally
- Node.js 16+ and npm installed

## Step 1: Prepare Your Local Repository

### 1.1 Initialize Git (if not already done)

```bash
cd World-Explorer-main
git init
git add .
git commit -m "Initial commit: World Explorer"
```

### 1.2 Verify `.env` is NOT committed

```bash
git status
```

**You should NOT see `.env` in the list.** If you do:

```bash
git rm --cached .env
git commit -m "Remove .env from tracking"
```

## Step 2: Push to GitHub

### 2.1 Create a new repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Name it `world-explorer` (or your preferred name)
3. **Do NOT initialize with README** (you already have one)
4. Click "Create repository"

### 2.2 Add GitHub remote and push

```bash
git remote add origin https://github.com/YOUR_USERNAME/world-explorer.git
git branch -M main
git push -u origin main
```

### 2.3 Verify on GitHub

Visit your repository URL and confirm all files are there (except `.env`).

## Step 3: Deploy to Vercel

### 3.1 Connect Vercel to GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Paste your GitHub repository URL
4. Vercel will auto-detect it's a Vite project

### 3.2 Configure Environment Variables

**CRITICAL:** Before deploying, set your API keys:

1. In the Vercel import dialog, scroll to "Environment Variables"
2. Add two variables:
   - **Name:** `VITE_MAPILLARY_TOKEN`
     **Value:** Your Mapillary API token
   - **Name:** `VITE_CESIUM_TOKEN`
     **Value:** Your Cesium Ion access token

3. Click "Deploy"

### 3.3 Monitor the build

Vercel will show build progress. Wait for the "✓ Production" badge.

### 3.4 Access your site

Once deployed, you'll get a URL like: `https://world-explorer-abc123.vercel.app`

## Step 4: Verify Deployment

1. Visit your Vercel URL
2. Test all features:
   - Globe loads and renders
   - Search works
   - Random location button works
   - Layers switch properly
   - Street View opens (if Mapillary token is valid)

## Step 5: Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Updating Your Site

After making changes locally:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically rebuild and redeploy.

## Troubleshooting

### Build fails with "Environment variables not found"

**Solution:** Ensure `VITE_MAPILLARY_TOKEN` and `VITE_CESIUM_TOKEN` are set in Vercel dashboard.

### Build succeeds but features don't work

**Solution:** Check browser console (F12) for errors. Likely causes:
- API tokens are invalid or missing
- External APIs (Nominatim, Open-Meteo) are blocked
- CORS issues with third-party services

### "Cannot find module" errors

**Solution:** Ensure `node_modules/` is not committed to Git:

```bash
git status | grep node_modules
```

If it appears, add it to `.gitignore` and remove it:

```bash
echo "node_modules/" >> .gitignore
git rm -r --cached node_modules/
git commit -m "Remove node_modules from tracking"
```

### Local build works but Vercel build fails

**Solution:** Ensure your local `.env` is identical to Vercel environment variables. Test locally:

```bash
npm run build
npm run preview
```

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_MAPILLARY_TOKEN` | Mapillary street imagery API | `MLY\|...` |
| `VITE_CESIUM_TOKEN` | Cesium Ion 3D tiles | `eyJ...` |

## Security Reminders

- ✅ **Never commit `.env` to Git**
- ✅ **Never share API tokens publicly**
- ✅ **Rotate tokens if accidentally exposed**
- ✅ **Use Vercel's environment variable encryption**

## Additional Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Push Guide](https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository)

## Support

For issues or questions:
1. Check the [README.md](./README.md)
2. Review [SECURITY.md](./SECURITY.md)
3. Check browser console for errors (F12)
4. Verify environment variables in Vercel dashboard
