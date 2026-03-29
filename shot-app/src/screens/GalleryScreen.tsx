import { useState, useEffect, useRef } from 'react'
import { Search, LayoutGrid, Rows3, Wand2, ChevronRight, Loader2, Plus, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react'
import type { Screen, NavigateMeta } from '../App'
import { PAGES, CATEGORIES } from '../data/mockData'
import ScreenshotCard from '../components/ScreenshotCard'
import { getScan, createEventSource, continueScan } from '../lib/api'
import { showToast } from '../lib/toast'
import type { Screenshot } from '../lib/api'

interface Props {
  navigate: (s: Screen, meta?: NavigateMeta) => void
  sessionId?: string
}

function screenshotToPageData(ss: Screenshot, index: number) {
  const ACCENT_POOL = ['#6366f1','#8b5cf6','#3b82f6','#34d399','#fbbf24','#f87171','#a78bfa','#60a5fa']
  const GRADIENT_POOL = [
    'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
    'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
    'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
    'linear-gradient(135deg, #0f1a0f 0%, #162816 100%)',
    'linear-gradient(135deg, #1a140a 0%, #2a1f0a 100%)',
  ]
  return {
    id: ss.id,
    path: (() => { try { return new URL(ss.url).pathname || '/' } catch { return ss.url } })(),
    title: ss.title,
    category: ss.category,
    color: '#0d1117',
    gradient: GRADIENT_POOL[index % GRADIENT_POOL.length],
    accent: ACCENT_POOL[index % ACCENT_POOL.length],
    captured: true,
    depth: ss.depth,
    webPath: ss.webPath,
    url: ss.url,
  }
}

export default function GalleryScreen({ navigate, sessionId }: Props) {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [layout, setLayout] = useState<'grid' | 'masonry'>('grid')

  // Real data
  const [realScreenshots, setRealScreenshots] = useState<ReturnType<typeof screenshotToPageData>[]>([])
  const [loading, setLoading] = useState(false)
  const [scanUrl, setScanUrl] = useState('')
  const isReal = !!sessionId

  // Continue scan state
  const [sessionStatus, setSessionStatus] = useState<string>('')
  const [remainingPages, setRemainingPages] = useState<Array<{url: string; title: string; depth: number; path?: string}>>([])
  const [continueExpanded, setContinueExpanded] = useState(true)
  const [continueSelected, setContinueSelected] = useState<Set<string>>(new Set())
  const [continuing, setContinuing] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    getScan(sessionId)
      .then(session => {
        const pages = session.screenshots.map((ss, i) => screenshotToPageData(ss, i))
        setRealScreenshots(pages)
        setScanUrl(session.url)
        setSessionStatus(session.status)
        if (session.status === 'preview_ready' && (session as any).remainingPages) {
          const rem = (session as any).remainingPages.map((p: any) => ({
            ...p,
            path: (() => { try { return new URL(p.url).pathname || '/' } catch { return p.url } })(),
          }))
          setRemainingPages(rem)
          setContinueSelected(new Set(rem.map((p: any) => p.url)))
        }
      })
      .catch(err => console.error('Failed to load session:', err))
      .finally(() => setLoading(false))
  }, [sessionId])

  // Subscribe to SSE for live updates when scan is running or in preview_ready
  useEffect(() => {
    if (!sessionId) return
    if (sessionStatus !== 'preview_ready' && sessionStatus !== 'running' && sessionStatus !== 'pending') return

    const es = createEventSource(sessionId)
    esRef.current = es

    es.addEventListener('screenshot_captured', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      const ss: Screenshot = data.screenshot
      setRealScreenshots(prev => {
        if (prev.find(p => p.id === ss.id)) return prev
        return [...prev, screenshotToPageData(ss, prev.length)]
      })
    })

    es.addEventListener('scan_complete', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      setRealScreenshots(data.screenshots.map((ss: Screenshot, i: number) => screenshotToPageData(ss, i)))
      setSessionStatus('complete')
      setContinuing(false)
      setRemainingPages([])
      showToast(`Scan complete — ${data.screenshots.length} screenshots captured`, 'success')
    })

    es.addEventListener('preview_ready', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      setSessionStatus('preview_ready')
      setContinuing(false)
      const rem = (data.remainingPages || []).map((p: any) => ({
        ...p,
        path: (() => { try { return new URL(p.url).pathname || '/' } catch { return p.url } })(),
      }))
      setRemainingPages(rem)
      setContinueSelected(new Set(rem.map((p: any) => p.url)))
    })

    return () => { es.close(); esRef.current = null }
  }, [sessionId, sessionStatus])

  async function handleContinue() {
    if (!sessionId) return
    setContinuing(true)
    setSessionStatus('running')
    showToast(`Capturing ${continueSelected.size} more pages…`, 'info')
    try {
      await continueScan(sessionId, Array.from(continueSelected))
    } catch {
      setContinuing(false)
      setSessionStatus('preview_ready')
      showToast('Failed to continue scan', 'error')
    }
  }

  const sourcePages = isReal ? realScreenshots : PAGES.filter(p => p.captured)
  const categories = isReal
    ? ['All', ...Array.from(new Set(realScreenshots.map(p => p.category)))]
    : CATEGORIES

  const filtered = sourcePages.filter(p =>
    (category === 'All' || p.category === category) &&
    (search === '' || p.title.toLowerCase().includes(search.toLowerCase()) || p.path.includes(search))
  )

  const toggle = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  const displayUrl = isReal
    ? (() => { try { return new URL(scanUrl).hostname } catch { return scanUrl } })()
    : 'acme.io'

  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
        <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Loading screenshots...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)', flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Screenshot Gallery</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {displayUrl} · {sourcePages.length} {sourcePages.length === 1 ? 'capture' : 'captures'}
              {continuing && <span style={{ marginLeft: 8, color: '#6366f1' }}><Loader2 size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3, animation: 'spin 1s linear infinite' }} />scanning more...</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {selectMode && selected.size > 0 && (
              <button className="btn-primary" onClick={() => navigate('canvas', sessionId ? { sessionId } : undefined)} style={{ fontSize: 12 }}>
                <Wand2 size={13} /> Edit {selected.size} in Canvas
              </button>
            )}
            <button
              className="btn-ghost"
              onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelected(new Set()) }}
              style={{ fontSize: 12 }}
            >
              {selectMode ? 'Cancel' : 'Select'}
            </button>
            <button className="btn-primary" onClick={() => navigate('canvas', sessionId ? { sessionId } : undefined)} style={{ fontSize: 12 }}>
              Open Canvas <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '5px 10px', flex: 1, maxWidth: 260,
          }}>
            <Search size={13} color="var(--text-3)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pages..."
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 12, flex: 1 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                background: category === cat ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: category === cat ? '#a78bfa' : 'var(--text-3)',
                border: `1px solid ${category === cat ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                transition: 'all 0.15s', fontWeight: category === cat ? 500 : 400,
              }}>
                {cat}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {selectMode && (
            <button className="btn-ghost" onClick={() => {
              if (selected.size === filtered.length) setSelected(new Set())
              else setSelected(new Set(filtered.map(p => p.id)))
            }} style={{ fontSize: 11 }}>
              {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
          )}

          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 7, padding: 2 }}>
            {[['grid', LayoutGrid], ['masonry', Rows3]].map(([l, Icon]: any) => (
              <button key={l} onClick={() => setLayout(l)} style={{
                padding: '4px 6px', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center',
                background: layout === l ? 'rgba(99,102,241,0.2)' : 'transparent',
                border: 'none', color: layout === l ? '#a78bfa' : 'var(--text-3)',
              }}>
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Continue Scan Banner */}
      {isReal && sessionStatus === 'preview_ready' && remainingPages.length > 0 && (
        <div style={{
          borderBottom: '1px solid rgba(99,102,241,0.2)',
          background: 'rgba(99,102,241,0.06)',
          flexShrink: 0,
        }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 20px', cursor: 'pointer',
            }}
            onClick={() => setContinueExpanded(e => !e)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>
                {remainingPages.length} more pages discovered
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                — select which to capture next
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!continueExpanded && (
                <button
                  className="btn-primary"
                  onClick={e => { e.stopPropagation(); handleContinue() }}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Plus size={12} /> Continue Scanning
                </button>
              )}
              {continueExpanded ? <ChevronUp size={14} color="var(--text-3)" /> : <ChevronDown size={14} color="var(--text-3)" />}
            </div>
          </div>

          {continueExpanded && (
            <div style={{ padding: '0 20px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setContinueSelected(new Set(remainingPages.map(p => p.url)))}
                  style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <CheckSquare size={12} /> Select all
                </button>
                <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>
                <button
                  onClick={() => setContinueSelected(new Set())}
                  style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Square size={12} /> None
                </button>
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>
                  {continueSelected.size} of {remainingPages.length} selected
                </span>
                <div style={{ flex: 1 }} />
                <button
                  className="btn-primary"
                  onClick={handleContinue}
                  disabled={continueSelected.size === 0 || continuing}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, opacity: continueSelected.size === 0 ? 0.5 : 1 }}
                >
                  {continuing
                    ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</>
                    : <><Plus size={12} /> Capture {continueSelected.size} pages</>}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {remainingPages.map(page => {
                  const isSelected = continueSelected.has(page.url)
                  return (
                    <button
                      key={page.url}
                      onClick={() => {
                        setContinueSelected(prev => {
                          const next = new Set(prev)
                          if (next.has(page.url)) next.delete(page.url)
                          else next.add(page.url)
                          return next
                        })
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                        background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                        color: isSelected ? '#a78bfa' : 'var(--text-3)',
                        fontSize: 11, fontFamily: "'DM Mono', monospace",
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 10, height: 10, borderRadius: 2, flexShrink: 0,
                        border: `1.5px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.2)'}`,
                        background: isSelected ? '#6366f1' : 'transparent',
                      }} />
                      {page.path || page.url}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gallery */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16, position: 'relative' }}>
        {layout === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {filtered.map(page => (
              <ScreenshotCard
                key={page.id}
                page={page}
                selected={selected.has(page.id)}
                onSelect={() => selectMode && toggle(page.id)}
                showSelect={selectMode}
              />
            ))}
            {continuing && (
              <div style={{
                height: 180, borderRadius: 10, border: '1px dashed rgba(99,102,241,0.3)',
                background: 'rgba(99,102,241,0.04)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Loader2 size={18} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Capturing...</span>
              </div>
            )}
          </div>
        ) : (
          <MasonryLayout pages={filtered} selected={selected} selectMode={selectMode} toggle={toggle} />
        )}

        {filtered.length === 0 && !loading && !continuing && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {sourcePages.length === 0 ? (
              <>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 22 }}>📸</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>No screenshots yet</div>
                <div style={{ fontSize: 12, maxWidth: 240, lineHeight: 1.5 }}>
                  {isReal ? 'This scan captured 0 pages. Try starting a new scan.' : 'Scan a website to see screenshots appear here.'}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 22 }}>🔍</div>
                <div style={{ fontSize: 13 }}>No pages match this filter</div>
                <button className="btn-ghost" style={{ fontSize: 12, marginTop: 4 }} onClick={() => { setSearch(''); setCategory('All') }}>Clear filters</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Selection bar */}
      {selectMode && selected.size > 0 && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-2)', border: '1px solid var(--border-med)',
          borderRadius: 12, padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          zIndex: 20,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>
            {selected.size} selected
          </span>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <button className="btn-primary" onClick={() => navigate('canvas', sessionId ? { sessionId } : undefined)} style={{ fontSize: 12 }}>
            <Wand2 size={13} /> Open in Canvas
          </button>
          <button className="btn-ghost" onClick={() => navigate('export', sessionId ? { sessionId } : undefined)} style={{ fontSize: 12 }}>
            Export
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function MasonryLayout({ pages, selected, selectMode, toggle }: any) {
  const cols = [pages.filter((_:any,i:number) => i % 3 === 0), pages.filter((_:any,i:number) => i % 3 === 1), pages.filter((_:any,i:number) => i % 3 === 2)]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, alignItems: 'start' }}>
      {cols.map((col: any[], ci: number) => (
        <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {col.map((page: any, i: number) => (
            <ScreenshotCard
              key={page.id}
              page={page}
              selected={selected.has(page.id)}
              onSelect={() => selectMode && toggle(page.id)}
              showSelect={selectMode}
              style={{ height: i % 2 === 0 ? 160 : 200 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
