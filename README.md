# ROAM — Document Any Website, Automatically

> **Stop taking screenshots manually.** Paste a URL and get everything—HD screenshots, video walkthroughs, site maps, and AI narration—in seconds.

![ROAM Interface](https://raw.githubusercontent.com/Bluenot3/ROAM/main/.github/assets/roam-preview.jpg)

---

## What Is ROAM?

ROAM is a **web documentation engine** that automatically crawls, captures, and documents any website—turning manual screenshot workflows into instant, multi-format exports.

Paste a URL → get:
- 📸 **HD full-page screenshots** (every frame, every scroll depth)
- 🎬 **Video walkthroughs** (WebM, optimized for docs)
- 🗺️ **Interactive site maps** (JSON, visual tree)
- 🎙️ **AI narration** (Google Gemini voice-over)
- 📦 **ZIP bundles** (everything packaged, ready to share)

### Why ROAM?

| Problem | ROAM Solution |
|---------|---------------|
| Manual screenshots for docs take hours | Full page captured in <30 seconds |
| Site changes break your screenshots | Regenerate in one click |
| Video walkthroughs require expensive tools | Built-in video export (WebM) |
| Can't share interactive site maps | JSON + visual tree included |
| No context about page flow | AI analyzes and narrates the journey |

---

## Quick Start

### Prerequisites
- **Node.js >= 20** (handles Tailwind v4 native bindings)
- **npm 10+**

### Local Setup (3 commands)

```bash
# 1. Clone & install
git clone https://github.com/Bluenot3/ROAM.git
cd ROAM && npm install:all

# 2. Set up environment
cp .env.example .env
# Edit .env with your Gemini API key + Stripe test keys

# 3. Start
npm run dev
```

Then open **http://localhost:3001** and paste any URL.

### Docker (One Command)

```bash
docker-compose up
```

Brings up the full stack (backend + frontend + hot reload) on `http://localhost:3001`.

---

## Features

### 📸 Intelligent Screenshot Engine
- Full-page captures at multiple scroll depths
- Automatic viewport optimization (mobile/desktop)
- CSS rendering perfection (Tailwind v4, dark mode, animations)
- Transparent background extraction

### 🎬 Video Export
- Real-time browser automation recording
- WebM codec (small files, universal playback)
- Automatic frame rate optimization
- Built-in progress overlays

### 🗺️ Site Mapping
- Graph-based crawl analysis
- Link relationship extraction
- JSON export for integration
- Visual tree representation

### 🎙️ AI Narration
- Google Gemini multimodal analysis
- Context-aware voiceovers
- Natural language journey descriptions
- Multi-language support

### 💳 Freemium Model
- **Free tier:** 5 scans/month, HD exports
- **Pro:** Unlimited scans, priority processing, API access
- Stripe integration for billing

---

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Tailwind CSS v4 (native Rust compiler)
- Vite 6 (ultra-fast builds)
- Lucide icons

**Backend**
- Node.js 20+ / Express.js
- Playwright (headless browser automation)
- Google Generative AI (Gemini)
- Supabase (auth + storage)
- Stripe (payments)

**Deployment**
- Railway (production)
- Docker + Docker Compose (local)

---

## Architecture

```
ROAM/
├── backend.mjs              # Express API, Playwright automation
├── shot-app/                # React + Tailwind frontend
│   ├── src/components/      # UI components
│   ├── src/pages/           # Page layouts
│   └── vite.config.ts       # Build config
├── docker-compose.yml       # Full-stack local dev
└── ROAM_SPEC.md            # Complete technical spec
```

### Data Flow
1. **User inputs URL** → frontend sends to `/api/scan`
2. **Backend launches Playwright** → captures screenshots + crawls links
3. **Gemini analyzes** the page structure and generates narration
4. **Files packaged** as ZIP (screenshots + video + sitemap + audio)
5. **Download link sent** to frontend (SSE stream for progress)

---

## Getting Started

### First Time?
1. Read [ROAM_SPEC.md](./ROAM_SPEC.md) for deep technical details
2. Try the [Quick Start](#quick-start) above
3. Check out [CONTRIBUTING.md](./CONTRIBUTING.md) to contribute

### Want to Deploy?
- **Railway:** Push this repo, Railway auto-detects Node.js ≥ 20 and deploys
- **Docker:** `docker-compose up` for production-ready stack
- **Vercel (frontend only):** `npm run build` in `shot-app/`

### Environment Variables

```env
# API Keys
GEMINI_KEY=your-google-gemini-api-key
STRIPE_TEST_KEY=sk_test_...
STRIPE_LIVE_KEY=sk_live_...

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...

# Backend
PORT=3001
NODE_ENV=development
```

See [.env.example](./.env.example) for complete reference.

---

## Use Cases

✅ **Product Documentation** — Turn SaaS workflows into video docs
✅ **Competitor Analysis** — Bulk capture & analyze competitor sites
✅ **Accessibility Testing** — Screenshot validation at scale
✅ **Design Systems** — Auto-generate component libraries
✅ **Content Archiving** — Permanent snapshots of web content

---

## Roadmap

- [ ] **Batch scanning API** — Process 100+ URLs in parallel
- [ ] **Custom templates** — White-label documentation exports
- [ ] **Diff detection** — Highlight page changes over time
- [ ] **Advanced analytics** — Heatmaps, interaction tracking
- [ ] **Figma export** — Design system integration
- [ ] **CLI tool** — `roam https://example.com --format=all`

---

## Contributing

We welcome contributions! Whether it's bug fixes, feature ideas, or documentation improvements:

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-thing`
3. Commit: `git commit -m "feat: add amazing thing"`
4. Push: `git push origin feature/amazing-thing`
5. Open a PR

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines, code style, and testing info.

---

## License

MIT — See [LICENSE](./LICENSE) for details.

**TL;DR:** Use it freely in personal & commercial projects. Attribution appreciated but not required.

---

## Support

- 💬 **Questions?** Open a [GitHub Issue](https://github.com/Bluenot3/ROAM/issues)
- 🐛 **Found a bug?** [Report it here](https://github.com/Bluenot3/ROAM/issues/new?template=bug_report.md)
- 🚀 **Feature request?** [Suggest it here](https://github.com/Bluenot3/ROAM/issues/new?template=feature_request.md)

---

## Made by

Built by the **ZEN AI Pioneers** — pushing the boundaries of automated web intelligence.

⭐ If you find ROAM useful, please star the repo! It helps others discover it.

---

**Happy documenting!** 🚀
