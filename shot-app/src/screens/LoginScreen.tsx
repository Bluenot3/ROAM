import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Tag, ArrowRight, Globe, Camera, Zap, Film, Map, CheckCircle2 } from 'lucide-react'

const SLIDES = [
  {
    url: 'stripe.com', label: 'Stripe', color: '#635bff', dim: '#2d2066',
    bg: 'linear-gradient(160deg,#100a2e 0%,#060311 100%)',
    tagline: 'Payment flows. Pricing pages. Every checkout screen, documented.',
    pages: ['Home','Pricing','Docs','Payments','Terminal','Billing','Connect'],
    rows: [{ w: '68%', c: '#635bff' },{ w: '88%', c: 'rgba(255,255,255,0.07)' },{ w: '52%', c: 'rgba(255,255,255,0.04)' }],
  },
  {
    url: 'tesla.com', label: 'Tesla', color: '#e82127', dim: '#5a0a0c',
    bg: 'linear-gradient(160deg,#180000 0%,#060606 100%)',
    tagline: 'Product launches. Feature rollouts. Press assets — auto-captured.',
    pages: ['Model S','Model 3','Cybertruck','Solar','Powerwall','Shop','News'],
    rows: [{ w: '75%', c: '#e82127' },{ w: '60%', c: 'rgba(255,255,255,0.07)' },{ w: '70%', c: 'rgba(255,255,255,0.04)' }],
  },
  {
    url: 'zenai.world', label: 'ZenAI', color: '#6366f1', dim: '#252580',
    bg: 'linear-gradient(160deg,#0d0d20 0%,#06060f 100%)',
    tagline: 'Your SaaS — fully visualised before the first demo call.',
    pages: ['Home','Features','Pricing','Blog','Docs','API','Login'],
    rows: [{ w: '62%', c: '#6366f1' },{ w: '82%', c: 'rgba(255,255,255,0.07)' },{ w: '48%', c: 'rgba(255,255,255,0.04)' }],
  },
  {
    url: 'anthropic.com', label: 'Anthropic', color: '#d97706', dim: '#5a3002',
    bg: 'linear-gradient(160deg,#180d00 0%,#080603 100%)',
    tagline: 'Research. Model releases. Blog. Captured and ready to share.',
    pages: ['Home','Claude','Research','Careers','Policy','News','About'],
    rows: [{ w: '72%', c: '#d97706' },{ w: '88%', c: 'rgba(255,255,255,0.07)' },{ w: '58%', c: 'rgba(255,255,255,0.04)' }],
  },
  {
    url: 'nvidia.com', label: 'NVIDIA', color: '#76b900', dim: '#2e4800',
    bg: 'linear-gradient(160deg,#060b00 0%,#050605 100%)',
    tagline: 'Track competitors. Map their entire site. In seconds.',
    pages: ['Home','GPUs','AI','Data Center','Laptops','Studio','Drivers'],
    rows: [{ w: '55%', c: '#76b900' },{ w: '78%', c: 'rgba(255,255,255,0.07)' },{ w: '66%', c: 'rgba(255,255,255,0.04)' }],
  },
]

const VALUE_STRIP = [
  { icon: Globe,  text: 'Any public URL' },
  { icon: Camera, text: 'Full-page HD captures' },
  { icon: Zap,    text: 'AI curation' },
  { icon: Film,   text: 'Video walkthroughs' },
  { icon: Map,    text: 'Complete site maps' },
]

/* ── Improved scanner browser mock ─────────────────────────────────────── */
function BrowserMock({ slide, scanPct }: { slide: typeof SLIDES[0]; scanPct: number }) {
  const capturedCount = Math.min(slide.pages.length, Math.floor(scanPct / 14))

  return (
    <div style={{
      width: '100%', maxWidth: 400, borderRadius: 12,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: `0 0 0 1px ${slide.color}20, 0 20px 60px rgba(0,0,0,0.65), 0 0 40px ${slide.color}10`,
      overflow: 'hidden',
      transition: 'box-shadow 0.4s ease',
    }}>
      {/* Chrome bar */}
      <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.55)', borderBottom: `1px solid ${slide.color}20`, display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#ff5f57','#febc2e','#28c840'].map((c,i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{ flex: 1, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', paddingLeft: 8, gap: 5, overflow: 'hidden' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: slide.color, flexShrink: 0 }} className="pulse-dot" />
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'DM Mono',monospace", whiteSpace: 'nowrap' }}>{slide.url}</span>
        </div>
        {/* Live scan indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 20, background: `${slide.color}20`, border: `1px solid ${slide.color}35` }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: slide.color }} className="pulse-dot" />
          <span style={{ fontSize: 9, color: slide.color, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>{Math.round(scanPct)}%</span>
        </div>
      </div>

      {/* Viewport */}
      <div style={{ position: 'relative', height: 155, background: slide.bg, overflow: 'hidden', padding: '12px 14px' }}>

        {/* ── Corner brackets ── */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h],i) => (
          <div key={i} style={{
            position: 'absolute',
            [v]: 5, [h]: 5,
            width: 10, height: 10,
            borderTop: v==='top' ? `1.5px solid ${slide.color}` : 'none',
            borderBottom: v==='bottom' ? `1.5px solid ${slide.color}` : 'none',
            borderLeft: h==='left' ? `1.5px solid ${slide.color}` : 'none',
            borderRight: h==='right' ? `1.5px solid ${slide.color}` : 'none',
            boxShadow: `0 0 4px ${slide.color}60`,
            zIndex: 3,
          }} />
        ))}

        {/* ── Scan shadow trail (reveals below scan line) ── */}
        <div style={{
          position: 'absolute', left: 0, right: 0, zIndex: 1,
          top: `${scanPct}%`,
          height: 50,
          background: `linear-gradient(to bottom, ${slide.color}18 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        {/* ── Primary scan line ── */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2, zIndex: 2,
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
          boxShadow: `0 0 6px 1px ${slide.color}, 0 0 14px 3px ${slide.color}80, 0 0 28px 6px ${slide.color}30`,
          transition: 'top 0.04s linear',
        }} />

        {/* ── Secondary trailing scan line ── */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 1, zIndex: 2,
          top: `${Math.max(0, scanPct - 3)}%`,
          background: `linear-gradient(90deg, transparent 10%, ${slide.color}50 50%, transparent 90%)`,
          boxShadow: `0 0 4px ${slide.color}40`,
          transition: 'top 0.04s linear',
          opacity: 0.6,
        }} />

        {/* ── Content blocks ── */}
        <div style={{ position: 'relative', zIndex: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {slide.rows.map((row, i) => (
            <div key={i} style={{
              height: i === 0 ? 18 : 9,
              width: row.w, borderRadius: 4,
              background: row.c,
              opacity: scanPct > (i * 25) ? 1 : 0.3,
              transition: 'opacity 0.4s ease',
            }} />
          ))}
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <div style={{ height: 22, width: 72, borderRadius: 5, background: slide.color, opacity: scanPct > 60 ? 1 : 0.2, transition: 'opacity 0.4s ease' }} />
            <div style={{ height: 22, width: 55, borderRadius: 5, background: 'rgba(255,255,255,0.06)', opacity: scanPct > 60 ? 1 : 0.2, transition: 'opacity 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
            {[42, 52, 36, 48].map((w, i) => (
              <div key={i} style={{
                height: 44, width: `${w}%`,
                borderRadius: 6,
                background: `${slide.color}14`,
                border: `1px solid ${slide.color}22`,
                opacity: scanPct > (50 + i * 12) ? 1 : 0.15,
                transition: 'opacity 0.5s ease',
              }} />
            ))}
          </div>
        </div>

        {/* ── Scan progress bar at bottom ── */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.04)' }}>
          <div style={{
            height: '100%', width: `${scanPct}%`,
            background: `linear-gradient(90deg, ${slide.dim}, ${slide.color})`,
            boxShadow: `0 0 6px ${slide.color}`,
            transition: 'width 0.04s linear',
          }} />
        </div>
      </div>

      {/* ── Captured thumbnails strip ── */}
      <div style={{ padding: '7px 10px', background: 'rgba(0,0,0,0.4)', borderTop: `1px solid ${slide.color}15`, display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--text-3)', marginRight: 3, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
          {capturedCount}/{slide.pages.length}
        </span>
        <div style={{ display: 'flex', gap: 3, flex: 1 }}>
          {slide.pages.map((pg, i) => {
            const done = i < capturedCount
            return (
              <div key={i} style={{
                flex: 1, height: 22, borderRadius: 3,
                background: done ? `${slide.color}28` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${done ? slide.color + '55' : 'rgba(255,255,255,0.05)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
                transform: done ? 'scale(1)' : 'scale(0.92)',
                boxShadow: done ? `0 0 6px ${slide.color}30` : 'none',
              }}>
                <span style={{ fontSize: 6, color: done ? slide.color : 'var(--text-3)', fontFamily: "'DM Mono',monospace", fontWeight: done ? 600 : 400 }}>
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

/* ── Main Login Screen ──────────────────────────────────────────────────── */
interface Props { onAuth: () => void }

export default function LoginScreen({ onAuth }: Props) {
  const { login, register } = useAuth()
  const [mode, setMode]           = useState<'signin'|'signup'>('signin')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [slideIdx, setSlideIdx]   = useState(0)
  const [scanPct, setScanPct]     = useState(0)
  const [fading, setFading]       = useState(false)
  const scanTimer  = useRef<ReturnType<typeof setInterval>|null>(null)
  const slideTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const emailRef   = useRef<HTMLInputElement>(null)

  useEffect(() => { emailRef.current?.focus() }, [])

  // Animate scan line
  useEffect(() => {
    setScanPct(0)
    if (scanTimer.current) clearInterval(scanTimer.current)
    scanTimer.current = setInterval(() => setScanPct(p => p >= 100 ? 0 : p + 0.7), 28)
    return () => { if (scanTimer.current) clearInterval(scanTimer.current) }
  }, [slideIdx])

  // Cycle slides every 4.5s
  useEffect(() => {
    if (slideTimer.current) clearTimeout(slideTimer.current)
    slideTimer.current = setTimeout(() => {
      setFading(true)
      setTimeout(() => { setSlideIdx(i => (i + 1) % SLIDES.length); setFading(false) }, 380)
    }, 4500)
    return () => { if (slideTimer.current) clearTimeout(slideTimer.current) }
  }, [slideIdx])

  const slide = SLIDES[slideIdx]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Email and password required'); return }
    setLoading(true); setError('')
    try {
      if (mode === 'signup') await register(email, password)
      else await login(email, password)
      onAuth()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100dvh', overflow: 'hidden' }}>

      {/* ══ LEFT PANEL ═══════════════════════════════════════════════════ */}
      <div style={{
        flex: '0 0 58%',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-0)',
        borderRight: '1px solid var(--border)',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div className="grid-bg" style={{ opacity: 0.6 }} />
          <div className="orb orb-1" style={{ top: '-20%', left: '-10%', opacity: 0.5 }} />
          <div className="orb orb-2" style={{ bottom: '-10%', right: '-10%', opacity: 0.4 }} />
        </div>

        {/* Top badge */}
        <div style={{ padding: '14px 0 0', display: 'flex', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '4px 12px' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1' }} className="pulse-dot" />
            <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 500 }}>Live preview — works on any URL</span>
          </div>
        </div>

        {/* Center content — flex: 1, distribute evenly */}
        <div style={{
          flex: 1, minHeight: 0,
          position: 'relative', zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '10px 36px 4px',
          gap: 14,
        }}>
          {/* Headline */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: 'clamp(20px, 3vw, 34px)', fontWeight: 700,
              letterSpacing: '-1px', lineHeight: 1.12,
              color: 'var(--text-1)', margin: '0 0 6px',
            }}>
              Stop taking screenshots{' '}
              <span style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                manually.
              </span>
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6, margin: 0, maxWidth: 360 }}>
              You built something great. <strong style={{ color: 'var(--text-1)', fontWeight: 500 }}>ROAM does it in seconds</strong> — paste a URL and get every page, automatically.
            </p>
          </div>

          {/* Browser mock */}
          <div style={{
            width: '100%', maxWidth: 430,
            opacity: fading ? 0 : 1,
            transform: fading ? 'translateY(6px)' : 'translateY(0)',
            transition: 'opacity 0.38s ease, transform 0.38s ease',
          }}>
            <BrowserMock slide={slide} scanPct={scanPct} />
          </div>

          {/* Caption + dots on one row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 430 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 7,
              opacity: fading ? 0 : 1, transition: 'opacity 0.38s ease',
            }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: `${slide.color}20`, border: `1px solid ${slide.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Globe size={9} color={slide.color} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{slide.tagline}</span>
            </div>
            {/* Slide dots */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => { setFading(true); setTimeout(() => { setSlideIdx(i); setFading(false) }, 300) }} style={{
                  width: i === slideIdx ? 16 : 5, height: 5, borderRadius: 3,
                  background: i === slideIdx ? slide.color : 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom features strip — part of flex flow (not absolute) */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          padding: '9px 24px',
          display: 'flex', gap: 0, justifyContent: 'space-between',
          background: 'rgba(7,7,13,0.85)', backdropFilter: 'blur(12px)',
          position: 'relative', zIndex: 2,
        }}>
          {VALUE_STRIP.map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon size={11} color="#6366f1" />
              <span style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══════════════════════════════════════════════════ */}
      <div style={{
        flex: '0 0 42%',
        background: 'var(--bg-1)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Logo top-left */}
        <div style={{ position: 'absolute', top: 24, left: 40, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.45)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-1)' }}>ROAM</span>
          <span className="tag" style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>beta</span>
        </div>

        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.7px', color: 'var(--text-1)', margin: '0 0 5px' }}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
              {mode === 'signin' ? 'Sign in to continue to ROAM' : 'Start with one free URL scan'}
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 10, padding: 3, marginBottom: 20, border: '1px solid var(--border)' }}>
            {(['signin','signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: mode === m ? 'var(--bg-3)' : 'transparent',
                color: mode === m ? 'var(--text-1)' : 'var(--text-3)',
                fontSize: 13, fontWeight: mode === m ? 500 : 400,
                fontFamily: "'DM Sans',sans-serif",
                transition: 'all 0.15s',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 5, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Email</label>
              <input
                ref={emailRef} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%', padding: '10px 13px', borderRadius: 9, background: 'var(--bg-2)', border: '1px solid var(--border-med)', color: 'var(--text-1)', fontSize: 14, outline: 'none', fontFamily: "'DM Sans',sans-serif", transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.55)')}
                onBlur={e =>  (e.target.style.borderColor = 'var(--border-med)')}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 5, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  style={{ width: '100%', padding: '10px 38px 10px 13px', borderRadius: 9, background: 'var(--bg-2)', border: '1px solid var(--border-med)', color: 'var(--text-1)', fontSize: 14, outline: 'none', fontFamily: "'DM Sans',sans-serif", transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.55)')}
                  onBlur={e =>  (e.target.style.borderColor = 'var(--border-med)')}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}>
                  {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: '8px 11px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontSize: 12.5 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '11px', fontSize: 14, marginTop: 2, justifyContent: 'center', opacity: loading ? 0.7 : 1 }}>
              {loading
                ? <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation:'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    {mode === 'signup' ? 'Creating account…' : 'Signing in…'}
                  </span>
                : <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={14}/>
                  </span>
              }
            </button>
          </form>

          {/* Promo code */}
          <div style={{ marginTop: 14 }}>
            <button onClick={() => setPromoOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: 12, padding: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
              <Tag size={11}/> Have a promo code?
            </button>
            {promoOpen && (
              <div style={{ marginTop: 8, display: 'flex', gap: 7 }}>
                <input value={promoCode} onChange={e => setPromoCode(e.target.value)} placeholder="Enter code"
                  style={{ flex: 1, padding: '9px 11px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-med)', color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: "'DM Sans',sans-serif", boxSizing: 'border-box' }}
                />
                <button onClick={() => { if (promoCode.trim()) { localStorage.setItem('roam_pending_promo', promoCode.trim()); setPromoOpen(false) } }}
                  style={{ padding: '9px 13px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Free scan callout for signup */}
          {mode === 'signup' && (
            <div style={{ marginTop: 14, padding: '11px 13px', borderRadius: 9, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <CheckCircle2 size={13} color="#a78bfa" style={{ marginTop: 1, flexShrink: 0 }}/>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#a78bfa', margin: '0 0 2px' }}>Free to start</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                    1 free scan included. Upgrade to <strong style={{ color: 'var(--text-2)' }}>ZEN+</strong> for unlimited scans, video exports &amp; canvas tools.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
            By continuing you agree to our{' '}
            <a href="#" style={{ color: 'var(--text-3)', textDecoration: 'underline' }}>Terms</a>
            {' '}&amp;{' '}
            <a href="#" style={{ color: 'var(--text-3)', textDecoration: 'underline' }}>Privacy Policy</a>
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
