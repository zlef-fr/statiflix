# Statiflix — Your Netflix Viewing, Quantified

A free, open-source Chrome extension that turns your Netflix watch history into a
private, *Spotify-Wrapped*-style dashboard — rewatches, abandoned shows, genre
breakdowns, and a day×hour heatmap of when you actually binge. With an optional
**end-to-end-encrypted** mobile companion you pair by scanning a single QR code.

Live: **https://statiflix.zlef.fr** · Mobile viewer: `https://statiflix.zlef.fr/app`

Not affiliated with Netflix.

## How it works

1. The extension reads your *own* `viewingactivity` from Netflix's internal Shakti
   API, using the session already in your browser. Nothing is scraped from brittle
   DOM; nothing leaves the machine.
2. `js/stats.js` computes everything locally — totals, rewatch/abandon heuristics,
   heatmaps, streaks, binge day, top titles.
3. The dashboard (`dashboard.html`) renders a Netflix-themed view with drill-downs.
4. Optional **sync**: the snapshot is AES-256-GCM encrypted in the browser; only the
   ciphertext is uploaded to the relay (`/api/sync`, 24h TTL). The key lives only in
   the QR/URL fragment (`/app#<id>.<key>`) and never reaches the server — a true
   zero-knowledge relay.

## Privacy

- History parsed 100% client-side; stored only in `chrome.storage.local`.
- No account, no tracking, no IP logging.
- Mobile relay stores opaque ciphertext only; auto-expires in 24h.
- Genre/cover enrichment is opt-in and sends **title strings only** (see below).

## Architecture

```
extension/                 MV3 Chrome extension
  manifest.json
  content.js               harvests Netflix viewing activity (Shakti API)
  sw.js                    background (first-run)
  popup.{html,css,js}      trigger analyze / open dashboard
  dashboard.html
  js/i18n.js               EN/FR dictionary (shared)
  js/stats.js              pure stats engine
  js/store.js              chrome.storage wrapper
  js/crypto.js             AES-GCM E2EE for the hand-off
  js/render.js             DOM-safe component builders (shared)
  js/enrich.js             optional TMDB client
  js/sync.js               encrypt + QR + relay upload
  js/dashboard.js          controller
  vendor/qrcode.min.js
server.js                  landing + PWA + relay + enrichment proxy (port 10047)
lib/relay.js               zero-knowledge ciphertext store (JSON, TTL)
lib/tmdb.js                optional TMDB proxy + disk cache
public/                    landing (index.html), PWA (app/), privacy
```

## Enrichment (optional)

Set a TMDB v3 API key to enable real poster art + genre breakdowns:

```bash
TMDB_API_KEY=xxxx docker compose up -d --build
```

Without a key, Statiflix uses deterministic gradient posters (fully private,
offline) and hides the genre card. The extension auto-detects availability via
`/api/enrich/status`.

## Run

```bash
docker compose up -d --build      # serves on 127.0.0.1:10047
npm run zip                       # rebuild public/statiflix.zip from extension/
```

i18n: English (default) + French, auto-detected and switchable everywhere.
