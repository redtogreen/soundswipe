# Deploying SoundSwipe to Vercel

## Quick Start (5 minutes)

### 1. Install dependencies & test locally

```bash
cd SoundSwipe
npm install
npm run dev
```

Open http://localhost:5173 — the app runs on mock data immediately.

### 2. Push to GitHub

Create a new repo on GitHub, then:

```bash
git init
git add .
git commit -m "Initial SoundSwipe build"
git remote add origin https://github.com/YOUR_USERNAME/soundswipe.git
git push -u origin main
```

### 3. Deploy to Vercel

Option A — Vercel CLI:
```bash
npm i -g vercel
vercel login
vercel
```

Option B — Vercel Dashboard:
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Click Deploy (no build settings needed — Vercel auto-detects Vite)

### 4. Add real SoundCloud data (optional)

1. Register an app at https://soundcloud.com/you/apps/new
2. In your Vercel project: Settings → Environment Variables
3. Add:
   - `SOUNDCLOUD_CLIENT_ID` = your client ID
   - `SOUNDCLOUD_CLIENT_SECRET` = your client secret
   - `SOUNDCLOUD_MAX_FOLLOWERS` = `5000` (default follower cap)
4. Redeploy — the `/api/artists` endpoint will switch from mock to live data automatically.

## Project Structure

```
soundswipe/
├── api/
│   └── artists.js        ← Vercel serverless function (GET /api/artists)
├── src/
│   ├── App.jsx           ← Main state + screen routing
│   ├── index.css         ← All styles (dark theme, animations)
│   ├── components/
│   │   ├── ArtistCard.jsx  ← Swipeable card with gesture handling
│   │   └── Toast.jsx       ← Save confirmation toast
│   ├── screens/
│   │   ├── SplashScreen.jsx
│   │   ├── GenreScreen.jsx
│   │   ├── SwipeScreen.jsx
│   │   ├── ExpandScreen.jsx
│   │   └── SavedScreen.jsx
│   └── data/
│       └── mockArtists.js  ← Placeholder artist data + genre list
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `SOUNDCLOUD_CLIENT_ID` | No | — | SoundCloud app client ID |
| `SOUNDCLOUD_CLIENT_SECRET` | No | — | SoundCloud app client secret |
| `SOUNDCLOUD_MAX_FOLLOWERS` | No | `5000` | Max followers to include an artist |

## Customizing Artist Filters

Edit `api/artists.js`:
- `LABEL_KEYWORDS` — strings that flag an artist as label-affiliated
- `maxFollowers` — follower cap (overridable via env var)
- The query logic in `fetchFromSoundCloud` filters covers/remixes automatically
