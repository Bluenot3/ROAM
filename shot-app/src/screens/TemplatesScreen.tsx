import { useState } from 'react'
import { Layers, Play, Film, Wand2, Zap, Star, ChevronRight, Check, Clock, Image } from 'lucide-react'
import type { Screen, NavigateMeta } from '../App'

interface Props {
  navigate: (s: Screen, meta?: NavigateMeta) => void
  sessionId?: string
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Zap: <Zap size={28} />,
  Star: <Star size={28} />,
  Image: <Image size={28} />,
  Play: <Play size={28} />,
  Film: <Film size={28} />,
  Wand2: <Wand2 size={28} />,
}

const TEMPLATES = [
  {
    id: 'product-demo',
    name: 'Product Demo',
    description: 'Showcase every feature in a polished sequence',
    icon: 'Zap',
    color: '#6366f1',
    tags: ['2.7s/clip', 'Fade transitions', 'Auto-captions'],
    badge: 'Popular',
  },
  {
    id: 'feature-tour',
    name: 'Feature Tour',
    description: 'Deep dive into individual features with focus animations',
    icon: 'Star',
    color: '#8b5cf6',
    tags: ['3.5s/clip', 'Zoom-in effect', 'Highlight boxes'],
    badge: 'New',
  },
  {
    id: 'pricing-comparison',
    name: 'Pricing Comparison',
    description: 'Side-by-side pricing page focus for sales decks',
    icon: 'Image',
    color: '#3b82f6',
    tags: ['4s/clip', 'Split screen', 'Price callouts'],
    badge: null,
  },
  {
    id: 'speed-reel',
    name: 'Speed Reel',
    description: 'Fast-paced montage for social media and ads',
    icon: 'Play',
    color: '#f59e0b',
    tags: ['0.8s/clip', 'Cut transitions', 'High energy'],
    badge: 'Trending',
  },
  {
    id: 'blog-showcase',
    name: 'Blog Showcase',
    description: 'Elegant content walkthrough with reading pace',
    icon: 'Film',
    color: '#34d399',
    tags: ['5s/clip', 'Slow pan', 'Typography overlay'],
    badge: null,
  },
  {
    id: 'brand-kit',
    name: 'Brand Kit',
    description: 'Professional brand-aligned presentation with logo overlays',
    icon: 'Wand2',
    color: '#f87171',
    tags: ['3s/clip', 'Brand colors', 'Logo watermark'],
    badge: 'Pro',
  },
]

const TRANSITION_OPTIONS = ['None', 'Fade', 'Slide', 'Zoom']

export default function TemplatesScreen({ navigate: _navigate, sessionId }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [clipDuration, setClipDuration] = useState(2.7)
  const [transition, setTransition] = useState('Fade')
  const [autoCaptions, setAutoCaptions] = useState(true)

  const handleApply = (id: string) => {
    if (!sessionId) return
    setSelected(id)
    setApplied(true)
    setTimeout(() => setApplied(false), 1500)
  }

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: 'var(--bg)',
      color: 'var(--text)',
      padding: '32px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Layers size={20} style={{ color: 'var(--accent)' }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Templates</h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          {TEMPLATES.length} templates available
        </p>
      </div>

      <p style={{
        marginBottom: 28,
        marginTop: 12,
        fontSize: 13,
        color: 'var(--text-muted)',
        lineHeight: 1.6,
        maxWidth: 640,
      }}>
        Choose a template to automatically configure your Canvas timeline with the perfect timing,
        transitions, and effects for your use case.
      </p>

      {/* Template Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 32,
      }}>
        {TEMPLATES.map((tpl) => {
          const isSelected = selected === tpl.id
          const isAppliedNow = isSelected && applied

          return (
            <div
              key={tpl.id}
              style={{
                background: 'var(--surface)',
                border: `1px solid ${isSelected ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                position: 'relative',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(-2px)'
                el.style.borderColor = 'rgba(99,102,241,0.4)'
                el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(0)'
                el.style.borderColor = isSelected ? 'rgba(99,102,241,0.5)' : 'var(--border)'
                el.style.boxShadow = 'none'
              }}
            >
              {/* Color band */}
              <div style={{ height: 8, background: tpl.color, flexShrink: 0 }} />

              {/* Badge */}
              {tpl.badge && (
                <div style={{
                  position: 'absolute',
                  top: 18,
                  right: 12,
                  background: tpl.color,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  letterSpacing: '0.04em',
                }}>
                  {tpl.badge}
                </div>
              )}

              {/* Card body */}
              <div style={{ padding: '18px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Icon */}
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: `${tpl.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tpl.color,
                  marginBottom: 14,
                  alignSelf: 'center',
                }}>
                  {ICON_MAP[tpl.icon]}
                </div>

                {/* Name */}
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
                  {tpl.name}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                  textAlign: 'center',
                  marginBottom: 12,
                }}>
                  {tpl.description}
                </div>

                {/* Tags */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  {tpl.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                      padding: '2px 8px',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Apply button */}
                <div style={{ marginTop: 'auto', position: 'relative' }}>
                  {!sessionId && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--surface-2, #1e1e2e)',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '5px 10px',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      marginBottom: 6,
                      pointerEvents: 'none',
                      opacity: 0,
                      transition: 'opacity 0.15s',
                    }}
                    className="apply-tooltip"
                    >
                      Open a scan first
                    </div>
                  )}
                  <button
                    onClick={() => handleApply(tpl.id)}
                    disabled={!sessionId}
                    title={!sessionId ? 'Open a scan first' : undefined}
                    style={{
                      width: '100%',
                      padding: '9px 0',
                      borderRadius: 8,
                      border: 'none',
                      cursor: sessionId ? 'pointer' : 'not-allowed',
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'background 0.2s, opacity 0.2s',
                      background: isAppliedNow
                        ? 'rgba(52,211,153,0.18)'
                        : sessionId
                          ? 'rgba(99,102,241,0.15)'
                          : 'var(--bg)',
                      color: isAppliedNow
                        ? '#34d399'
                        : sessionId
                          ? 'var(--accent)'
                          : 'var(--text-disabled, #555)',
                      opacity: sessionId ? 1 : 0.5,
                    }}
                  >
                    {isAppliedNow ? (
                      <>
                        <Check size={14} />
                        Applied!
                      </>
                    ) : (
                      <>
                        <ChevronRight size={14} />
                        Apply Template
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Settings */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}>
          Quick Settings
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {/* Clip Duration */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Clock size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Clip Duration</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.1}
              value={clipDuration}
              onChange={e => setClipDuration(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', marginBottom: 8 }}
            />
            <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, textAlign: 'center' }}>
              {clipDuration.toFixed(1)}s
            </div>
          </div>

          {/* Transition Style */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Film size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Transition Style</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {TRANSITION_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setTransition(opt)}
                  style={{
                    padding: '6px 0',
                    borderRadius: 6,
                    border: `1px solid ${transition === opt ? 'var(--accent)' : 'var(--border)'}`,
                    background: transition === opt ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: transition === opt ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: transition === opt ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Captions */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Wand2 size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Auto-Captions</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 8,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {autoCaptions ? 'Enabled' : 'Disabled'}
              </span>
              <button
                onClick={() => setAutoCaptions(v => !v)}
                style={{
                  width: 42,
                  height: 24,
                  borderRadius: 999,
                  border: 'none',
                  background: autoCaptions ? 'var(--accent)' : 'var(--border)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 3,
                  left: autoCaptions ? 21 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  display: 'block',
                }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--text-muted)',
      }}>
        <Layers size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        Templates configure your Canvas timeline. Open Canvas after applying to see the result.
      </div>
    </div>
  )
}
