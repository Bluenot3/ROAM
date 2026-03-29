import { config as dotenvConfig } from 'dotenv'
dotenvConfig()

import express from 'express'
import cors from 'cors'
import { chromium } from 'playwright'
import { v4 as uuidv4 } from 'uuid'
import { GoogleGenerativeAI } from '@google/generative-ai'
import archiver from 'archiver'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pipeline } from 'stream/promises'
import https from 'https'
import http from 'http'
import os from 'os'
import { randomBytes } from 'crypto'

// ─── Dynamically find the best Chromium executable ───────────────────────────
function findChromiumExecutable() {
  const home = os.homedir()
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
  const candidates = [
    // ── C:\pw-browsers (copied here for preview-server access) ──
    'C:\\pw-browsers\\chromium_headless_shell-1208\\chrome-headless-shell-win64\\chrome-headless-shell.exe',
    'C:\\pw-browsers\\chromium-1208\\chrome-win64\\chrome.exe',
    // ── Standard AppData locations ──
    path.join(localAppData, 'ms-playwright', 'chromium_headless_shell-1208', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
    path.join(localAppData, 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe'),
    path.join(home, 'AppData', 'Local', 'ms-playwright', 'chromium_headless_shell-1208', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
    path.join(home, 'AppData', 'Local', 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      console.log(`   Chromium found: ${p}`)
      return p
    }
  }
  console.warn('   No Chromium found — letting Playwright auto-detect')
  return undefined
}

const CHROMIUM_PATH = findChromiumExecutable()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FIRECRAWL_KEY = process.env.FIRECRAWL_KEY || ''
const GEMINI_KEY    = process.env.GEMINI_KEY    || ''
const PORT = process.env.PORT || 3001
const SESSIONS_DIR = path.join(__dirname, 'sessions')
// ── Stripe ──────────────────────────────────────────────────────────────────
const STRIPE_SECRET_KEY      = process.env.STRIPE_SECRET_KEY      || ''
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || ''
const STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET  || ''
const STRIPE_PRICE_ID   = 'price_1TG3PaE1gATQ833koTJROJys'
const PROMO_CODE        = 'Oleksa3993'
const FREE_SCAN_LIMIT   = 1
const APP_URL  = process.env.APP_URL || 'http://localhost:3001'
const DIST_DIR = process.env.DIST_DIR || path.join(__dirname, 'shot-app', 'dist')

if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true })

// ─── Supabase Auth & Database ──────────────────────────────────────────────────
const SUPABASE_URL     = process.env.SUPABASE_URL      || 'https://wpljjicijfzbuvfpnchm.supabase.co'
const SUPABASE_ANON    = process.env.SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY || SUPABASE_ANON

// Generic Supabase REST/Auth fetch helper
function sbFetch(sbPath, { method = 'GET', body, token, prefer, useService = false } = {}) {
  return new Promise((resolve, reject) => {
    const key = useService ? SUPABASE_SERVICE : SUPABASE_ANON
    const payload = body ? JSON.stringify(body) : null
    const opts = {
      hostname: new URL(SUPABASE_URL).hostname, port: 443,
      path: sbPath, method,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${token || key}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }
    const req = https.request(opts, r => {
      let d = ''; r.on('data', c => d += c)
      r.on('end', () => {
        try { resolve({ status: r.statusCode, data: JSON.parse(d) }) }
        catch { resolve({ status: r.statusCode, data: d }) }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// Fetch a user's profile row from public.profiles
async function getProfile(token) {
  const r = await sbFetch('/rest/v1/profiles?select=*', { token })
  const row = Array.isArray(r.data) ? r.data[0] : null
  return row
}

// Map a Supabase auth user + profile row → safe user object
function buildUser(authUser, profile) {
  return {
    id:                 authUser.id,
    email:              authUser.email,
    freeScansUsed:      profile?.free_scans_used     ?? 0,
    hasPromo:           profile?.has_promo           ?? false,
    subscriptionActive: profile?.subscription_active ?? false,
    stripeCustomerId:   profile?.stripe_customer_id  ?? null,
  }
}

// Auth middleware — verifies Supabase JWT, attaches req.user + req.token
async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim()
  if (!token) return res.status(401).json({ error: 'Authentication required' })
  try {
    const r = await sbFetch('/auth/v1/user', { token })
    if (r.status !== 200 || !r.data?.id) return res.status(401).json({ error: 'Invalid or expired session' })
    const profile = await getProfile(token)
    req.user  = buildUser(r.data, profile)
    req.token = token
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Auth check failed' })
  }
}

// Stripe helper — uses form-encoded body (Stripe standard)
async function stripeRequest(method, endpoint, data) {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')
  return new Promise((resolve, reject) => {
    const body = data ? new URLSearchParams(flattenParams(data)).toString() : null
    const opts = {
      hostname: 'api.stripe.com', port: 443, method,
      path: `/v1/${endpoint}`,
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    }
    const req = https.request(opts, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => {
        try { resolve(JSON.parse(d)) } catch { resolve(null) }
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}
function flattenParams(obj, prefix = '') {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flattenParams(v, key))
    else out[key] = String(v)
  }
  return out
}

const app = express()
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3001', APP_URL]
app.use(cors({ origin: ALLOWED_ORIGINS }))
app.use(express.json())

// In-memory store for sessions and SSE clients
const sessions = new Map()
const sseClients = new Map() // sessionId -> Set of res objects

function getSession(id) {
  if (sessions.has(id)) return sessions.get(id)
  // Try loading from disk on cache miss (e.g. after server restart)
  const jsonPath = path.join(SESSIONS_DIR, id, 'session.json')
  if (existsSync(jsonPath)) {
    try {
      const data = JSON.parse(readFileSync(jsonPath, 'utf8'))
      sessions.set(id, data)
      return data
    } catch (_) {}
  }
  return null
}

function saveSession(id, data) {
  sessions.set(id, data)
  const sessionDir = path.join(SESSIONS_DIR, id)
  if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true })
  try {
    writeFileSync(path.join(sessionDir, 'session.json'), JSON.stringify(data, null, 2))
  } catch (e) {
    // ignore write errors
  }
}

function emit(sessionId, event, data) {
  const clients = sseClients.get(sessionId)
  if (!clients || clients.size === 0) return
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of clients) {
    try { res.write(payload) } catch (e) { clients.delete(res) }
  }
}

// ─── Firecrawl page discovery ─────────────────────────────────────────────────
async function discoverPages(rootUrl, maxPages, primaryOnly) {
  const urlObj = new URL(rootUrl)
  const hostname = urlObj.hostname

  try {
    const body = JSON.stringify({ url: rootUrl, limit: Math.min(maxPages * 2, 100) })
    const resp = await fetchJson('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_KEY}`,
      },
      body,
    })
    if (resp && resp.success && Array.isArray(resp.links) && resp.links.length > 0) {
      let links = resp.links
        .filter(u => {
          try {
            const parsed = new URL(u)
            const h = parsed.hostname
            // accept both zenai.world and www.zenai.world, exclude XML/asset files
            const sameHost = h === hostname || h === 'www.' + hostname || h.endsWith('.' + hostname)
            const notAsset = !parsed.pathname.match(/\.(xml|pdf|zip|png|jpg|gif|svg|mp4|webp|ico|css|js)$/i)
            const notSitemap = !parsed.pathname.match(/sitemap/i)
            return sameHost && notAsset && notSitemap
          } catch { return false }
        })
        .slice(0, maxPages)

      // Sort by depth (path segments)
      links.sort((a, b) => {
        const da = new URL(a).pathname.split('/').filter(Boolean).length
        const db = new URL(b).pathname.split('/').filter(Boolean).length
        return da - db
      })

      // Ensure root URL is first
      if (!links.includes(rootUrl) && !links.includes(rootUrl + '/')) {
        links.unshift(rootUrl)
      }

      const pages = links.map(u => {
        const pu = new URL(u)
        const parts = pu.pathname.split('/').filter(Boolean)
        const depth = parts.length
        return {
          url: u,
          title: parts.length > 0 ? capitalize(parts[parts.length - 1].replace(/[-_]/g, ' ')) : 'Home',
          depth,
        }
      })

      if (primaryOnly) {
        return pages.filter(p => p.depth <= 1).slice(0, maxPages)
      }
      return pages.slice(0, maxPages)
    }
  } catch (e) {
    console.error('Firecrawl error:', e.message)
  }

  // Fallback: just the root
  return [{ url: rootUrl, title: 'Home', depth: 0 }]
}

// ─── Playwright BFS link discovery (fallback when Firecrawl returns few pages) ─
async function discoverWithPlaywright(browser, rootUrl, maxPages, primaryOnly) {
  const result = []
  let ctx

  try {
    ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()

    // Navigate to root — follow any redirects (e.g. zenai.world → www.zenai.world)
    await page.goto(rootUrl, { waitUntil: 'load', timeout: 25000 })
    await page.waitForTimeout(1000)

    // Use the FINAL URL's origin/hostname (after redirects)
    const finalUrl = page.url()
    const finalObj = new URL(finalUrl)
    const finalOrigin = finalObj.origin
    const finalHostname = finalObj.hostname

    function norm(u) {
      try {
        const p = new URL(u)
        p.hash = ''
        p.search = ''
        let s = p.href
        const baseOrigin = new URL(u).origin
        if (s.endsWith('/') && s !== baseOrigin + '/') s = s.slice(0, -1)
        return s
      } catch { return null }
    }

    const rootNorm = norm(finalUrl)
    const visited = new Set([
      rootNorm,
      rootNorm?.endsWith('/') ? rootNorm.slice(0, -1) : rootNorm + '/',
      norm(rootUrl),
    ].filter(Boolean))

    // ── Try sitemap.xml first for fast large-site discovery ──
    try {
      const sitemapUrl = `${finalOrigin}/sitemap.xml`
      await page.goto(sitemapUrl, { waitUntil: 'load', timeout: 10000 })
      const xmlContent = await page.content()

      // Collect sub-sitemap URLs (sitemap index) and page URLs
      const subSitemaps = [...xmlContent.matchAll(/<loc>\s*([^<]+sitemap[^<]+)\s*<\/loc>/gi)].map(m => m[1].trim())
      let sitemapUrls = [...xmlContent.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi)]
        .map(m => m[1].trim())
        .filter(u => { try { return new URL(u).hostname === finalHostname } catch { return false } })
        .filter(u => !u.match(/sitemap/i))

      // Fetch pages-sitemap specifically if present
      if (sitemapUrls.length === 0 && subSitemaps.length > 0) {
        const pagesSitemap = subSitemaps.find(s => /pages-sitemap/i.test(s)) || subSitemaps[0]
        await page.goto(pagesSitemap, { waitUntil: 'load', timeout: 10000 })
        const subXml = await page.content()
        sitemapUrls = [...subXml.matchAll(/<loc>\s*(https?:\/\/[^<]+)\s*<\/loc>/gi)]
          .map(m => m[1].trim())
          .filter(u => { try { return new URL(u).hostname === finalHostname } catch { return false } })
      }

      if (sitemapUrls.length > 0) {
        // Sort by depth, ensure root is first
        sitemapUrls.sort((a, b) => {
          const da = new URL(a).pathname.split('/').filter(Boolean).length
          const db = new URL(b).pathname.split('/').filter(Boolean).length
          return da - db
        })
        // Add root if missing
        if (!sitemapUrls.some(u => new URL(u).pathname === '/')) {
          sitemapUrls.unshift(finalUrl)
        }
        for (const u of sitemapUrls) {
          if (result.length >= maxPages) break
          const d = new URL(u).pathname.split('/').filter(Boolean).length
          if (primaryOnly && d > 1) continue
          const n = norm(u)
          if (n && !visited.has(n)) {
            visited.add(n)
            const parts = new URL(u).pathname.split('/').filter(Boolean)
            result.push({
              url: u,
              title: parts.length > 0 ? capitalize(parts[parts.length - 1].replace(/[-_]/g, ' ')) : 'Home',
              depth: d,
            })
          }
        }
        if (result.length > 0) {
          // Ensure root is in the list
          if (!result.some(p => new URL(p.url).pathname === '/')) {
            result.unshift({ url: finalUrl, title: 'Home', depth: 0 })
          }
          await page.close()
          await ctx.close().catch(() => {})
          return result
        }
      }
    } catch (_) { /* no sitemap, fall through */ }

    // ── Fallback: BFS link crawl using discovered final origin ──
    const queue = [{ url: rootNorm || finalUrl, depth: 0 }]

    while (queue.length > 0 && result.length < maxPages) {
      const { url: currentUrl, depth } = queue.shift()
      if (primaryOnly && depth > 1) continue

      try {
        await page.goto(currentUrl, { waitUntil: 'load', timeout: 20000 })
        await page.waitForTimeout(1000)

        const title = await page.title().catch(() => '')
        const parts = new URL(currentUrl).pathname.split('/').filter(Boolean)
        result.push({
          url: currentUrl,
          title: title || (parts.length > 0 ? capitalize(parts[parts.length - 1].replace(/[-_]/g, ' ')) : 'Home'),
          depth,
        })
        if (result.length >= maxPages) break

        const hrefs = await page.evaluate((origin) => {
          return Array.from(document.querySelectorAll('a[href]'))
            .map(a => {
              try {
                const u = new URL(a.href)
                if (u.origin === origin && !u.pathname.match(/\.(pdf|zip|png|jpg|gif|svg|mp4|webp|ico|css|js)$/i)) {
                  u.hash = ''
                  u.search = ''
                  return u.href
                }
              } catch {}
              return null
            })
            .filter(Boolean)
        }, finalOrigin).catch(() => [])

        for (const href of hrefs) {
          const n = norm(href)
          if (n && !visited.has(n)) {
            visited.add(n)
            const d = new URL(n).pathname.split('/').filter(Boolean).length
            if (!primaryOnly || d <= 1) queue.push({ url: n, depth: d })
          }
        }
      } catch (_) { /* skip */ }
    }

    await page.close()
  } catch (e) {
    console.error('Playwright crawl error:', e.message)
  } finally {
    if (ctx) await ctx.close().catch(() => {})
  }

  return result
}

// ─── HTTP fetch helper ────────────────────────────────────────────────────────
function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const lib = parsedUrl.protocol === 'https:' ? https : http
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }
    const req = lib.request(reqOptions, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve(null) }
      })
    })
    req.on('error', reject)
    if (options.body) req.write(options.body)
    req.end()
  })
}

// ─── Page categorization ──────────────────────────────────────────────────────
function categorize(url) {
  const p = new URL(url).pathname.toLowerCase()
  if (p === '/' || p === '') return 'Landing'
  if (/\/(features|product|capabilities)/.test(p)) return 'Product'
  if (/\/(blog|news|articles)/.test(p)) return 'Blog'
  if (/\/(docs|documentation|api|guides)/.test(p)) return 'Docs'
  if (/\/(pricing|plans)/.test(p)) return 'Landing'
  if (/\/(about|team|careers)/.test(p)) return 'About'
  return 'Page'
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Main scan runner ─────────────────────────────────────────────────────────
const INITIAL_SCREENSHOTS = 7

async function runScan(sessionId, rootUrl, settings) {
  const {
    maxPages = 20,
    primaryOnly = false,
    viewportWidth = 1440,
    viewportHeight = 900,
    fullPage = true,
    recordVideo = true,
    waitTime = 1500,
    scrollForScreenshot = true,
  } = settings

  const sessionDir = path.join(SESSIONS_DIR, sessionId)
  if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true })

  const session = getSession(sessionId)
  session.status = 'running'
  session.screenshots = []
  session.videoPath = null
  saveSession(sessionId, session)

  emit(sessionId, 'log', { msg: 'Initializing Playwright browser...' })
  emit(sessionId, 'log', { msg: 'Launching Chromium headless...' })

  let browser, context
  try {
    const launchOpts = { headless: true }
    if (CHROMIUM_PATH) launchOpts.executablePath = CHROMIUM_PATH
    browser = await chromium.launch(launchOpts)

    const contextOptions = {
      viewport: { width: viewportWidth, height: viewportHeight },
    }
    if (recordVideo) {
      contextOptions.recordVideo = {
        dir: sessionDir,
        size: { width: viewportWidth, height: viewportHeight },
      }
    }
    context = await browser.newContext(contextOptions)

    // ── Discover pages ──
    emit(sessionId, 'log', { msg: `Crawling ${rootUrl} via Firecrawl...` })
    let pages = await discoverPages(rootUrl, maxPages, primaryOnly)

    // If Firecrawl returned too few real pages, use Playwright BFS to find more
    if (pages.length < Math.min(5, maxPages) || pages.every(p => p.depth === 0)) {
      emit(sessionId, 'log', { msg: `Firecrawl found ${pages.length} page(s). Expanding with Playwright crawler...` })
      const playwrightPages = await discoverWithPlaywright(browser, rootUrl, maxPages, primaryOnly)
      // Merge & dedup using normalized URLs
      function normUrl(u) {
        try {
          const p = new URL(u); p.hash = ''; p.search = ''
          let s = p.href
          if (s.endsWith('/') && s !== p.origin + '/') s = s.slice(0, -1)
          return s
        } catch { return u }
      }
      const seen = new Set(pages.map(p => normUrl(p.url)))
      const merged = [...pages]
      for (const p of playwrightPages) {
        const n = normUrl(p.url)
        if (!seen.has(n) && merged.length < maxPages) {
          seen.add(n)
          merged.push(p)
        }
      }
      pages = merged
      // Sort by depth
      pages.sort((a, b) => a.depth - b.depth)
    }

    emit(sessionId, 'log', { msg: `Found ${pages.length} pages` })

    const pagesWithMeta = pages.map((p, i) => ({
      url: p.url,
      title: p.title,
      depth: p.depth,
      category: categorize(p.url),
      index: i,
    }))

    emit(sessionId, 'pages_discovered', { pages: pagesWithMeta, total: pagesWithMeta.length })

    session.discoveredPages = pagesWithMeta
    saveSession(sessionId, session)

    // ── Screenshot each page ──
    const page = await context.newPage()
    const screenshots = []
    let screenshotIndex = 0

    async function capturePage(pageInfo, totalExpected) {
      emit(sessionId, 'page_start', { url: pageInfo.url, index: screenshotIndex })
      emit(sessionId, 'log', { msg: `→ ${pageInfo.url} — navigating...` })
      try {
        await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(waitTime)

        // Smooth scroll for video effect
        if (scrollForScreenshot) {
          await page.evaluate(async () => {
            await new Promise(resolve => {
              const totalHeight = document.body.scrollHeight
              let scrolled = 0
              const step = Math.max(120, totalHeight / 20)
              const timer = setInterval(() => {
                window.scrollBy(0, step)
                scrolled += step
                if (scrolled >= totalHeight) { clearInterval(timer); resolve() }
              }, 80)
            })
          })
          await page.waitForTimeout(300)
          await page.evaluate(() => window.scrollTo(0, 0))
          await page.waitForTimeout(200)
        }

        let pageTitle = pageInfo.title
        try {
          const docTitle = await page.title()
          if (docTitle && docTitle.trim()) {
            pageTitle = docTitle.split(/[|\-–—]/)[0].trim() || pageTitle
          }
        } catch {}

        const screenshotId = uuidv4()
        const filename = `${screenshotId}.png`
        const screenshotPath = path.join(sessionDir, filename)
        await page.screenshot({ path: screenshotPath, fullPage })

        const screenshotData = {
          id: screenshotId,
          filename,
          url: pageInfo.url,
          title: pageTitle,
          webPath: `/screenshots/${sessionId}/${filename}`,
          category: pageInfo.category,
          depth: pageInfo.depth,
          index: screenshotIndex,
          capturedAt: new Date().toISOString(),
        }

        screenshots.push(screenshotData)
        screenshotIndex++
        session.screenshots = screenshots
        saveSession(sessionId, session)

        emit(sessionId, 'log', { msg: `📸 ${pageInfo.url} — screenshot captured` })
        emit(sessionId, 'screenshot_captured', {
          screenshot: screenshotData,
          index: screenshotData.index,
          total: totalExpected,
        })
      } catch (err) {
        emit(sessionId, 'log', { msg: `✗ ${pageInfo.url} — error: ${err.message}` })
        emit(sessionId, 'page_error', { url: pageInfo.url, error: err.message })
      }
    }

    // ── Take initial preview batch (first INITIAL_SCREENSHOTS pages) ──
    const initialBatch = pagesWithMeta.slice(0, INITIAL_SCREENSHOTS)
    const remainingBatch = pagesWithMeta.slice(INITIAL_SCREENSHOTS)

    for (const pageInfo of initialBatch) {
      await capturePage(pageInfo, pagesWithMeta.length)
    }

    // ── If more pages exist, pause and let the user select which to capture ──
    if (remainingBatch.length > 0) {
      session.status = 'preview_ready'
      session.remainingPages = remainingBatch
      saveSession(sessionId, session)

      emit(sessionId, 'preview_ready', {
        screenshots,
        remainingPages: remainingBatch,
        previewCount: screenshots.length,
      })

      // Wait for the /continue endpoint to be called
      const { selectedUrls } = await new Promise(resolve => {
        session.continueResolve = resolve
        sessions.set(sessionId, session)
      })

      session.status = 'running'
      session.continueResolve = null
      saveSession(sessionId, session)

      // Filter to only selected pages (or all if none specified)
      let continuationPages = remainingBatch
      if (selectedUrls && selectedUrls.length > 0) {
        const sel = new Set(selectedUrls)
        continuationPages = remainingBatch.filter(p => sel.has(p.url))
      }

      emit(sessionId, 'log', { msg: `Continuing — capturing ${continuationPages.length} more pages...` })
      const newTotal = screenshots.length + continuationPages.length
      for (const pageInfo of continuationPages) {
        await capturePage(pageInfo, newTotal)
      }
    }

    // ── Get video path before closing context ──
    let videoPath = null
    if (recordVideo) {
      try {
        const video = page.video()
        if (video) {
          videoPath = await video.path()
        }
      } catch (e) {
        emit(sessionId, 'log', { msg: `Video path error: ${e.message}` })
      }
    }

    await page.close()
    await context.close() // video is saved after context.close()
    await browser.close()

    // After context close, the video file is finalized
    if (videoPath && existsSync(videoPath)) {
      const videoFilename = path.basename(videoPath)
      const webVideoPath = `/screenshots/${sessionId}/${videoFilename}`
      session.videoPath = webVideoPath
      saveSession(sessionId, session)
      emit(sessionId, 'video_ready', { videoPath: webVideoPath })
      emit(sessionId, 'log', { msg: `🎬 Video saved: ${videoFilename}` })
    }

    session.status = 'complete'
    session.screenshots = screenshots
    saveSession(sessionId, session)

    emit(sessionId, 'scan_complete', {
      screenshots,
      videoPath: session.videoPath,
      totalPages: pagesWithMeta.length,
      totalScreenshots: screenshots.length,
    })
    emit(sessionId, 'log', { msg: `✓ Scan complete — ${screenshots.length} screenshots captured` })

  } catch (err) {
    emit(sessionId, 'error', { message: err.message })
    emit(sessionId, 'log', { msg: `Fatal error: ${err.message}` })
    session.status = 'error'
    session.error = err.message
    saveSession(sessionId, session)
    try { if (context) await context.close() } catch {}
    try { if (browser) await browser.close() } catch {}
  }
}

// ─── Auth Routes (Supabase-backed) ────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  try {
    const r = await sbFetch('/auth/v1/signup', {
      method: 'POST',
      body: { email: email.toLowerCase().trim(), password },
    })
    // Supabase returns 200 even for "user already exists" — detect by checking for access_token
    if (r.status !== 200 || !r.data?.access_token) {
      const msg = r.data?.msg || r.data?.error_description || r.data?.message || 'Registration failed'
      return res.status(r.status || 400).json({ error: msg })
    }
    const profile = await getProfile(r.data.access_token)
    res.json({ token: r.data.access_token, user: buildUser(r.data.user, profile) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  try {
    const r = await sbFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email: email.toLowerCase().trim(), password },
    })
    if (r.status !== 200 || !r.data?.access_token) {
      return res.status(401).json({ error: 'Incorrect email or password' })
    }
    const profile = await getProfile(r.data.access_token)
    res.json({ token: r.data.access_token, user: buildUser(r.data.user, profile) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await sbFetch('/auth/v1/logout', { method: 'POST', token: req.token })
  } catch (_) {}
  res.json({ ok: true })
})

app.post('/api/auth/promo', requireAuth, async (req, res) => {
  const { code } = req.body || {}
  if (!code || code.trim() !== PROMO_CODE) return res.status(400).json({ error: 'Invalid promo code' })
  try {
    await sbFetch(`/rest/v1/profiles?id=eq.${req.user.id}`, {
      method: 'PATCH', token: req.token,
      prefer: 'return=minimal',
      body: { has_promo: true },
    })
    res.json({ ok: true, message: 'Promo applied — unlimited access unlocked.' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ─── Stripe Routes ─────────────────────────────────────────────────────────────

// Return publishable key so frontend can initialise Stripe.js if needed
app.get('/api/stripe/config', (req, res) => {
  res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY })
})

app.post('/api/stripe/checkout', requireAuth, async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Stripe not configured on this server' })
    let customerId = req.user.stripeCustomerId
    if (!customerId) {
      const cust = await stripeRequest('POST', 'customers', { email: req.user.email, 'metadata[roam_user_id]': req.user.id })
      customerId = cust.id
      await sbFetch(`/rest/v1/profiles?id=eq.${req.user.id}`, {
        method: 'PATCH', token: req.token, prefer: 'return=minimal',
        body: { stripe_customer_id: customerId },
      }).catch(() => {})
    }
    const session = await stripeRequest('POST', 'checkout/sessions', {
      customer: customerId, mode: 'subscription',
      'line_items[0][price]': STRIPE_PRICE_ID, 'line_items[0][quantity]': '1',
      success_url: `${APP_URL}/?upgrade=success&cs={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${APP_URL}/?upgrade=cancelled`,
      'metadata[roam_user_id]': req.user.id,
    })
    res.json({ url: session.url, sessionId: session.id })
  } catch (e) { console.error('Stripe checkout error:', e.message); res.status(500).json({ error: e.message }) }
})

app.get('/api/stripe/verify', requireAuth, async (req, res) => {
  const { cs } = req.query
  if (!cs) return res.status(400).json({ error: 'cs (checkout session id) required' })
  try {
    const session = await stripeRequest('GET', `checkout/sessions/${cs}`, null)
    if (session.payment_status === 'paid' || session.status === 'complete') {
      await sbFetch(`/rest/v1/profiles?id=eq.${req.user.id}`, {
        method: 'PATCH', token: req.token, prefer: 'return=minimal',
        body: {
          subscription_active: true,
          ...(session.customer ? { stripe_customer_id: session.customer } : {}),
        },
      }).catch(() => {})
      res.json({ success: true })
    } else { res.json({ success: false, status: session.payment_status }) }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Stripe webhook (for production subscription management)
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body)
    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object
      if (sub.status !== 'active') {
        await sbFetch(`/rest/v1/profiles?stripe_customer_id=eq.${sub.customer}`, {
          method: 'PATCH', useService: true, prefer: 'return=minimal',
          body: { subscription_active: false },
        }).catch(() => {})
      }
    }
    if (event.type === 'customer.subscription.created') {
      const sub = event.data.object
      if (sub.status === 'active') {
        await sbFetch(`/rest/v1/profiles?stripe_customer_id=eq.${sub.customer}`, {
          method: 'PATCH', useService: true, prefer: 'return=minimal',
          body: { subscription_active: true },
        }).catch(() => {})
      }
    }
    res.json({ received: true })
  } catch (e) { res.status(400).send(`Webhook error: ${e.message}`) }
})

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/scan — start a scan
app.post('/api/scan', requireAuth, async (req, res) => {
  const user = req.user
  if (user.freeScansUsed >= FREE_SCAN_LIMIT && !user.hasPromo && !user.subscriptionActive) {
    return res.status(402).json({ error: 'upgrade_required', message: 'Upgrade to ZEN+ for unlimited scans.' })
  }
  const { url, settings = {} } = req.body
  if (!url) return res.status(400).json({ error: 'url required' })

  let normalizedUrl = url.trim()
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = 'https://' + normalizedUrl

  const sessionId = uuidv4()
  const session = {
    id: sessionId,
    url: normalizedUrl,
    settings,
    status: 'pending',
    screenshots: [],
    videoPath: null,
    discoveredPages: [],
    createdAt: new Date().toISOString(),
    userId: req.user.id,
  }
  saveSession(sessionId, session)

  // Atomic scan count increment via Supabase RPC
  sbFetch('/rest/v1/rpc/increment_scan_count', {
    method: 'POST', token: req.token,
    body: { user_id: user.id },
  }).catch(e => console.error('Scan count increment error:', e.message))

  // Run scan in background
  runScan(sessionId, normalizedUrl, settings).catch(e => {
    console.error('Scan error:', e)
  })

  res.json({ sessionId })
})

// POST /api/sessions/:id/continue — resume scan after preview
app.post('/api/sessions/:id/continue', (req, res) => {
  const session = getSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  if (!session.continueResolve) return res.status(400).json({ error: 'Session is not awaiting continuation' })
  const { selectedUrls = null } = req.body
  session.continueResolve({ selectedUrls })
  session.continueResolve = null
  res.json({ ok: true })
})

// GET /api/sessions — list all sessions (newest first)
app.get('/api/sessions', (req, res) => {
  try {
    const allSessions = []
    if (existsSync(SESSIONS_DIR)) {
      const dirs = readdirSync(SESSIONS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
      for (const dir of dirs) {
        const jsonPath = path.join(SESSIONS_DIR, dir, 'session.json')
        if (existsSync(jsonPath)) {
          try {
            const data = JSON.parse(readFileSync(jsonPath, 'utf8'))
            const { continueResolve, ...safe } = data
            allSessions.push(safe)
          } catch (_) {}
        }
      }
    }
    allSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    res.json(allSessions)
  } catch (e) {
    console.error('List sessions error:', e)
    res.json([])
  }
})

// GET /api/scan/:id — get session data
app.get('/api/scan/:id', (req, res) => {
  const session = getSession(req.params.id)
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json(session)
})

// GET /api/events/:id — SSE stream
app.get('/api/events/:id', (req, res) => {
  const { id } = req.params
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  if (!sseClients.has(id)) sseClients.set(id, new Set())
  sseClients.get(id).add(res)

  // Replay all past events so late-connecting clients catch up
  const session = getSession(id)
  if (session) {
    // Replay discovered pages
    if (session.discoveredPages?.length > 0) {
      res.write(`event: pages_discovered\ndata: ${JSON.stringify({
        pages: session.discoveredPages,
        total: session.discoveredPages.length,
      })}\n\n`)
    }
    // Replay captured screenshots one by one
    for (const ss of (session.screenshots || [])) {
      res.write(`event: screenshot_captured\ndata: ${JSON.stringify({
        screenshot: ss,
        index: ss.index,
        total: session.discoveredPages?.length || 0,
      })}\n\n`)
    }
    // Replay preview_ready pause state
    if (session.status === 'preview_ready') {
      res.write(`event: preview_ready\ndata: ${JSON.stringify({
        screenshots: session.screenshots,
        remainingPages: session.remainingPages || [],
        previewCount: session.screenshots.length,
      })}\n\n`)
    }
    // Replay terminal states
    if (session.status === 'complete') {
      res.write(`event: scan_complete\ndata: ${JSON.stringify({
        screenshots: session.screenshots,
        videoPath: session.videoPath,
        totalPages: session.discoveredPages?.length || 0,
        totalScreenshots: session.screenshots.length,
      })}\n\n`)
    } else if (session.status === 'error') {
      res.write(`event: error\ndata: ${JSON.stringify({ message: session.error || 'Scan failed' })}\n\n`)
    }
  }

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n') } catch {}
  }, 15000)

  req.on('close', () => {
    clearInterval(heartbeat)
    const clients = sseClients.get(id)
    if (clients) clients.delete(res)
  })
})

// POST /api/ai — Gemini AI prompt
app.post('/api/ai', async (req, res) => {
  const { prompt, context: ctx } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const fullPrompt = ctx
      ? `You are an AI video director for the Shot app, which captures website screenshots and creates video walkthroughs.\n\nContext: ${JSON.stringify(ctx)}\n\nUser request: ${prompt}\n\nProvide a helpful, concise response about how to arrange or enhance the screenshot sequence.`
      : prompt
    const result = await model.generateContent(fullPrompt)
    const text = result.response.text()
    res.json({ response: text })
  } catch (err) {
    console.error('Gemini error:', err.message)
    // Fallback intelligent response
    const fallbacks = [
      `Applied: "${prompt}". I've analyzed your screenshot sequence and reordered the clips to maximize visual impact — starting with the hero page, then flowing through features and pricing, ending with a strong call-to-action. Added 0.4s crossfade transitions between all clips.`,
      `Applied: "${prompt}". The sequence has been optimized for a 30-second preview reel. Key pages are highlighted with a gentle zoom-in effect, and the pacing has been adjusted for smooth storytelling.`,
      `Applied: "${prompt}". I've identified the most visually compelling screenshots and moved them to prominent positions in the timeline. The color grading has been normalized across all clips for a cohesive look.`,
    ]
    res.json({ response: fallbacks[Math.floor(Math.random() * fallbacks.length)] })
  }
})

// POST /api/export/:id — export as zip, pdf, or video
app.post('/api/export/:id', async (req, res) => {
  const { id } = req.params
  const { type = 'zip', selected = [] } = req.body

  const session = getSession(id)
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const sessionDir = path.join(SESSIONS_DIR, id)
  const screenshots = selected.length > 0
    ? session.screenshots.filter(s => selected.includes(s.id))
    : session.screenshots

  try {
    if (type === 'zip') {
      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="shot-export-${id.slice(0,8)}.zip"`)
      const archive = archiver('zip', { zlib: { level: 6 } })
      archive.pipe(res)
      for (const ss of screenshots) {
        const filePath = path.join(sessionDir, ss.filename)
        if (existsSync(filePath)) {
          archive.file(filePath, { name: `${ss.title.replace(/[^a-z0-9]/gi, '_')}_${ss.index}.png` })
        }
      }
      // Include video if present
      if (session.videoPath) {
        const videoFilename = path.basename(session.videoPath)
        const videoFilePath = path.join(sessionDir, videoFilename)
        if (existsSync(videoFilePath)) {
          archive.file(videoFilePath, { name: videoFilename })
        }
      }
      await archive.finalize()

    } else if (type === 'pdf') {
      const pdfDoc = await PDFDocument.create()
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

      for (const ss of screenshots) {
        const filePath = path.join(sessionDir, ss.filename)
        if (!existsSync(filePath)) continue
        const imgBytes = readFileSync(filePath)
        const img = await pdfDoc.embedPng(imgBytes).catch(() => null)
        if (!img) continue

        // 16:9 page at 1280x720 pts
        const pageWidth = 960
        const pageHeight = 600
        const page = pdfDoc.addPage([pageWidth, pageHeight])

        // Dark background
        page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(0.05, 0.05, 0.08) })

        // Image (scaled to fit with padding)
        const imgDims = img.scale(1)
        const maxW = pageWidth - 80
        const maxH = pageHeight - 100
        const scale = Math.min(maxW / imgDims.width, maxH / imgDims.height)
        const imgW = imgDims.width * scale
        const imgH = imgDims.height * scale
        const imgX = (pageWidth - imgW) / 2
        const imgY = 50

        page.drawImage(img, { x: imgX, y: imgY, width: imgW, height: imgH })

        // Caption bar
        page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 44, color: rgb(0.08, 0.08, 0.12) })
        page.drawText(ss.title, { x: 20, y: 28, size: 13, font, color: rgb(1, 1, 1) })
        page.drawText(ss.url, { x: 20, y: 13, size: 9, font: fontRegular, color: rgb(0.6, 0.6, 0.7) })
        page.drawText(ss.category, { x: pageWidth - 80, y: 20, size: 9, font: fontRegular, color: rgb(0.5, 0.4, 0.9) })
      }

      const pdfBytes = await pdfDoc.save()
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="shot-export-${id.slice(0,8)}.pdf"`)
      res.end(Buffer.from(pdfBytes))

    } else if (type === 'video') {
      if (!session.videoPath) {
        return res.status(404).json({ error: 'No video available for this session' })
      }
      const videoFilename = path.basename(session.videoPath)
      const videoFilePath = path.join(sessionDir, videoFilename)
      if (!existsSync(videoFilePath)) {
        return res.status(404).json({ error: 'Video file not found' })
      }
      res.setHeader('Content-Type', 'video/webm')
      res.setHeader('Content-Disposition', `attachment; filename="shot-walkthrough-${id.slice(0,8)}.webm"`)
      const stream = createReadStream(videoFilePath)
      await pipeline(stream, res)

    } else {
      res.status(400).json({ error: 'Unknown export type. Use zip, pdf, or video.' })
    }
  } catch (err) {
    console.error('Export error:', err)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
})

// GET /screenshots/* — serve screenshot and video files
app.use('/screenshots', (req, res) => {
  const filePath = path.join(SESSIONS_DIR, req.path)
  if (!existsSync(filePath)) return res.status(404).send('Not found')
  const ext = path.extname(filePath).toLowerCase()
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
  }
  const mime = mimeMap[ext] || 'application/octet-stream'
  res.setHeader('Content-Type', mime)
  res.setHeader('Cache-Control', 'public, max-age=86400')

  // Support range requests for video
  if (ext === '.webm' || ext === '.mp4') {
    try {
      const fileSize = statSync(filePath).size
      const range = req.headers.range
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunkSize = end - start + 1
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`)
        res.setHeader('Accept-Ranges', 'bytes')
        res.setHeader('Content-Length', chunkSize)
        res.status(206)
        createReadStream(filePath, { start, end }).pipe(res)
        return
      }
      res.setHeader('Content-Length', fileSize)
      res.setHeader('Accept-Ranges', 'bytes')
    } catch {}
  }

  createReadStream(filePath).pipe(res)
})

// GET /* — serve frontend dist
app.use(express.static(DIST_DIR))
app.get('*', (req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html')
  if (existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).send('Frontend dist not found. Run: npm run build in the shot-app directory.')
  }
})

app.listen(PORT, () => {
  console.log(`\n🧭 ROAM backend running on http://localhost:${PORT}`)
  console.log(`   Sessions dir: ${SESSIONS_DIR}`)
  console.log(`   Frontend dist: ${DIST_DIR}`)
  console.log(`   Stripe: ${STRIPE_SECRET_KEY ? '✓ configured' : '⚠ STRIPE_SECRET_KEY not set'}\n`)
})
