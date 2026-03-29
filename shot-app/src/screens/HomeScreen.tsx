import { useState, useEffect, useRef } from 'react'
import { ArrowRight, Globe, Zap, Camera, Film, Map } from 'lucide-react'
import type { Screen, NavigateMeta } from '../App'
import { useAuth } from '../contexts/AuthContext'
import UpgradeModal from '../components/UpgradeModal'

interface Props { navigate: (s: Screen, meta?: NavigateMeta) => void }

const FEATURES = [
  { icon: Globe,  label: 'Deep crawl any site' },
  { icon: Camera, label: 'HD full-page captures' },
  { icon: Zap,    label: 'AI-curated sequence' },
  { icon: Film,   label: 'Video walkthrough' },
  { icon: Map,    label: 'Complete site map' },
]

const SLIDES = [
  {
    url: 'stripe.com', label: 'Stripe', color: '#635bff', dim: '#2d2066',
    bg: 'linear-gradient(160deg,#100a2e 0%,#060311 100%)',
    tagline: 'Payment flows, pricing pages, every checkout screen — documented.',
    pages: ['Home','Pricing','Docs','Payments','Terminal','Billing','Connect'],
    rows: [{ w: '68%', c: '#635bff' },{ w: '88%', c: 'rgba(255,255,255,0.07)' },{ w: '52%', c: 'rgba(255,255,255,0.04)' }],
  },
  {
    url: 'tesla.com', label: 'Tesla', color: '#e82127', dim: '#5a0a0c',
    bg: 'linear-gradient(160deg,#180000 0%,#060606 100%)',
    tagline: 'Product launches, feature rollouts, press assets — auto-captured.',
    pages: ['Model S','Model 3','Cybertruck','Solar','Powerwall','Shop','News'],
    rows: [{ w: '75%', c: '#e82127' },{ w: '60%', c: 'rgba(255,255,255,0.07)' },{ w: '70%', c: 'rgba(255,255,255,0.04)' }],
  },
  {
    url: 'zenai.world', label: 'ZenAI', color: '#6366f1', dim: '#252580',
    bg: 'linear-gradient(160deg,#0d0d20 0%,#06060f 100%)',
    tagline: 'Your entire SaaS — fully visualised before the first demo call.',
    pages: ['Home','Features','Pricing','Blog','Docs','API','Login'],
    rows: [{ w: '62%', c: '#6366f1' },{ w: '82%', c: 'rgba(255,255,255,0.07)' },{ w: '48%', c: 'rgba(255,255,255,0.04)' }],
  },
  {
    url: 'anthropic.com', label: 'Anthropic', color: '#d97706', dim: '#5a3002',
    bg: 'linear-gradient(160deg,#180d00 0%,#080603 100%)',
    tagline: 'Research, model releases, blog posts — captured and ready to share.',
    pages: ['Home','Claude','Research','Careers','Policy','News','About'],
    rows: [{ w: '72%', c: '#d97706' },{ w: '88%', c: 'rgba(255,255,255,0.07)' },{ w: '58%', c: 'rgba(255,255,255,0.04)' }],
  },
  {
    url: 'nvidia.com', label: 'NVIDIA', color: '#76b900', dim: '#2e4800',
    bg: 'linear-gradient(160deg,#060b00 0%,#050605 100%)',
    tagline: 'Track competitors, map their entire site — in seconds.',
    pages: ['Home','GPUs','AI','Data Center','Laptops','Studio','Drivers'],
    rows: [{ w: '55%', c: '#76b900' },{ w: '78%', c: 'rgba(255,255,255,0.07)' },{ w: '66%', c: 'rgba(255,255,255,0.04)' }],
  },
]

/* ── Live scanner hero ──────────────────────────────────────────────────── */
function HeroScanner({ slide, scanPct }: { slide: typeof SLIDES[0]; scanPct: number }) {
  const capturedCount = Math.min(slide.pages.length, Math.floor(scanPct / 14))
  return (
    <div style={{
      width: '100%', borderRadius: 14,
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${slide.color}25`,
      boxShadow: `0 0 0 1px ${slide.color}15, 0 24px 80px rgba(0,0,0,0.7), 0 0 60px ${slide.color}12`,
      overflow: 'hidden',
      transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
    }}>
      {/* Chrome bar */}
      <div style={{ padding: '9px 12px', background: 'rgba(0,0,0,0.6)', borderBottom: `1px solid ${slide.color}18`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57','#febc2e','#28c840'].map((c,i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', paddingLeft: 10, gap: 6, overflow: 'hidden' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: slide.color, flexShrink: 0 }} className="pulse-dot" />
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'DM Mono',monospace", whiteSpace: 'nowrap' }}>{slide.url}</span>
        </div>
        {/* Live % counter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, background: `${slide.color}18`, border: `1px solid ${slide.color}30` }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: slide.color }} className="pulse-dot" />
          <span style={{ fontSize: 10, color: slide.color, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{Math.round(scanPct)}%</span>
        </div>
      </div>

      {/* Viewport */}
      <div style={{ position: 'relative', height: 200, background: slide.bg, overflow: 'hidden', padding: '14px 16px' }}>

        {/* Corner brackets */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i) => (
          <div key={i} style={{
            position: 'absolute', [v]: 6, [h]: 6,
            width: 12, height: 12,
            borderTop:    v==='top'    ? `2px solid ${slide.color}` : 'none',
            borderBottom: v==='bottom' ? `2px solid ${slide.color}` : 'none',
            borderLeft:   h==='left'  ? `2px solid ${slide.color}` : 'none',
            borderRight:  h==='right' ? `2px solid ${slide.color}` : 'none',
            boxShadow: `0 0 6px ${slide.color}80`,
            zIndex: 4,
          }} />
        ))}

        {/* Scan shadow trail */}
        <div style={{
          position: 'absolute', left: 0, right: 0, zIndex: 1,
          top: `${scanPct}%`, height: 60,
          background: `linear-gradient(to bottom, ${slide.color}20 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        {/* Primary scan line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2, zIndex: 3,
          top: `${scanPct}%`,
          background: `linear-gradient(90deg,
            transparent 0%,
            ${slide.color}80 5%,
            #ffffff 40%,
            ${slide.color} 55%,
            #ffffff 70%,
            ${slide.color}80 95%,
            transparent 100%
          )`,
          boxShadow: `0 0 8px 2px ${slide.color}, 0 0 20px 4px ${slide.color}80, 0 0 40px 8px ${slide.color}30`,
          transition: 'top 0.04s linear',
        }} />

        {/* Secondary trailing line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 1, zIndex: 2,
          top: `${Math.max(0, scanPct - 3)}%`,
          background: `linear-gradient(90deg, transparent 10%, ${slide.color}55 50%, transparent 90%)`,
          boxShadow: `0 0 6px ${slide.color}50`,
          transition: 'top 0.04s linear',
          opacity: 0.6,
        }} />

        {/* Content blocks — fade in as scan passes */}
        <div style={{ position: 'relative', zIndex: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {slide.rows.map((row, i) => (
            <div key={i} style={{
              height: i === 0 ? 22 : 11,
              width: row.w, borderRadius: 5,
              background: row.c,
              opacity: scanPct > (i * 25) ? 1 : 0.2,
              transition: 'opacity 0.45s ease',
            }} />
          ))}
          <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
            <div style={{ height: 26, width: 80, borderRadius: 6, background: slide.color, opacity: scanPct > 55 ? 1 : 0.15, transition: 'opacity 0.45s ease' }} />
            <div style={{ height: 26, width: 62, borderRadius: 6, background: 'rgba(255,255,255,0.06)', opacity: scanPct > 55 ? 1 : 0.15, transition: 'opacity 0.45s ease' }} />
          </div>
          {/* Thumbnail cards */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {[38, 28, 34].map((w, i) => (
              <div key={i} style={{
                height: 50, width: `${w}%`,
                borderRadius: 7,
                background: `${slide.color}12`,
                border: `1px solid ${slide.color}20`,
                opacity: scanPct > (55 + i * 13) ? 1 : 0.1,
                transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                transform: scanPct > (55 + i * 13) ? 'scale(1)' : 'scale(0.9)',
                boxShadow: scanPct > (55 + i * 13) ? `0 0 10px ${slide.color}25` : 'none',
              }} />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.03)' }}>
          <div style={{
            height: '100%', width: `${scanPct}%`,
            background: `linear-gradient(90deg, ${slide.dim}, ${slide.color})`,
            boxShadow: `0 0 8px ${slide.color}`,
            transition: 'width 0.04s linear',
          }} />
        </div>
      </div>

      {/* Captured pages strip */}
      <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.45)', borderTop: `1px solid ${slide.color}12`, display: 'flex', gap: 5, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 4, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
          {capturedCount}/{slide.pages.length}
        </span>
        <div style={{ display: 'flex', gap: 3, flex: 1 }}>
          {slide.pages.map((pg, i) => {
            const done = i < capturedCount
            return (
              <div key={i} style={{
                flex: 1, height: 24, borderRadius: 4,
                background: done ? `${slide.color}28` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${done ? slide.color + '60' : 'rgba(255,255,255,0.05)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                transform: done ? 'scale(1)' : 'scale(0.88)',
                boxShadow: done ? `0 0 8px ${slide.color}35` : 'none',
              }}>
                <span style={{ fontSize: 7, color: done ? slide.color : 'var(--text-3)', fontFamily: "'DM Mono',monospace", fontWeight: done ? 700 : 400 }}>
                  {pg.slice(0,3).toUpperCase()}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Main Home Screen ───────────────────────────────────────────────────── */
export default function HomeScreen({ navigate }: Props) {
  const [url, setUrl]             = useState('')
  const [focused, setFocused]     = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [slideIdx, setSlideIdx]   = useState(0)
  const [scanPct, setScanPct]     = useState(0)
  const [fading, setFading]       = useState(false)
  const scanTimer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { canScan, isPro, user } = useAuth()

  // Animate scan line
  useEffect(() => {
    setScanPct(0)
    if (scanTimer.current) clearInterval(scanTimer.current)
    scanTimer.current = setInterval(() => setScanPct(p => p >= 100 ? 0 : p + 0.65), 28)
    return () => { if (scanTimer.current) clearInterval(scanTimer.current) }
  }, [slideIdx])

  // Cycle slides every 5s
  useEffect(() => {
    if (slideTimer.current) clearTimeout(slideTimer.current)
    slideTimer.current = setTimeout(() => {
      setFading(true)
      setTimeout(() => { setSlideIdx(i => (i + 1) % SLIDES.length); setFading(false) }, 400)
    }, 5000)
    return () => { if (slideTimer.current) clearTimeout(slideTimer.current) }
  }, [slideIdx])

  const slide = SLIDES[slideIdx]

  const handleStart = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    if (!canScan) { setShowUpgrade(true); return }
    navigate('scan', {
      pendingScanUrl: trimmed,
      pendingScanSettings: { maxPages: 20, recordVideo: false, scrollForScreenshot: true, waitTime: 1500 },
    })
  }

  return (
    <div style={{ width: '100%', height: '100dvh', display: 'flex', overflow: 'hidden', position: 'relative', background: 'var(--bg-0)' }}>

      {/* ── Background ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div className="grid-bg" />
        <div className="orb orb-1" style={{ top: '-15%', left: '-8%', opacity: 0.6 }} />
        <div className="orb orb-2" style={{ bottom: '0%', right: '-8%', opacity: 0.5 }} />
        <div className="orb orb-3" style={{ top: '50%', left: '50%', opacity: 0.4 }} />
      </div>

      {/* ── LEFT: Hero scanner panel ── */}
      <div style={{
        flex: '0 0 52%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 40px 80px',
        position: 'relative', zIndex: 2,
      }}>
        {/* Live badge */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 20, padding: '4px 13px' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1' }} className="pulse-dot" />
          <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>Live preview — works on any URL</span>
        </div>

        {/* Scanner */}
        <div style={{
          width: '100%', maxWidth: 480,
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(8px) scale(0.98)' : 'translateY(0) scale(1)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}>
          <HeroScanner slide={slide} scanPct={scanPct} />
        </div>

        {/* Tagline + dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 480, marginTop: 16 }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            opacity: fading ? 0 : 1, transition: 'opacity 0.4s ease',
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, background: `${slide.color}20`, border: `1px solid ${slide.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Globe size={9} color={slide.color} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.45 }}>{slide.tagline}</span>
          </div>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {SLIDES.map((_, i) => (
              <button key={i}
                onClick={() => { setFading(true); setTimeout(() => { setSlideIdx(i); setFading(false) }, 300) }}
                style={{
                  width: i === slideIdx ? 18 : 5, height: 5, borderRadius: 3,
                  background: i === slideIdx ? slide.color : 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: CTA panel ── */}
      <div style={{
        flex: '0 0 48%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '32px 52px 80px 40px',
        position: 'relative', zIndex: 2,
        borderLeft: '1px solid var(--border)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-1)' }}>ROAM</span>
          {isPro
            ? <span className="tag" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff' }}>ZEN+</span>
            : <span className="tag" style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>beta</span>
          }
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 50px)', fontWeight: 700, letterSpacing: '-2px', lineHeight: 1.08, color: 'var(--text-1)', margin: '0 0 14px' }}>
          Document any site.{' '}
          <span style={{ background: 'linear-gradient(135deg, #60a5fa, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Automatically.
          </span>
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.65, fontWeight: 300, margin: '0 0 32px', maxWidth: 380 }}>
          Paste a URL — get HD screenshots of every page, a video walkthrough, and ready-to-share assets. In seconds.
        </p>

        {/* URL Input */}
        <div style={{ width: '100%', maxWidth: 440, marginBottom: 24 }}>
          <div className={focused ? 'url-input-wrap' : ''} style={{
            borderRadius: 14, padding: focused ? 1.5 : 0,
            border: focused ? 'none' : '1px solid var(--border-med)',
            background: focused ? undefined : 'var(--bg-2)',
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-2)', borderRadius: 13, padding: '0 14px', gap: 10 }}>
              <Globe size={15} color="var(--text-3)" style={{ flexShrink: 0 }} />
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => e.key === 'Enter' && handleStart()}
                placeholder="https://yoursite.com"
                autoFocus
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-1)', fontSize: 14, fontWeight: 400,
                  padding: '13px 0', fontFamily: "'DM Mono', monospace",
                }}
              />
              <button className="btn-primary" onClick={handleStart} style={{ padding: '7px 16px', flexShrink: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                Scan <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {!isPro && user && user.freeScansUsed >= 1 && (
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '8px 0 0' }}>
              Free scan used.{' '}
              <button onClick={() => setShowUpgrade(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
                Upgrade to ZEN+
              </button>
              {' '}for unlimited scans.
            </p>
          )}
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={11} color="#a78bfa" />
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)', fontWeight: 400 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Tech strip */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {['Playwright-powered', '14+ export formats', 'AI curation', 'Video walkthroughs'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#6366f1' }} />
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom version strip ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTop: '1px solid var(--border)', padding: '9px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(7,7,13,0.8)', backdropFilter: 'blur(12px)', zIndex: 10,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>ROAM — Turn any website into a cinematic experience</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>v1.0.0</span>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} onUpgraded={() => setShowUpgrade(false)} />}
    </div>
  )
}
