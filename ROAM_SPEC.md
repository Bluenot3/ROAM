# ROAM — Full Technical Specification
> Last updated: 2026-03-28 | Version 1.0.0 | Status: Pre-launch (localhost)

---

## Table of Contents

1. [What ROAM Does](#1-what-roam-does)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Frontend — Screens & Components](#4-frontend--screens--components)
5. [Backend — API Routes](#5-backend--api-routes)
6. [Authentication System](#6-authentication-system)
7. [Database Schema (Supabase)](#7-database-schema-supabase)
8. [Payment System (Stripe)](#8-payment-system-stripe)
9. [Scanning Engine (Playwright)](#9-scanning-engine-playwright)
10. [Export System](#10-export-system)
11. [AI Integration (Gemini)](#11-ai-integration-gemini)
12. [Real-time Updates (SSE)](#12-real-time-updates-sse)
13. [Environment Variables & Keys](#13-environment-variables--keys)
14. [File Storage](#14-file-storage)
15. [Known Issues & Production Concerns](#15-known-issues--production-concerns)
16. [Vercel Hosting — Critical Incompatibilities](#16-vercel-hosting--critical-incompatibilities)
17. [Pre-launch Checklist](#17-pre-launch-checklist)

---

## 1. What ROAM Does

ROAM is a SaaS tool that takes any public website URL and automatically:

1. **Crawls** every page using Firecrawl API + Playwright BFS fallback
2. **Screenshots** every page at full resolution (1440×900, full-page)
3. **Records** a video walkthrough of the entire site (WebM format via Playwright)
4. **Curates** the sequence using AI (Google Gemini 1.5 Flash)
5. **Exports** as ZIP (PNGs), PDF (branded report), or WebM video

Target users: designers, marketers, founders, agencies — anyone who needs to document, present, or audit a website.

**Business model:** 1 free scan → ZEN+ subscription at $15/month (Stripe) for unlimited scans, video exports, and canvas tools. Promo code (`Oleksa3993`) bypasses the paywall entirely.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│   React 19 SPA  (TypeScript, Vite, Tailwind v4, Lucide icons)       │
└─────────────────────────┬───────────────────────────────────────────┘
                          │  HTTP / SSE  (all on :3001)
┌─────────────────────────▼───────────────────────────────────────────┐
│                    EXPRESS BACKEND  (Node.js ESM)                    │
│   backend.mjs — single file, port 3001                              │
│   • Serves frontend dist (express.static)                           │
│   • REST API  /api/*                                                 │
│   • SSE stream /api/events/:id                                       │
│   • Screenshot file server /screenshots/*                            │
│   • Playwright scan runner (async, in-process)                      │
└────────┬──────────────┬────────────────┬────────────────────────────┘
         │              │                │
    ┌────▼────┐   ┌─────▼──────┐  ┌─────▼──────┐
    │Supabase │   │   Stripe   │  │ Firecrawl  │
    │Auth+DB  │   │  Checkout  │  │  Page Map  │
    └─────────┘   └────────────┘  └────────────┘
                                         │
                                  ┌──────▼──────┐
                                  │  Playwright  │
                                  │  Chromium   │
                                  │  (local)    │
                                  └─────────────┘
```

**Key architectural decision:** The backend is a single monolithic Express server that handles auth proxying, Stripe, Playwright scans, file serving, and frontend serving all in one process. Simple, self-contained, but has scaling implications (see §16).

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 6.4.1 | Build tool + dev server |
| Tailwind CSS | 4.2.2 | Utility CSS (minimal usage — mostly inline styles) |
| Lucide React | 1.7.0 | Icon library |
| DM Sans + DM Mono | — | Google Fonts (loaded via CSS @import) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | ESM | Runtime |
| Express | 4.18.2 | HTTP server |
| Playwright | 1.40.0 | Headless Chromium — screenshots + video |
| UUID | 9.0.0 | Session ID generation |
| @google/generative-ai | 0.21.0 | Gemini AI integration |
| archiver | 7.0.1 | ZIP export |
| pdf-lib | 1.17.1 | PDF export |
| cors | 2.8.5 | Cross-origin headers |

### External Services
| Service | Purpose | Key |
|---|---|---|
| Supabase | Auth (JWT) + PostgreSQL database | `wpljjicijfzbuvfpnchm` |
| Stripe | Subscription billing (live mode) | `sk_live_51OHb71...` |
| Firecrawl | Website page discovery/mapping | `fc-a966de3f...` |
| Google Gemini | AI canvas narration | `gemini-1.5-flash` |

---

## 4. Frontend — Screens & Components

### Screens (9 total)

| Screen | Route Key | Description |
|---|---|---|
| `LoginScreen` | shown when `!user` | Split-panel: animated scanner hero (left) + auth form (right) |
| `HomeScreen` | `home` | Split-panel: live scanner hero (left) + URL input + features (right) |
| `ScanScreen` | `scan` | Real-time scan progress with SSE, page discovery, screenshot feed |
| `GalleryScreen` | `gallery` | Grid of captured screenshots, filterable by category |
| `CanvasScreen` | `canvas` | Timeline editor with AI narration, clip reordering |
| `ExportScreen` | `export` | Export format selector (ZIP / PDF / Video) |
| `HistoryScreen` | `history` | List of all past scans |
| `AnalyticsScreen` | `analytics` | Charts for scan history (placeholder data) |
| `TemplatesScreen` | `templates` | Preset scan configurations |
| `SettingsScreen` | `settings` | Account info, subscription status, logout |

### Components

| Component | File | Description |
|---|---|---|
| `Sidebar` | `components/Sidebar.tsx` | 62px vertical nav: compass logo, nav items w/ labels, ZEN+ badge, avatar |
| `UpgradeModal` | `components/UpgradeModal.tsx` | Paywall modal: ZEN+ features grid, Stripe checkout redirect, promo input |
| `ToastContainer` | `components/ToastContainer.tsx` | Top-right toast notifications (success/error/info) |
| `ScreenshotCard` | `components/ScreenshotCard.tsx` | Individual screenshot tile used in GalleryScreen |

### Context

| Context | File | Exposes |
|---|---|---|
| `AuthContext` | `contexts/AuthContext.tsx` | `user`, `token`, `loading`, `login`, `register`, `logout`, `applyPromo`, `refreshUser`, `canScan`, `isPro` |

### Navigation
- **No router library** — custom `navigate(screen, meta?)` function passed as props
- Sidebar only renders on non-home screens (`showSidebar = screen !== 'home'`)
- Keyboard shortcuts: `h`=history, `s`=scan, `g`=gallery, `c`=canvas, `e`=export, `a`=analytics, `t`=templates, `Escape`=home
- Screen transitions: `screen-enter` CSS class — `fade-up` animation (0.35s cubic-bezier)

### Key UI Details
- **Color palette:** Deep dark — `#07070d` bg, `#6366f1` accent (indigo), `#8b5cf6` accent-2 (violet)
- **Fonts:** DM Sans (UI), DM Mono (URLs, code, counters)
- **Login page scanner slides:** stripe.com, tesla.com, zenai.world, anthropic.com, nvidia.com — cycles every 4.5s
- **Home page scanner slides:** Same 5 sites — cycles every 5s
- **Scan % counter:** Live animated, per-slide accent color, pulse dot
- **Corner brackets:** 4-corner SVG brackets on scanner viewport, glowing in slide color
- **Dual scan lines:** Primary (2px, RGB gradient + heavy glow) + secondary trailing (1px, 60% opacity)
- **Thumbnail strip:** Pages pop in with `cubic-bezier(0.34, 1.56, 0.64, 1)` spring animation
- **Grain overlay:** SVG fractalNoise texture on `body::before`, z-index 9999
- **Animated orbs:** 3 blurred gradient orbs drifting in background
- **Spinning gradient border:** on focused URL input (`conic-gradient`, `@property --angle`)
- **ZEN+ badge:** Gradient pill with Zap icon in sidebar when `isPro === true`

---

## 5. Backend — API Routes

All routes run on `http://localhost:3001`. Frontend served from same origin.

### Auth Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Creates Supabase user + returns JWT |
| POST | `/api/auth/login` | None | Validates credentials, returns JWT |
| GET | `/api/auth/me` | ✓ | Returns current user object |
| POST | `/api/auth/logout` | ✓ | Invalidates Supabase session |
| POST | `/api/auth/promo` | ✓ | Validates promo code, sets `has_promo=true` |

### Stripe Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/stripe/config` | None | Returns publishable key |
| POST | `/api/stripe/checkout` | ✓ | Creates Stripe Checkout Session, returns URL |
| GET | `/api/stripe/verify?cs=` | ✓ | Verifies checkout completion, updates DB |
| POST | `/api/stripe/webhook` | None (Stripe sig) | Handles subscription lifecycle events |

### Scan Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/scan` | ✓ | Starts a scan, returns `sessionId`. Runs async. |
| GET | `/api/scan/:id` | None | Returns session JSON (status, screenshots, etc.) |
| GET | `/api/sessions` | None | Lists all sessions (newest first) |
| POST | `/api/sessions/:id/continue` | None | Resumes scan after preview pause |
| GET | `/api/events/:id` | None | SSE stream for real-time scan events |

### Other Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/ai` | None | Sends prompt to Gemini 1.5 Flash, returns text |
| POST | `/api/export/:id` | None | Streams ZIP / PDF / WebM download |
| GET | `/screenshots/*` | None | Serves screenshot PNGs and WebM videos (range requests supported) |
| GET | `/*` | None | Serves frontend `dist/index.html` (SPA fallback) |

### `requireAuth` Middleware
Every protected route calls `GET /auth/v1/user` on Supabase to verify the JWT on every request. No local token cache. Safe but adds ~100–200ms latency per authenticated request.

---

## 6. Authentication System

**Implementation:** No auth SDK — pure Node.js `https` module calling Supabase REST/Auth APIs directly.

### Flow — Register
```
Client → POST /api/auth/register
  → Supabase POST /auth/v1/signup
  → Supabase trigger auto_confirm_user() fires → sets email_confirmed_at immediately
  → Supabase trigger handle_new_user() fires → creates profiles row
  → Backend returns { token, user }
  → Frontend stores token in localStorage['roam_token']
```

### Flow — Login
```
Client → POST /api/auth/login
  → Supabase POST /auth/v1/token?grant_type=password
  → Backend fetches /rest/v1/profiles for user data
  → Returns { token: <supabase_jwt>, user: { id, email, freeScansUsed, hasPromo, subscriptionActive, stripeCustomerId } }
```

### Flow — Every Protected Request
```
Client sends Authorization: Bearer <jwt>
  → requireAuth middleware → Supabase GET /auth/v1/user
  → If 200 → fetch profile row → attach req.user + req.token → next()
  → If not 200 → 401
```

### Token Storage
- `localStorage.setItem('roam_token', jwt)` — persists across browser sessions
- Token validity: Supabase JWT, 1-hour expiry by default (auto-refresh not implemented)
- Logout: calls `/auth/v1/logout` + removes from localStorage

### Session Persistence
- `AuthContext` calls `GET /api/auth/me` on mount to rehydrate session from stored token
- If token expired → 401 → user cleared → login screen shown

---

## 7. Database Schema (Supabase)

**Project:** `wpljjicijfzbuvfpnchm.supabase.co`

### Table: `public.profiles`

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | UUID | — | References `auth.users(id)`, CASCADE delete |
| `email` | TEXT | — | User's email |
| `free_scans_used` | INTEGER | 0 | Counter for free scans consumed |
| `has_promo` | BOOLEAN | false | Promo code applied → unlimited access |
| `subscription_active` | BOOLEAN | false | Active Stripe subscription |
| `stripe_customer_id` | TEXT | NULL | Stripe customer ID |
| `created_at` | TIMESTAMPTZ | NOW() | Row creation time |
| `updated_at` | TIMESTAMPTZ | NOW() | Auto-updated by trigger |

### Row-Level Security (RLS)
- **Enabled** on `profiles`
- Users can SELECT their own row only
- Users can UPDATE their own row only
- INSERT allowed for `authenticated` role (for trigger)
- Service role key bypasses RLS (used by Stripe webhook)

### Triggers

| Trigger | Event | Function | Description |
|---|---|---|---|
| `auto_confirm_on_signup` | AFTER INSERT on `auth.users` | `auto_confirm_user()` | Sets `email_confirmed_at = NOW()` — no email verification needed |
| `on_auth_user_created` | AFTER INSERT on `auth.users` | `handle_new_user()` | Creates matching `profiles` row |
| `set_updated_at` | BEFORE UPDATE on `profiles` | `set_updated_at()` | Auto-refreshes `updated_at` |

### RPC Functions

| Function | Arguments | Description |
|---|---|---|
| `increment_scan_count` | `user_id UUID` | Atomically increments `free_scans_used` by 1 — avoids race conditions |

---

## 8. Payment System (Stripe)

**Mode: LIVE** (real money transactions)

### Keys
| Key | Value |
|---|---|
| Publishable | `pk_live_51OHb71E1gATQ833k...` |
| Secret | `sk_live_51OHb71E1gATQ833k...` |

### Product
| Field | Value |
|---|---|
| Product ID | `prod_UEWSaTrGsJteff` |
| Product Name | ZEN Plus |
| Price ID | `price_1TG3PaE1gATQ833koTJROJys` |
| Price | $15.00 / month (recurring) |
| Mode | Subscription |

### Checkout Flow
```
User clicks "Upgrade to ZEN+" in UpgradeModal
  → POST /api/stripe/checkout
    → Creates/finds Stripe Customer (by email)
    → Saves stripe_customer_id to profiles table
    → Creates Checkout Session (hosted page)
    → Returns { url, sessionId }
  → Frontend redirects to checkout.stripe.com/c/pay/cs_live_...
    → User enters card details on Stripe's hosted page
  → Stripe redirects to APP_URL/?upgrade=success&cs={CHECKOUT_SESSION_ID}
    → Frontend calls GET /api/stripe/verify?cs=...
    → Backend verifies session.payment_status === 'paid'
    → Sets subscription_active = true in profiles
    → refreshUser() called → isPro becomes true
    → Toast: "ZEN+ activated! Unlimited scans unlocked."
```

### Webhook (Subscription Lifecycle)
- Endpoint: `POST /api/stripe/webhook`
- **⚠️ NOT registered in Stripe Dashboard yet** — must be done after deployment
- **⚠️ Webhook signature verification NOT implemented** — currently parses raw body without `stripe-signature` validation
- Handles: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Uses `useService: true` to bypass RLS → requires `SUPABASE_SERVICE_KEY` env var
- **⚠️ Service key currently falls back to anon key** → RLS will block webhook DB writes

### Promo Code
- Code: `Oleksa3993` (hardcoded in backend)
- Effect: Sets `has_promo = true` → user bypasses paywall entirely, unlimited scans
- Applied: Either at login (stored in `localStorage['roam_pending_promo']` then applied after auth) or via UpgradeModal promo input
- Can be applied without paying

---

## 9. Scanning Engine (Playwright)

The core product capability. All scanning is synchronous within the Node.js process.

### Scan Pipeline

```
POST /api/scan  →  runScan(sessionId, url, settings)  [async, fires and forgets]
  │
  ├─1. Discover pages via Firecrawl API (POST /v1/map)
  │     Filters: same hostname, no assets/sitemaps, sorted by depth
  │     Falls back to Playwright BFS if Firecrawl returns < 5 pages
  │
  ├─2. Playwright BFS fallback (if needed)
  │     Tries sitemap.xml first → parses <loc> tags
  │     Falls back to DOM link crawl (BFS, same-origin only)
  │
  ├─3. Launch Chromium (headless: true, 1440×900 viewport)
  │     Playwright auto-detects or uses CHROMIUM_PATH
  │
  ├─4. For each discovered page:
  │     • navigate (domcontentloaded, 30s timeout)
  │     • wait waitTime ms (default 1500ms)
  │     • smooth scroll (20 steps, 80ms intervals) for video effect
  │     • scroll back to top
  │     • full-page PNG screenshot
  │     • emit SSE event: screenshot_captured
  │
  ├─5. After first 7 pages: emit preview_ready, pause
  │     Frontend shows captured screenshots, user selects remaining pages
  │     POST /api/sessions/:id/continue resumes
  │
  ├─6. Video: recorded throughout via Playwright context.recordVideo
  │     Format: WebM (VP8)
  │     Finalized after context.close()
  │
  └─7. emit scan_complete → session.status = 'complete'
```

### Scan Settings

| Setting | Default | Description |
|---|---|---|
| `maxPages` | 20 | Maximum pages to scan |
| `primaryOnly` | false | Only top-level pages (depth ≤ 1) |
| `viewportWidth` | 1440 | Browser viewport width |
| `viewportHeight` | 900 | Browser viewport height |
| `fullPage` | true | Full-page screenshots (scroll height) |
| `recordVideo` | true | Record WebM walkthrough |
| `waitTime` | 1500 | ms to wait after page load |
| `scrollForScreenshot` | true | Smooth scroll before capture |

### Page Discovery — Firecrawl
- API: `https://api.firecrawl.dev/v1/map`
- Key: `fc-a966de3f9ea84def93ed2fb941861e02`
- Requests up to `maxPages * 2` URLs (capped at 100)
- Filters: same hostname (www. variants accepted), excludes XML/PDF/assets/sitemaps
- Sorts by URL depth (root first)

### Chromium Path Resolution
Backend tries these paths in order:
1. `C:\pw-browsers\chromium_headless_shell-1208\...` (custom location)
2. `C:\pw-browsers\chromium-1208\...`
3. Standard `AppData\Local\ms-playwright\...` paths
4. Playwright auto-detect (fallback)

### Session Data Structure
```json
{
  "id": "uuid",
  "url": "https://example.com",
  "status": "pending | running | preview_ready | complete | error",
  "settings": { ... },
  "screenshots": [
    {
      "id": "uuid",
      "filename": "uuid.png",
      "url": "https://example.com/page",
      "title": "Page Title",
      "webPath": "/screenshots/{sessionId}/{uuid}.png",
      "category": "Landing | Product | Blog | Docs | About | Page",
      "depth": 0,
      "index": 0,
      "capturedAt": "ISO timestamp"
    }
  ],
  "videoPath": "/screenshots/{sessionId}/{video}.webm",
  "discoveredPages": [ ... ],
  "remainingPages": [ ... ],
  "userId": "supabase-user-uuid",
  "createdAt": "ISO timestamp"
}
```

Sessions are stored:
- **In-memory:** `Map<sessionId, session>` (fast access)
- **On disk:** `sessions/{sessionId}/session.json` (persists across restarts)
- **Screenshots:** `sessions/{sessionId}/{uuid}.png`
- **Video:** `sessions/{sessionId}/{random}.webm`

---

## 10. Export System

**Endpoint:** `POST /api/export/:id`
Body: `{ type: 'zip' | 'pdf' | 'video', selected: [screenshotId, ...] }`

### ZIP Export
- Streams response as `application/zip`
- Contains: all selected PNGs (renamed `{title}_{index}.png`) + WebM video if present
- Uses `archiver` with zlib level 6 compression
- Filename: `shot-export-{8chars}.zip`

### PDF Export
- Uses `pdf-lib` (pure JS, no external tools)
- Page size: 960×600 pts (16:10 ratio)
- Dark background: `rgb(0.05, 0.05, 0.08)`
- Each screenshot scaled to fit with 40px padding, centered
- Caption bar: page title (Helvetica Bold 13pt) + URL (9pt) + category tag
- Filename: `shot-export-{8chars}.pdf`

### Video Export
- Streams the Playwright-recorded WebM file
- Format: `video/webm`
- Range request support (for browser video players)
- Filename: `shot-walkthrough-{8chars}.webm`

---

## 11. AI Integration (Gemini)

**Endpoint:** `POST /api/ai`
Body: `{ prompt: string, context?: object }`

- Model: `gemini-1.5-flash`
- Key: `AQ.Ab8RN6KSwHakIU85ExKw6q1CxvU1Jhtrct2LtsHlEmJMVhxxqw`
- Role: AI video director for CanvasScreen — helps users reorder clips, suggest pacing, narrate sequences
- Prompt prefix: `"You are an AI video director for the Shot app..."`
- **Fallback:** If Gemini fails, returns one of 3 hardcoded plausible AI-sounding responses (no error shown to user)

---

## 12. Real-time Updates (SSE)

**Endpoint:** `GET /api/events/:id`
`Content-Type: text/event-stream`

### Events Emitted

| Event | Payload | Description |
|---|---|---|
| `log` | `{ msg: string }` | Debug/progress log message |
| `pages_discovered` | `{ pages, total }` | Initial page list from discovery |
| `page_start` | `{ url, index }` | About to navigate to page |
| `screenshot_captured` | `{ screenshot, index, total }` | New screenshot ready |
| `page_error` | `{ url, error }` | A page failed to capture |
| `preview_ready` | `{ screenshots, remainingPages, previewCount }` | Pause point after first 7 pages |
| `video_ready` | `{ videoPath }` | Video file saved |
| `scan_complete` | `{ screenshots, videoPath, totalPages, totalScreenshots }` | All done |
| `error` | `{ message }` | Fatal scan error |

### Features
- **Late-join replay:** SSE handler replays all past events from session state when a client connects mid-scan (important for page refresh during scan)
- **Heartbeat:** `: heartbeat\n\n` every 15 seconds to keep connection alive through proxies
- **Client tracking:** `Map<sessionId, Set<Response>>` — multiple browser tabs can watch same scan

---

## 13. Environment Variables & Keys

### Currently Hardcoded in `backend.mjs` (must externalize before open-sourcing)

| Variable | Current Value | Should Be |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_51OHb71...` | `process.env.STRIPE_SECRET_KEY` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_51OHb71...` | `process.env.STRIPE_PUBLISHABLE_KEY` |
| `SUPABASE_URL` | `https://wpljjicijfzbuvfpnchm.supabase.co` | `process.env.SUPABASE_URL` |
| `SUPABASE_ANON` | `eyJhbGci...` | `process.env.SUPABASE_ANON_KEY` |
| `FIRECRAWL_KEY` | `fc-a966de3f...` | `process.env.FIRECRAWL_KEY` |
| `GEMINI_KEY` | `AQ.Ab8RN6...` | `process.env.GEMINI_KEY` |

### Currently Using `process.env` Fallback

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret (also hardcoded as fallback) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key — **NOT SET, falls back to anon key** |
| `APP_URL` | Base URL for Stripe redirect — defaults to `http://localhost:3001` |

### What Needs to Be Set in Production

```env
APP_URL=https://yourdomain.com
SUPABASE_SERVICE_KEY=eyJhbGci...  # From Supabase Dashboard → Settings → API
STRIPE_SECRET_KEY=sk_live_51OHb71...
STRIPE_PUBLISHABLE_KEY=pk_live_51OHb71...
STRIPE_WEBHOOK_SECRET=whsec_...   # After registering webhook in Stripe Dashboard
```

---

## 14. File Storage

### Current (Local Disk)
All scan data stored on the server's local filesystem:

```
Shot/
└── sessions/
    └── {sessionId}/
        ├── session.json          # Session metadata
        ├── {uuid}.png            # Screenshot files
        ├── {uuid}.png
        └── {random}.webm         # Playwright video recording
```

### Problems in Production
- **Ephemeral storage:** Cloud servers (Render, Railway) reset the filesystem on redeploy
- **No CDN:** Screenshots served directly from Express — slow at scale, no caching
- **No size limits:** A single scan of 20 full-page screenshots can be 20–50MB
- **Needed:** Supabase Storage or AWS S3/Cloudflare R2 for persistence + CDN delivery

---

## 15. Known Issues & Production Concerns

### 🔴 Critical

| Issue | Impact | Fix |
|---|---|---|
| `SUPABASE_SERVICE_KEY` not set | Stripe webhook cannot update `subscription_active` in DB (RLS blocks anon key) | Add service key to env vars |
| Stripe webhook not registered in Dashboard | Subscription cancellations/failures won't downgrade users | Register `{domain}/api/stripe/webhook` in Stripe Dashboard |
| Webhook signature NOT verified | Any request to `/api/stripe/webhook` is accepted — security risk | Add `stripe-signature` header verification using `STRIPE_WEBHOOK_SECRET` |
| `APP_URL` is `localhost:3001` | Stripe success/cancel redirects go to your local machine | Set `APP_URL` env var to real domain |
| Local file storage | Scans lost on server redeploy | Migrate to Supabase Storage or S3 |
| CORS locked to localhost | `cors({ origin: ['localhost:5173', 'localhost:3001'] })` | Add production domain to allowed origins |
| Keys hardcoded in source | Security risk if code is shared or committed to git | Move all to `.env` file + `.gitignore` |

### 🟡 Important

| Issue | Impact | Fix |
|---|---|---|
| JWT auto-refresh not implemented | Users logged out after ~1 hour (Supabase JWT default) | Add token refresh logic |
| No rate limiting | Single user could start unlimited scans simultaneously | Add `express-rate-limit` |
| Password reset missing | Users can't recover forgotten passwords | Add Supabase password reset email flow |
| Terms/Privacy links go to `#` | Required by Stripe for live payments | Create real legal pages |
| Sessions list not auth-gated | `GET /api/sessions` returns all users' sessions | Filter by `userId` |
| No Stripe Customer Portal | Users can't cancel their own subscription | Add `/api/stripe/portal` endpoint |
| `DIST_DIR` is absolute local path | Frontend won't load on any other machine | Make path relative: `path.join(__dirname, 'shot-app', 'dist')` |

### 🟢 Minor

| Issue | Impact | Fix |
|---|---|---|
| Gemini key format looks incorrect | API calls may fail silently (fallback response used instead) | Verify Gemini API key in Google AI Studio |
| Analytics/Templates screens | Show placeholder/mock UI — not functional | Build real functionality |
| No error monitoring | Crashes invisible in production | Add Sentry |
| `console.log` in production | Log noise | Remove or gate behind `NODE_ENV` |

---

## 16. Vercel Hosting — Critical Incompatibilities

**Verdict: Vercel is NOT compatible with this backend as-is.** Here is exactly why:

| Constraint | Vercel Limit | ROAM Requirement | Incompatible? |
|---|---|---|---|
| Function timeout | 10s (hobby) / 60s (pro) | Scans take 2–10+ minutes | ✅ YES |
| Playwright/Chromium | Not supported (binary too large, ~300MB) | Core product feature | ✅ YES |
| Filesystem writes | Read-only after deploy | `sessions/` directory writes | ✅ YES |
| SSE (streaming) | Limited — Vercel closes streaming responses | Real-time scan updates | ✅ YES |
| Long-running async | Functions must return quickly | `runScan()` runs for minutes | ✅ YES |

### What Vercel CAN host
- The **React frontend** (`shot-app/dist`) — perfectly suited for Vercel static hosting
- Lightweight API routes (auth proxy, Stripe checkout creation, etc.)

### Recommended Split Architecture for Production
```
Vercel (free/hobby)          VPS — Railway / Render / DigitalOcean ($5–10/mo)
─────────────────            ──────────────────────────────────────────────────
React SPA frontend           Express backend with Playwright
/api/auth/* proxy     ──▶   /api/scan
/api/stripe/*               /api/events/:id (SSE)
                             /screenshots/*
                             sessions/ dir (or S3)
```

The simplest alternative: **Railway** — supports Node.js + Playwright, persistent disk, no timeout limits, same deploy experience as Vercel. ~$5/mo for the starter plan.

---

## 17. Pre-launch Checklist

### Must-do Before Going Live

- [ ] **Choose hosting** — Railway or Render (not Vercel for backend)
- [ ] **Set `APP_URL`** to real domain in env vars
- [ ] **Add `SUPABASE_SERVICE_KEY`** (Supabase Dashboard → Settings → API → service_role)
- [ ] **Register Stripe webhook** — Stripe Dashboard → Webhooks → `https://yourdomain.com/api/stripe/webhook` → events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] **Implement webhook signature verification** using `STRIPE_WEBHOOK_SECRET`
- [ ] **Fix CORS** — add production domain to `cors({ origin: [...] })`
- [ ] **Fix `DIST_DIR`** — change from absolute local path to `path.join(__dirname, '../shot-app/dist')` or similar
- [ ] **Move all keys to `.env`** — never commit secrets to git
- [ ] **Add Terms of Service page** — required by Stripe
- [ ] **Add Privacy Policy page** — required by Stripe
- [ ] **Configure Playwright on server** — may need `nixpacks.toml` or Dockerfile

### Strong Recommendations

- [ ] Add `express-rate-limit` on `/api/scan`
- [ ] Add JWT refresh logic (Supabase refresh tokens)
- [ ] Add Stripe Customer Portal endpoint so users can self-cancel
- [ ] Migrate file storage to Supabase Storage or Cloudflare R2
- [ ] Filter `GET /api/sessions` by auth'd user ID
- [ ] Add Sentry for error monitoring
- [ ] Verify Gemini API key is valid
- [ ] Add password reset flow

---

## Directory Structure

```
Shot/                              ← Backend root (C:\Users\AlexT\OneDrive\Desktop\Shot)
├── backend.mjs                    ← Entire Node.js backend (single file, ~1200 lines)
├── package.json                   ← Backend dependencies
├── users.json                     ← Legacy (unused — Supabase handles auth now)
├── tokens.json                    ← Legacy (unused)
├── sessions/                      ← Scan session data (screenshots, videos, JSON)
└── ROAM_SPEC.md                   ← This file

shot-app/                          ← Frontend root (Claude session directory)
├── package.json                   ← Frontend dependencies
├── vite.config.ts
├── tsconfig.json
├── index.html                     ← ROAM favicon + title + meta
├── dist/                          ← Built frontend (served by Express)
└── src/
    ├── main.tsx                   ← React root, wraps in AuthProvider
    ├── App.tsx                    ← Router, keyboard nav, Stripe redirect handler
    ├── index.css                  ← All CSS: variables, animations, utilities
    ├── contexts/
    │   └── AuthContext.tsx        ← Auth state, token management
    ├── lib/
    │   ├── api.ts                 ← API call helpers (startScan, etc.)
    │   └── toast.ts               ← Toast notification system
    ├── components/
    │   ├── Sidebar.tsx            ← Navigation sidebar
    │   ├── UpgradeModal.tsx       ← Paywall / ZEN+ upgrade modal
    │   ├── ToastContainer.tsx     ← Toast UI
    │   └── ScreenshotCard.tsx     ← Gallery card component
    └── screens/
        ├── LoginScreen.tsx        ← Auth screen with animated scanner
        ├── HomeScreen.tsx         ← Landing with live scanner hero
        ├── ScanScreen.tsx         ← Real-time scan progress
        ├── GalleryScreen.tsx      ← Screenshot grid
        ├── CanvasScreen.tsx       ← Timeline editor + AI
        ├── ExportScreen.tsx       ← Export options
        ├── HistoryScreen.tsx      ← Past scans list
        ├── AnalyticsScreen.tsx    ← Usage analytics (placeholder)
        ├── TemplatesScreen.tsx    ← Scan presets (placeholder)
        └── SettingsScreen.tsx     ← Account settings
```

---

*Generated 2026-03-28 — ROAM v1.0.0*
