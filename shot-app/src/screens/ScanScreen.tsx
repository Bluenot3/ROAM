import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, Circle, Loader2, Globe, ChevronRight } from 'lucide-react'
import type { Screen, NavigateMeta } from '../App'
import { PAGES } from '../data/mockData'
import { createEventSource, startScan, continueScan } from '../lib/api'
import type { Screenshot, ScanSettings } from '../lib/api'

interface Props {
  navigate: (s: Screen, meta?: NavigateMeta) => void
  sessionId?: string
  pendingScanUrl?: string
  pendingScanSettings?: ScanSettings
  onSessionReady?: (sessionId: string) => void
}

const ACCENT_POOL = ['#6366f1','#8b5cf6','#3b82f6','#34d399','#fbbf24','#f87171','#a78bfa','#60a5fa','#fb923c','#a3e635']
const GRADIENT_POOL = [
  'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
  'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
  'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
  'linear-gradient(135deg, #0f1a0f 0%, #162816 100%)',
  'linear-gradient(135deg, #1a140a 0%, #2a1f0a 100%)',
]

function pageToMockStyle(index: number) {
  return {
    accent: ACCENT_POOL[index % ACCENT_POOL.length],
    gradient: GRADIENT_POOL[index % GRADIENT_POOL.length],
  }
}

interface RealPage {
  url: string
  title: string
  depth: number
  category: string
  index: number
  id: string
  accent: string
  gradient: string
  captured: boolean
  screenshot?: Screenshot
  path: string
}

export default function ScanScreen({ navigate, sessionId: initialSessionId, pendingScanUrl, pendingScanSettings, onSessionReady }: Props) {
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId)
  const [realPages, setRealPages] = useState<RealPage[]>([])
  const [realScreenshots, setRealScreenshots] = useState<Screenshot[]>([])
  const [realPhase, setRealPhase] = useState<'crawling' | 'screenshotting' | 'preview_ready' | 'done' | 'error'>('crawling')
  const [realLog, setRealLog] = useState<string[]>(['Connecting to backend...'])
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [scanUrl, setScanUrl] = useState<string>('')
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [showContinuePrompt, setShowContinuePrompt] = useState(false)
  const [remainingCount, setRemainingCount] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const fromHomeRef = useRef(!!pendingScanUrl)
  const sessionIdRef = useRef<string | undefined>(initialSessionId)

  // ── Mock mode state ──
  const [mockDiscovered, setMockDiscovered] = useState<typeof PAGES>([])
  const [mockCaptured, setMockCaptured] = useState(0)
  const [mockProgress, setMockProgress] = useState(0)
  const [mockPhase, setMockPhase] = useState<'crawling' | 'screenshotting' | 'done'>('crawling')
  const [mockActiveId, setMockActiveId] = useState<string | null>(null)
  const [mockLog, setMockLog] = useState<string[]>(['Initializing Playwright browser...', 'Launching Chromium headless...'])

  const isReal = !!(sessionId || pendingScanUrl)

  // ── Kick off scan when arriving with a pending URL ──
  useEffect(() => {
    if (!pendingScanUrl || sessionId) return
    setRealLog(['Connecting to backend...', `Starting scan of ${pendingScanUrl}...`])
    setRealPhase('crawling')
    startScan(pendingScanUrl, pendingScanSettings ?? {})
      .then(({ sessionId: newId }) => {
        setSessionId(newId)
        sessionIdRef.current = newId
        onSessionReady?.(newId)
        setScanUrl(pendingScanUrl)
        setRealLog(l => [...l, 'Connected — scanning in progress...'])
      })
      .catch(err => {
        setRealPhase('error')
        setRealLog(l => [...l, `Error: ${err.message || 'Failed to start scan. Is the backend running on port 3001?'}`])
      })
  }, [pendingScanUrl])

  // ── Real SSE connection ──
  useEffect(() => {
    if (!sessionId) return

    const es = createEventSource(sessionId)
    esRef.current = es

    es.addEventListener('log', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      setRealLog(l => [...l.slice(-30), data.msg])
    })

    es.addEventListener('pages_discovered', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const pages: RealPage[] = data.pages.map((p: any, i: number) => {
        const style = pageToMockStyle(i)
        const urlObj = new URL(p.url)
        return {
          url: p.url,
          title: p.title,
          depth: p.depth,
          category: p.category,
          index: i,
          id: `page-${i}`,
          accent: style.accent,
          gradient: style.gradient,
          captured: false,
          path: urlObj.pathname || '/',
        }
      })
      setRealPages(pages)
      setScanUrl(data.pages[0]?.url || '')
      setRealPhase('screenshotting')
      setRealLog(l => [...l.slice(-30), `Found ${data.total} pages to scan`])
    })

    es.addEventListener('page_start', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      setActiveUrl(data.url)
    })

    es.addEventListener('screenshot_captured', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const ss: Screenshot = data.screenshot
      setRealScreenshots(prev => [...prev, ss])
      setRealPages(prev => prev.map(p =>
        p.url === ss.url ? { ...p, captured: true, screenshot: ss, title: ss.title } : p
      ))
    })

    es.addEventListener('preview_ready', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      setActiveUrl(null)
      setSelectedUrls(new Set(data.remainingPages.map((p: any) => p.url)))
      setRemainingCount(data.remainingPages.length)
      setRealPhase('preview_ready')
      setShowContinuePrompt(true)
      setRealLog(l => [...l.slice(-30), `${data.previewCount} pages captured — waiting for your input…`])
    })

    es.addEventListener('page_error', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      setRealLog(l => [...l.slice(-30), `✗ ${data.url}: ${data.error}`])
    })

    es.addEventListener('video_ready', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      setRealLog(l => [...l.slice(-30), `Video ready: ${data.videoPath}`])
    })

    es.addEventListener('scan_complete', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      setRealPhase('done')
      setRealScreenshots(data.screenshots)
      setRealPages(prev => prev.map(p => {
        const ss = data.screenshots.find((s: Screenshot) => s.url === p.url)
        return ss ? { ...p, captured: true, screenshot: ss, title: ss.title } : p
      }))
      setRealLog(l => [...l.slice(-30), `Scan complete — ${data.totalScreenshots} screenshots captured`])
      // Fresh scan from home (no preview_ready fired) → auto-navigate to gallery
      if (fromHomeRef.current) {
        fromHomeRef.current = false
        navigate('gallery', { sessionId: sessionIdRef.current })
      }
    })

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setRealPhase('error')
        setRealLog(l => [...l.slice(-30), `Error: ${data.message}`])
      } catch {
        // connection error
      }
    })

    return () => {
      es.close()
      esRef.current = null
    }
  }, [sessionId])

  // ── Mock mode simulation ──
  useEffect(() => {
    if (isReal) return
    let idx = 0
    const pages = [...PAGES]
    const interval = setInterval(() => {
      if (idx < pages.length) {
        const p = pages[idx]
        setMockDiscovered(d => [...d, p])
        setMockActiveId(p.id)
        setMockLog(l => [...l.slice(-8), `→ ${p.path} — discovered`])
        idx++
        setMockProgress((idx / pages.length) * 60)
      } else {
        clearInterval(interval)
        setMockPhase('screenshotting')
        let capIdx = 0
        const capInterval = setInterval(() => {
          const p = pages.filter(x => x.captured)[capIdx]
          if (!p || capIdx >= pages.filter(x => x.captured).length) {
            clearInterval(capInterval)
            setMockPhase('done')
            setMockProgress(100)
            return
          }
          setMockCaptured(c => c + 1)
          setMockActiveId(p.id)
          setMockLog(l => [...l.slice(-8), `📸 ${p.path} — screenshot captured`])
          capIdx++
          setMockProgress(60 + (capIdx / pages.filter(x => x.captured).length) * 40)
        }, 350)
      }
    }, 280)
    return () => clearInterval(interval)
  }, [isReal])

  async function handleContinue() {
    if (!sessionId) return
    setShowContinuePrompt(false)
    setRealPhase('screenshotting')
    setRealLog(l => [...l, `Continuing — ${selectedUrls.size} pages selected...`])
    try {
      await continueScan(sessionId, Array.from(selectedUrls))
    } catch (err: any) {
      setRealPhase('error')
      setRealLog(l => [...l, `Error continuing scan: ${err.message}`])
    }
  }

  function toggleUrl(url: string) {
    setSelectedUrls(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  if (isReal) {
    const totalPages = realPages.length
    const capturedCount = realScreenshots.length
    const uncapturedPages = realPages.filter(p => !p.captured)
    const progress = totalPages === 0
      ? (realPhase === 'crawling' ? 5 : 0)
      : realPhase === 'done'
        ? 100
        : realPhase === 'preview_ready'
          ? (capturedCount / totalPages) * 100
          : (capturedCount / totalPages) * 100

    const displayUrl = scanUrl || sessionId
    const hostname = scanUrl ? (() => { try { return new URL(scanUrl).hostname } catch { return scanUrl } })() : ''

    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg-1)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(99,102,241,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Globe size={14} color="#a78bfa" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                Scanning {hostname || 'website'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace'" }}>
                {displayUrl}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="pulse-dot" style={{
                width: 6, height: 6, borderRadius: '50%',
                background: realPhase === 'done' ? '#34d399' : realPhase === 'error' ? '#f87171' : realPhase === 'preview_ready' ? '#fbbf24' : '#6366f1',
              }} />
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {totalPages} pages found · {capturedCount} screenshots captured
              </span>
            </div>
            {realPhase === 'done' && (
              <button className="btn-primary" onClick={() => navigate('gallery', { sessionId })}>
                View Gallery <ChevronRight size={13} />
              </button>
            )}
            {realPhase === 'preview_ready' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {selectedUrls.size} of {uncapturedPages.length} selected
                </span>
                <button
                  className="btn-primary"
                  onClick={handleContinue}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Continue <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 2, background: 'var(--bg-3)', flexShrink: 0, position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            background: realPhase === 'error' ? '#f87171' : realPhase === 'preview_ready' ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #6366f1, #a78bfa)',
            width: `${progress}%`,
            transition: 'width 0.4s ease',
            boxShadow: realPhase === 'preview_ready' ? '0 0 12px rgba(251,191,36,0.5)' : '0 0 12px rgba(99,102,241,0.5)',
          }} />
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: Site tree with page selection */}
          <div style={{
            width: 280, flexShrink: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-1)',
            overflow: 'auto', padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Site Map
              </div>
              {realPhase === 'preview_ready' && uncapturedPages.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setSelectedUrls(new Set(uncapturedPages.map(p => p.url)))}
                    style={{ fontSize: 10, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedUrls(new Set())}
                    style={{ fontSize: 10, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                  >
                    None
                  </button>
                </div>
              )}
            </div>
            {realPhase === 'preview_ready' && (
              <div style={{
                fontSize: 10, color: '#fbbf24', marginBottom: 10,
                padding: '6px 8px', borderRadius: 6,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              }}>
                Preview complete. Check the pages you want to capture next.
              </div>
            )}
            <RealSiteTree
              pages={realPages}
              activeUrl={activeUrl}
              previewMode={realPhase === 'preview_ready'}
              selectedUrls={selectedUrls}
              onToggle={toggleUrl}
            />
          </div>

          {/* Center: Live preview grid */}
          <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
              {realPhase === 'crawling' ? 'Discovering pages...'
                : realPhase === 'screenshotting' ? 'Capturing screenshots...'
                : realPhase === 'preview_ready' ? '✋ Preview ready — select pages above to continue'
                : realPhase === 'done' ? '✓ Scan complete'
                : '✗ Error'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {realPages.map((page, i) => (
                <RealLiveCard
                  key={page.id}
                  page={page}
                  active={page.url === activeUrl}
                  index={i}
                  dimmed={realPhase === 'preview_ready' && !page.captured && !selectedUrls.has(page.url)}
                />
              ))}
              {realPhase === 'crawling' && (
                <div className="shimmer" style={{ height: 130, borderRadius: 10, border: '1px solid var(--border)' }} />
              )}
            </div>
          </div>

          {/* Right: Log */}
          <div style={{
            width: 220, flexShrink: 0,
            borderLeft: '1px solid var(--border)',
            background: 'var(--bg-1)',
            overflow: 'auto', padding: 14,
            fontFamily: "'DM Mono', monospace",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
              Console
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {realLog.map((line, i) => (
                <div key={i} style={{ fontSize: 10, color: i === realLog.length - 1 ? '#a78bfa' : 'var(--text-3)', lineHeight: 1.5 }}>
                  {line}
                </div>
              ))}
              {realPhase !== 'done' && realPhase !== 'error' && realPhase !== 'preview_ready' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Loader2 size={9} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 10, color: '#6366f1' }}>running</span>
                </div>
              )}
              {realPhase === 'preview_ready' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} />
                  <span style={{ fontSize: 10, color: '#fbbf24' }}>paused</span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* ── Continue Prompt Modal ── */}
        {showContinuePrompt && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 32px',
              maxWidth: 380,
              width: '90%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', gap: 20,
              animation: 'popIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              {/* Icon + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(251,191,36,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18 }}>✋</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>
                    Preview ready
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                    {realScreenshots.length} pages captured
                    {remainingCount > 0 ? ` · ${remainingCount} more found` : ''}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{
                fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65,
                padding: '12px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
              }}>
                {remainingCount > 0
                  ? <>Scan <strong style={{ color: 'var(--text-1)' }}>{Math.min(5, remainingCount)} more page{Math.min(5, remainingCount) !== 1 ? 's' : ''}</strong> from the remaining {remainingCount}? Or head straight to the gallery with what you have.</>
                  : <>All discovered pages have been captured. Head to the gallery to review your screenshots.</>
                }
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setShowContinuePrompt(false)
                    navigate('gallery', { sessionId })
                  }}
                  style={{ flex: 1, fontSize: 13, padding: '9px 0', justifyContent: 'center' }}
                >
                  Done — view gallery
                </button>
                {remainingCount > 0 && (
                  <button
                    className="btn-primary"
                    onClick={handleContinue}
                    style={{ flex: 1, fontSize: 13, padding: '9px 0', justifyContent: 'center' }}
                  >
                    Scan {Math.min(5, remainingCount)} more ↗
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes popIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    )
  }

  // ── Mock UI (no session) ──
  const mockCapturedPages = mockDiscovered.filter(p => p.captured)

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-1)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'rgba(99,102,241,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={14} color="#a78bfa" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Scanning acme.io</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace'" }}>https://acme.io</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: mockPhase === 'done' ? '#34d399' : '#6366f1' }} />
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {mockDiscovered.length} pages found · {mockCaptured} screenshots captured
            </span>
          </div>
          {mockPhase === 'done' && (
            <button className="btn-primary" onClick={() => navigate('gallery')}>
              View Gallery <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'var(--bg-3)', flexShrink: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
          width: `${mockProgress}%`,
          transition: 'width 0.3s ease',
          boxShadow: '0 0 12px rgba(99,102,241,0.5)',
        }} />
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          width: 280, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-1)',
          overflow: 'auto', padding: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
            Site Map
          </div>
          <SiteTree pages={mockDiscovered} activeId={mockActiveId} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
            {mockPhase === 'crawling' ? 'Crawling pages...' : mockPhase === 'screenshotting' ? 'Capturing screenshots...' : '✓ Scan complete'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {mockDiscovered.map((page, i) => (
              <LiveCard key={page.id} page={page} active={page.id === mockActiveId} index={i} captured={mockCapturedPages.includes(page)} />
            ))}
            {mockPhase === 'crawling' && (
              <div className="shimmer" style={{ height: 130, borderRadius: 10, border: '1px solid var(--border)' }} />
            )}
          </div>
        </div>

        <div style={{
          width: 220, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-1)',
          overflow: 'auto', padding: 14,
          fontFamily: "'DM Mono', monospace",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
            Console
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {mockLog.map((line, i) => (
              <div key={i} style={{ fontSize: 10, color: i === mockLog.length - 1 ? '#a78bfa' : 'var(--text-3)', lineHeight: 1.5 }}>
                {line}
              </div>
            ))}
            {mockPhase !== 'done' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Loader2 size={9} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 10, color: '#6366f1' }}>running</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Real page live card ──────────────────────────────────────────────────────
function RealLiveCard({ page, active, index, dimmed }: { page: RealPage; active: boolean; index: number; dimmed?: boolean }) {
  return (
    <div className="node-pop" style={{
      borderRadius: 10, overflow: 'hidden',
      border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--border)',
      background: page.gradient,
      boxShadow: active ? '0 0 20px rgba(99,102,241,0.2)' : 'none',
      animationDelay: `${index * 0.04}s`,
      opacity: dimmed ? 0.35 : 0,
      position: 'relative',
      transition: 'opacity 0.2s',
    }}>
      <div style={{ height: 85, position: 'relative', overflow: 'hidden' }}>
        {page.screenshot ? (
          <img
            src={page.screenshot.webPath}
            alt={page.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          <>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 18, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', padding: '0 7px', gap: 4 }}>
              {['#ff5f57','#febc2e','#28c840'].map((c,i) => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ padding: '22px 10px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ height: 5, width: '55%', borderRadius: 2, background: `${page.accent}60` }} />
              <div style={{ height: 3, width: '75%', borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ height: 3, width: '60%', borderRadius: 2, background: 'rgba(255,255,255,0.07)' }} />
            </div>
          </>
        )}
        {active && !page.screenshot && <div className="scan-line" />}
      </div>
      <div style={{
        padding: '5px 8px',
        background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{page.title}</span>
        {page.captured ? <CheckCircle2 size={11} color="#34d399" /> : <Circle size={11} color="var(--text-3)" />}
      </div>
    </div>
  )
}

// ─── Real site tree with optional checkbox selection ──────────────────────────
function RealSiteTree({
  pages, activeUrl, previewMode, selectedUrls, onToggle,
}: {
  pages: RealPage[]
  activeUrl: string | null
  previewMode?: boolean
  selectedUrls?: Set<string>
  onToggle?: (url: string) => void
}) {
  return (
    <div>
      {pages.map((page) => {
        const isSelectable = previewMode && !page.captured
        const isSelected = selectedUrls?.has(page.url) ?? false
        return (
          <div key={page.id} style={{ marginLeft: page.depth * 14 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', borderRadius: 6, marginBottom: 1,
                background: page.url === activeUrl ? 'rgba(99,102,241,0.1)' : 'transparent',
                cursor: isSelectable ? 'pointer' : 'default',
                userSelect: 'none',
              }}
              onClick={() => isSelectable && onToggle?.(page.url)}
            >
              {page.depth > 0 && <div style={{ width: 1, height: 14, background: 'var(--border)', marginRight: 4, flexShrink: 0 }} />}
              {isSelectable ? (
                <div style={{
                  width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                  background: isSelected ? '#6366f1' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {isSelected && (
                    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                      <path d="M1 2.5L2.8 4.2L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ) : (
                <div style={{ width: 6, height: 6, borderRadius: 2, background: page.accent, flexShrink: 0 }} />
              )}
              <span style={{
                fontSize: 11, flex: 1,
                color: isSelectable
                  ? (isSelected ? 'var(--text-1)' : 'var(--text-3)')
                  : (page.url === activeUrl ? '#a78bfa' : 'var(--text-2)'),
                fontFamily: "'DM Mono', monospace",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {page.path}
              </span>
              {page.captured && <CheckCircle2 size={9} color="#34d399" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Mock components ──────────────────────────────────────────────────────────
function LiveCard({ page, active, index, captured }: { page: any; active: boolean; index: number; captured: boolean }) {
  return (
    <div className="node-pop" style={{
      borderRadius: 10, overflow: 'hidden',
      border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid var(--border)',
      background: page.gradient,
      boxShadow: active ? '0 0 20px rgba(99,102,241,0.2)' : 'none',
      animationDelay: `${index * 0.04}s`,
      opacity: 0,
      position: 'relative',
    }}>
      <div style={{ height: 85, padding: '22px 10px 6px', display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 18, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', padding: '0 7px', gap: 4 }}>
          {['#ff5f57','#febc2e','#28c840'].map((c,i) => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ height: 5, width: '55%', borderRadius: 2, background: `${page.accent}60` }} />
        <div style={{ height: 3, width: '75%', borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ height: 3, width: '60%', borderRadius: 2, background: 'rgba(255,255,255,0.07)' }} />
        {active && <div className="scan-line" />}
      </div>
      <div style={{
        padding: '5px 8px',
        background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-1)' }}>{page.title}</span>
        {captured ? <CheckCircle2 size={11} color="#34d399" /> : <Circle size={11} color="var(--text-3)" />}
      </div>
    </div>
  )
}

function SiteTree({ pages, activeId }: { pages: any[]; activeId: string | null }) {
  const roots = pages.filter(p => p.depth === 0)
  const renderNode = (page: any, depth: number) => {
    const children = pages.filter(p => page.children?.includes(p.id))
    return (
      <div key={page.id} style={{ marginLeft: depth * 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 6px', borderRadius: 6, marginBottom: 1,
          background: page.id === activeId ? 'rgba(99,102,241,0.1)' : 'transparent',
          cursor: 'pointer', transition: 'background 0.15s',
        }}>
          {depth > 0 && <div style={{ width: 1, height: 14, background: 'var(--border)', marginRight: 4, flexShrink: 0 }} />}
          <div style={{ width: 6, height: 6, borderRadius: 2, background: page.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: page.id === activeId ? '#a78bfa' : 'var(--text-2)', flex: 1, fontFamily: "'DM Mono', monospace'" }}>
            {page.path}
          </span>
          {page.captured && <CheckCircle2 size={9} color="#34d399" />}
        </div>
        {children.map(c => renderNode(c, depth + 1))}
      </div>
    )
  }
  return <div>{roots.map(p => renderNode(p, 0))}</div>
}
