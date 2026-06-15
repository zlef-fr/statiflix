# Statiflix — Chrome Web Store submission kit

Everything needed to publish. Upload `statiflix-2.0.0.zip`, then copy each field below into
the Developer Dashboard (https://chrome.google.com/webstore/devconsole). A one-time $5
developer registration fee applies to the account.

---

## 1. Package to upload

- **File:** `store/statiflix-2.0.0.zip` (manifest.json at the zip root — store-ready)
- **Manifest version:** 3 · **Version:** 2.0.0

---

## 2. Store listing

**Item name** (≤45 chars)
```
Statiflix — Netflix Viewing, Quantified
```

**Summary / short description** (≤132 chars)
```
Turn your Netflix watch history into a private, Wrapped-style dashboard — genres, binge hours, abandoned shows. 100% local.
```

**Category:** `Tools`
**Language:** English

**Detailed description**
```
Netflix collects rich data about everything you watch — and gives you almost none of it back. Statiflix flips that. It reads your own viewing activity, right in your browser, and turns it into a beautiful personal-analytics dashboard: the streaming "Wrapped" Netflix never made.

Open the dashboard and instantly see your total hours, top shows and movies (with real artwork), the genres you actually watch, a day-by-hour heatmap of when you binge, your longest streak, your biggest binge day, and the shows you abandoned partway through. Drill from any year down to a single day and the exact titles you watched.

WHAT YOU GET
• Headline stats — hours watched, titles, episodes, movies, peak hour & day, longest streak
• Most-watched rail with real Netflix artwork
• Genre breakdown, pulled straight from Netflix
• Day × hour viewing heatmap — see your real rhythm
• Abandoned shows & movies — what you quit, and how far you got
• "Across the year" you can navigate and drill: year → month → day → titles
• Export your data as JSON or CSV, or a shareable recap card (PNG)

ON YOUR PHONE, ENCRYPTED
Scan one QR code to open your stats on mobile. The hand-off is end-to-end encrypted — the decryption key lives only inside the QR code, and the relay only ever stores ciphertext it cannot read. The link auto-expires after 24 hours.

PRIVATE BY ARCHITECTURE
• Your history is read and analysed locally, in your browser
• No account, no sign-up, no analytics, no ad IDs, no tracking
• By default nothing about your viewing ever leaves your device
• The optional mobile sync only ever transmits end-to-end-encrypted data
• Open source — every line is auditable

Statiflix runs only on netflix.com (to read your activity) and statiflix.zlef.fr (only if you use the optional mobile sync). Available in English and French.

Note: Statiflix is an independent project and is not affiliated with, endorsed by, or sponsored by Netflix. "Netflix" is a trademark of its respective owner, used here only to describe what the extension works with.
```

---

## 3. Privacy tab (required)

**Single purpose description**
```
Statiflix reads the signed-in user's own Netflix viewing history and presents it back to them as a private personal-analytics dashboard (totals, genres, viewing-time patterns, abandoned shows), with an optional end-to-end-encrypted view on mobile.
```

**Permission justifications**

- `storage`
```
Stores the user's harvested viewing history and computed stats locally on the device so the dashboard loads instantly without re-fetching. This data stays on the device and is never transmitted.
```

- `tabs`
```
Used to open the user's own Netflix viewing-activity page in a background tab during a refresh, and to open the Statiflix dashboard. No browsing data from other tabs is read.
```

- `scripting`
```
Injects the analysis script into the user's own netflix.com tab so it can read their viewing activity through Netflix's own internal API, using the session already in the browser. It runs only on netflix.com and only when the user clicks "Analyze".
```

- Host permission `*://*.netflix.com/*`
```
Statiflix reads the signed-in user's own viewing activity and the artwork/genre metadata for those titles from Netflix. It runs on no other browsing sites.
```

- Host permission `https://statiflix.zlef.fr/*`
```
Used ONLY for the optional features the user explicitly triggers: the end-to-end-encrypted mobile sync (uploads ciphertext the server cannot read) and, as a fallback, looking up artwork by title. It is never contacted while simply viewing the dashboard locally.
```

**Remote code:** No, I am not using remote code. (All code is included in the package.)

**Data usage — disclosures:**
- Does your item collect or use user data? → **Yes**
- Personally identifiable information: **No**
- Health information: **No**
- Financial / payment information: **No**
- Authentication information: **No**
- Personal communications: **No**
- Location: **No**
- Web history: **Yes** — the user's Netflix viewing history (titles and timestamps)
- User activity: **Yes** — what and when the user watched on Netflix
- Website content: **No**

For each "Yes": the data is processed locally to build the user's own dashboard. It is only
transmitted if the user opts into the mobile sync, and then only as end-to-end-encrypted
ciphertext the server cannot read. It is never sold or used for any unrelated purpose.

**Privacy policy URL**
```
https://statiflix.zlef.fr/privacy
```

**Certifications (check all three):**
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## 4. Graphic assets (in store/assets/)

| Asset | File | Size | Required |
|-------|------|------|----------|
| Store icon | `store-icon-128.png` | 128×128 | ✅ required |
| Screenshot 1 (hero) | `screenshot-1-hero.png` | 1280×800 | ✅ at least 1 |
| Screenshot 2 (dashboard) | `screenshot-2-dashboard.png` | 1280×800 | recommended |
| Screenshot 3 (insights) | `screenshot-3-insights.png` | 1280×800 | optional |
| Screenshot 4 (mobile E2EE) | `screenshot-4-mobile.png` | 1280×800 | optional |
| Screenshot 5 (privacy) | `screenshot-5-privacy.png` | 1280×800 | optional |
| Small promo tile | `promo-small-440x280.png` | 440×280 | optional (recommended) |
| Marquee promo tile | `promo-marquee-1400x560.png` | 1400×560 | optional |

Screenshots use mock titles (no real personal viewing data).

---

## 5. Distribution

- **Visibility:** Public
- **Regions:** All regions
- **Pricing:** Free
- **Mature content:** No

---

## 6. Support / homepage

- **Homepage / website:** https://statiflix.zlef.fr
- **Support email:** statiflix@zlef.fr

---

## 7. Notes before publishing

- Bump `version` in `manifest.json` and re-zip for every future update (the store rejects re-uploads with the same version).
- Re-build the upload zip after code changes: `npm run zip` then copy `public/statiflix.zip` to `store/statiflix-2.0.0.zip`, or:
  `cd extension && zip -rq ../store/statiflix-2.0.0.zip . -x ".*"`
- Re-generate assets: `NODE_PATH=/usr/lib/node_modules node store/gen-assets.js`
- Review typically takes a few hours to a few days. The viewing-history permissions may draw
  extra review — the privacy policy and the "data processed locally / E2EE when synced"
  framing above are written to address that.
```
