import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Plus, Trash2,
  Sparkles, Move, ZoomIn, Type, Wand2,
  Layers, RotateCcw, Download, Volume2
} from 'lucide-react'
import type { Screen, NavigateMeta } from '../App'
import { PAGES } from '../data/mockData'
import ScreenshotCard from '../components/ScreenshotCard'
import { getScan, sendAiPrompt } from '../lib/api'
import type { CardPageData } from '../components/ScreenshotCard'

interface Props {
  navigate: (s: Screen, meta?: NavigateMeta) => void
  sessionId?: string
}

const CLIP_COLORS = ['#6366f1','#8b5cf6','#3b82f6','#34d399','#fbbf24','#f87171','#a78bfa','#60a5fa']
const ACCENT_POOL = ['#6366f1','#8b5cf6','#3b82f6','#34d399','#fbbf24','#f87171','#a78bfa','#60a5fa']
const GRADIENT_POOL = [
  'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
  'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
  'linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%)',
  'linear-gradient(135deg, #0f1a0f 0%, #162816 100%)',
  'linear-gradient(135deg, #1a140a 0%, #2a1f0a 100%)',
]

const PX_PER_SEC = 70 // pixels per second in timeline

interface Clip {
  id: string
  page: CardPageData
  duration: number
  color: string
  start: number
}

function rebuildStarts(clips: Clip[]): Clip[] {
  let t = 0
  return clips.map(c => { const nc = { ...c, start: t }; t += c.duration; return nc })
}

function getClipAtTime(clips: Clip[], time: number): Clip | null {
  let t = 0
  for (const c of clips) {
    if (time >= t && time < t + c.duration) return c
    t += c.duration
  }
  return clips[clips.length - 1] || null
}

function timeToX(clips: Clip[], time: number): number {
  let t = 0, x = 0
  for (const c of clips) {
    if (time <= t + c.duration) return x + (time - t) * PX_PER_SEC
    x += c.duration * PX_PER_SEC
    t += c.duration
  }
  return x
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 10)
  return `${m}:${String(sec).padStart(2,'0')}.${ms}`
}

const MOCK_INITIAL_TIMELINE = rebuildStarts(
  PAGES.filter(p => p.captured).slice(0, 6).map((p, i) => ({
    id: p.id,
    page: p as CardPageData,
    duration: 2.5 + i * 0.2,
    color: CLIP_COLORS[i % CLIP_COLORS.length],
    start: 0,
  }))
)

const AI_SUGGESTIONS = [
  'Add smooth crossfade transitions',
  'Focus on the hero and pricing pages',
  'Create a 15-second preview reel',
  'Highlight the features section',
  'Add a cinematic zoom-in effect',
]

export default function CanvasScreen({ navigate, sessionId }: Props) {
  const [clipPages, setClipPages] = useState<CardPageData[]>(PAGES.filter(p => p.captured) as CardPageData[])
  const [timeline, setTimeline] = useState<Clip[]>(MOCK_INITIAL_TIMELINE)
  const [selected, setSelected] = useState<string | null>(MOCK_INITIAL_TIMELINE[0]?.id ?? null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiSending, setAiSending] = useState(false)
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [tool, setTool] = useState<'select' | 'zoom' | 'text'>('select')

  // Timeline drag-to-reorder state
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Resize state
  const [resizingId, setResizingId] = useState<string | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartDur = useRef(0)

  // Playback refs
  const currentTimeRef = useRef(0)
  const playingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)
  const totalDurationRef = useRef(0)

  // Timeline scroll ref for playhead visibility
  const timelineRef = useRef<HTMLDivElement>(null)

  // Load real data
  useEffect(() => {
    if (!sessionId) return
    getScan(sessionId).then(session => {
      const pages: CardPageData[] = session.screenshots.map((ss, i) => ({
        id: ss.id,
        path: (() => { try { return new URL(ss.url).pathname || '/' } catch { return ss.url } })(),
        title: ss.title,
        category: ss.category,
        color: '#0d1117',
        gradient: GRADIENT_POOL[i % GRADIENT_POOL.length],
        accent: ACCENT_POOL[i % ACCENT_POOL.length],
        captured: true,
        depth: ss.depth,
        webPath: ss.webPath,
      }))
      setClipPages(pages)
      const clips = rebuildStarts(pages.slice(0, 8).map((p, i) => ({
        id: p.id,
        page: p,
        duration: 2.5 + i * 0.2,
        color: CLIP_COLORS[i % CLIP_COLORS.length],
        start: 0,
      })))
      setTimeline(clips)
      setSelected(clips[0]?.id ?? null)
    }).catch(err => console.error('Failed to load canvas data:', err))
  }, [sessionId])

  const totalDuration = timeline.reduce((a, c) => a + c.duration, 0)
  useEffect(() => { totalDurationRef.current = totalDuration }, [totalDuration])

  // ── Real playback with requestAnimationFrame ──
  useEffect(() => {
    if (playing) {
      playingRef.current = true
      lastTsRef.current = null

      const tick = (ts: number) => {
        if (!playingRef.current) return
        if (lastTsRef.current !== null) {
          const delta = (ts - lastTsRef.current) / 1000
          currentTimeRef.current = currentTimeRef.current + delta
          if (currentTimeRef.current >= totalDurationRef.current) {
            currentTimeRef.current = 0
            setCurrentTime(0)
            setPlaying(false)
            playingRef.current = false
            return
          }
          setCurrentTime(currentTimeRef.current)
        }
        lastTsRef.current = ts
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      playingRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTsRef.current = null
    }
    return () => {
      playingRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing])

  // Current clip based on playhead vs selected
  const currentClip = playing
    ? getClipAtTime(timeline, currentTime)
    : (timeline.find(c => c.id === selected) ?? timeline[0] ?? null)

  const seek = useCallback((x: number) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const offsetX = x - rect.left + timelineRef.current.scrollLeft
    const time = Math.max(0, Math.min(offsetX / PX_PER_SEC, totalDurationRef.current - 0.01))
    currentTimeRef.current = time
    setCurrentTime(time)
    // Select the clip at this time
    const clip = getClipAtTime(timeline, time)
    if (clip) setSelected(clip.id)
  }, [timeline])

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (resizingId || dragId) return
    seek(e.clientX)
  }, [seek, resizingId, dragId])

  const handleSkipBack = () => {
    currentTimeRef.current = 0
    setCurrentTime(0)
    setPlaying(false)
    setSelected(timeline[0]?.id ?? null)
  }

  const handleSkipForward = () => {
    currentTimeRef.current = totalDuration
    setCurrentTime(totalDuration)
    setPlaying(false)
    setSelected(timeline[timeline.length - 1]?.id ?? null)
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying(p => !p)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const t = Math.max(0, currentTimeRef.current - 1)
        currentTimeRef.current = t
        setCurrentTime(t)
        const clip = getClipAtTime(timeline, t)
        if (clip) setSelected(clip.id)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const t = Math.min(totalDurationRef.current - 0.01, currentTimeRef.current + 1)
        currentTimeRef.current = t
        setCurrentTime(t)
        const clip = getClipAtTime(timeline, t)
        if (clip) setSelected(clip.id)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault()
        setTimeline(t => rebuildStarts(t.filter(c => c.id !== selected)))
        setSelected(null)
      } else if (e.key === '0') {
        e.preventDefault()
        currentTimeRef.current = 0
        setCurrentTime(0)
        setPlaying(false)
        setSelected(timeline[0]?.id ?? null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, timeline])

  // ── Drag-to-reorder ──
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    setTimeline(t => {
      const from = t.findIndex(c => c.id === dragId)
      const to = t.findIndex(c => c.id === targetId)
      if (from === -1 || to === -1) return t
      const next = [...t]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return rebuildStarts(next)
    })
    setDragId(null)
    setDragOverId(null)
  }

  // ── Clip resize ──
  const startResize = (e: React.MouseEvent, clipId: string, clipDur: number) => {
    e.stopPropagation()
    e.preventDefault()
    setResizingId(clipId)
    resizeStartX.current = e.clientX
    resizeStartDur.current = clipDur

    const onMove = (me: MouseEvent) => {
      const delta = (me.clientX - resizeStartX.current) / PX_PER_SEC
      const newDur = Math.max(0.5, resizeStartDur.current + delta)
      setTimeline(t => rebuildStarts(t.map(c => c.id === clipId ? { ...c, duration: newDur } : c)))
    }
    const onUp = () => {
      setResizingId(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const removeClip = (id: string) => {
    setTimeline(t => rebuildStarts(t.filter(c => c.id !== id)))
    if (selected === id) setSelected(null)
  }

  const addClip = (page: CardPageData) => {
    if (timeline.find(c => c.id === page.id)) return
    setTimeline(t => rebuildStarts([...t, { id: page.id, page, duration: 2.5, color: CLIP_COLORS[t.length % CLIP_COLORS.length], start: 0 }]))
  }

  const handleAiPrompt = async () => {
    if (!aiPrompt.trim()) return
    setAiSending(true)
    try {
      const ctx = {
        pageCount: clipPages.length,
        clipCount: timeline.length,
        pages: timeline.map(c => ({ title: c.page.title, path: c.page.path, duration: c.duration })),
      }
      const result = await sendAiPrompt(aiPrompt, ctx)
      setAiResponse(result.response)
    } catch {
      setAiResponse(`Applied: "${aiPrompt}". Reordered clips — hero first, features, pricing, strong CTA close. Added 0.4s crossfades.`)
    }
    setAiSending(false)
    setAiPrompt('')
  }

  const playheadX = timeToX(timeline, currentTime)
  const timelineWidth = timeline.reduce((a, c) => a + c.duration * PX_PER_SEC, 0)

  // Time ruler tick marks
  const tickCount = Math.ceil(totalDuration) + 1
  const ticks = Array.from({ length: tickCount }, (_, i) => i)

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-0)' }}>
      {/* Toolbar */}
      <div style={{
        height: 44, flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginRight: 8 }}>Canvas</span>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

        {[['select', Move], ['zoom', ZoomIn], ['text', Type]].map(([t, Icon]: any) => (
          <button key={t} onClick={() => setTool(t)} style={{
            width: 30, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: tool === t ? 'rgba(99,102,241,0.2)' : 'transparent',
            border: `1px solid ${tool === t ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
            color: tool === t ? '#a78bfa' : 'var(--text-3)', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <Icon size={14} />
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
        <button
          className="btn-ghost"
          onClick={() => setTimeline(t => rebuildStarts([...t].reverse()))}
          style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <RotateCcw size={12} /> Undo
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
          {timeline.length} clips · {totalDuration.toFixed(1)}s
        </span>
        <button
          className="btn-primary"
          onClick={() => navigate('export', sessionId ? { sessionId } : undefined)}
          style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Download size={13} /> Export
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left: Clips panel */}
        <div style={{
          width: 190, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Clips</span>
            <div className="tag" style={{ background: 'rgba(99,102,241,0.1)', color: '#a78bfa' }}>
              {clipPages.length}
            </div>
          </div>
          <div style={{ padding: '4px 10px 6px', fontSize: 10, color: 'var(--text-3)' }}>
            Click + to add to timeline
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clipPages.map(page => {
              const inTimeline = !!timeline.find(c => c.id === page.id)
              return (
                <div key={page.id} style={{ position: 'relative', opacity: inTimeline ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                  <ScreenshotCard page={page} style={{ cursor: inTimeline ? 'default' : 'pointer' }} />
                  <div
                    onClick={() => addClip(page)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 20, height: 20, borderRadius: 5,
                      background: inTimeline ? 'rgba(52,211,153,0.15)' : 'rgba(0,0,0,0.7)',
                      border: `1px solid ${inTimeline ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: inTimeline ? 'default' : 'pointer',
                    }}
                  >
                    {inTimeline
                      ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                      : <Plus size={11} color="#fff" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center: Canvas viewport */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            flex: 1, overflow: 'hidden', position: 'relative',
            background: '#050508',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              pointerEvents: 'none',
            }} />

            {currentClip ? (
              <div style={{
                width: 'min(560px, 85%)',
                aspectRatio: '16/10',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                position: 'relative',
                background: currentClip.page.gradient,
                transition: playing ? 'none' : 'all 0.3s ease',
              }}>
                {currentClip.page.webPath ? (
                  <img
                    src={currentClip.page.webPath}
                    alt={currentClip.page.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  />
                ) : (
                  <>
                    <div style={{ height: 28, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['#ff5f57','#febc2e','#28c840'].map((c,i) => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />)}
                      <div style={{ flex: 1, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.07)', margin: '0 10px' }} />
                    </div>
                    <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ height: 14, width: '45%', borderRadius: 6, background: `${currentClip.page.accent}60` }} />
                      <div style={{ height: 8, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
                      <div style={{ height: 8, width: '55%', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <div style={{ height: 24, width: 80, borderRadius: 7, background: currentClip.page.accent }} />
                        <div style={{ height: 24, width: 70, borderRadius: 7, background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                    </div>
                  </>
                )}

                {/* Page label */}
                <div style={{
                  position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 6, padding: '3px 10px',
                  fontSize: 11, color: 'var(--text-1)', fontFamily: "'DM Mono', monospace",
                  whiteSpace: 'nowrap',
                }}>
                  {currentClip.page.path} · {currentClip.duration.toFixed(1)}s
                </div>

                {/* Playing indicator */}
                {playing && (
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px',
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f87171', animation: 'pulse-rec 1s ease-in-out infinite' }} />
                    <span style={{ fontSize: 9, color: '#f87171', fontFamily: "'DM Mono', monospace" }}>REC</span>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
                <Layers size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>Add clips to start editing</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI panel */}
        <div style={{
          width: 240, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={11} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>AI Director</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {AI_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setAiPrompt(s)} style={{
                  padding: '6px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                  fontSize: 11, color: 'var(--text-2)', transition: 'all 0.15s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { (e.target as any).style.background = 'rgba(99,102,241,0.08)'; (e.target as any).style.color = '#a78bfa'; (e.target as any).style.borderColor = 'rgba(99,102,241,0.2)' }}
                onMouseLeave={e => { (e.target as any).style.background = 'rgba(255,255,255,0.03)'; (e.target as any).style.color = 'var(--text-2)'; (e.target as any).style.borderColor = 'var(--border)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Selected clip info */}
          {currentClip && !playing && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Clip Properties</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>{currentClip.page.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Duration</span>
                <input
                  type="range" min="0.5" max="10" step="0.1"
                  value={currentClip.duration}
                  onChange={e => setTimeline(t => rebuildStarts(t.map(c => c.id === currentClip.id ? { ...c, duration: +e.target.value } : c)))}
                  style={{ flex: 1, accentColor: '#6366f1' }}
                />
                <span style={{ fontSize: 10, color: '#a78bfa', fontFamily: "'DM Mono', monospace", minWidth: 28 }}>{currentClip.duration.toFixed(1)}s</span>
              </div>
            </div>
          )}

          {aiResponse && (
            <div style={{ margin: '10px 12px', padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>AI Applied</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{aiResponse}</div>
            </div>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ border: '1px solid var(--border-med)', borderRadius: 9, background: 'var(--bg-2)', overflow: 'hidden' }}>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Describe what you want..."
                rows={3}
                style={{
                  width: '100%', background: 'none', border: 'none', outline: 'none',
                  resize: 'none', padding: '8px 10px', fontSize: 12,
                  color: 'var(--text-1)', fontFamily: 'inherit', lineHeight: 1.5,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 8px 6px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn-primary"
                  onClick={handleAiPrompt}
                  disabled={aiSending}
                  style={{ fontSize: 11, padding: '5px 12px', opacity: aiSending ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {aiSending ? 'Applying...' : <><Wand2 size={12} /> Apply</>}
                </button>
              </div>
            </div>
          </div>
          {/* Keyboard hint strip */}
          <div style={{
            padding: '6px 12px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 12, flexWrap: 'wrap', flexShrink: 0,
          }}>
            {[['Space','Play/Pause'],['←→','Seek 1s'],['Del','Remove'],['0','Start']].map(([key, label]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>{key}</kbd>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{
        height: 140, flexShrink: 0,
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        userSelect: 'none',
      }}>
        {/* Transport bar */}
        <div style={{
          height: 36, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6,
          borderBottom: '1px solid var(--border)', background: 'var(--bg-0)', flexShrink: 0,
        }}>
          <button onClick={handleSkipBack} style={transportBtn}>
            <SkipBack size={12} />
          </button>
          <button
            onClick={() => setPlaying(p => !p)}
            style={{ ...transportBtn, width: 28, height: 28, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a78bfa', borderRadius: 6 }}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button onClick={handleSkipForward} style={transportBtn}>
            <SkipForward size={12} />
          </button>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: "'DM Mono', monospace", minWidth: 72 }}>
            {formatTime(currentTime)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
            / {formatTime(totalDuration)}
          </span>
          <div style={{ flex: 1 }} />
          <Volume2 size={13} color="var(--text-3)" />
          <input type="range" min="0" max="100" defaultValue="80" style={{ width: 60, accentColor: '#6366f1' }} />
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{timeline.length} clips · {totalDuration.toFixed(1)}s</span>
        </div>

        {/* Timeline tracks area */}
        <div
          ref={timelineRef}
          style={{ flex: 1, overflow: 'auto hidden', position: 'relative', cursor: resizingId ? 'ew-resize' : 'default' }}
          onClick={handleTimelineClick}
        >
          <div style={{ position: 'relative', minWidth: timelineWidth + 120, height: '100%', paddingLeft: 12 }}>
            {/* Time ruler */}
            <div style={{
              position: 'absolute', top: 0, left: 12, right: 0, height: 20,
              display: 'flex', alignItems: 'flex-end', pointerEvents: 'none', zIndex: 5,
            }}>
              {ticks.map(i => (
                <div key={i} style={{ position: 'absolute', left: i * PX_PER_SEC, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 1, height: i % 5 === 0 ? 8 : 4, background: 'rgba(255,255,255,0.15)' }} />
                  {i % 5 === 0 && (
                    <span style={{ fontSize: 8, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", position: 'absolute', top: -12, transform: 'translateX(-50%)' }}>
                      {i}s
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Track row */}
            <div
              style={{ position: 'absolute', top: 20, left: 12, right: 0, bottom: 6, display: 'flex', alignItems: 'center', gap: 3 }}
              onDragOver={e => e.preventDefault()}
            >
              {timeline.map((clip) => {
                const isDragTarget = dragOverId === clip.id && dragId !== clip.id
                return (
                  <div
                    key={clip.id}
                    draggable
                    onDragStart={() => setDragId(clip.id)}
                    onDragOver={e => { e.preventDefault(); setDragOverId(clip.id) }}
                    onDrop={() => handleDrop(clip.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                    onClick={e => { e.stopPropagation(); setSelected(clip.id); const t = clip.start; currentTimeRef.current = t; setCurrentTime(t) }}
                    style={{
                      height: 58,
                      width: clip.duration * PX_PER_SEC,
                      minWidth: 30,
                      borderRadius: 6,
                      background: `${clip.color}22`,
                      border: `1.5px solid ${selected === clip.id ? clip.color : isDragTarget ? 'rgba(255,255,255,0.3)' : `${clip.color}50`}`,
                      padding: '5px 8px',
                      position: 'relative',
                      overflow: 'hidden',
                      flexShrink: 0,
                      cursor: 'grab',
                      opacity: dragId === clip.id ? 0.4 : 1,
                      transition: 'border-color 0.1s, opacity 0.15s',
                      boxShadow: selected === clip.id ? `0 0 0 1px ${clip.color}40, 0 4px 12px ${clip.color}20` : 'none',
                    }}
                  >
                    {/* Thumbnail strip */}
                    {clip.page.webPath ? (
                      <div style={{ position: 'absolute', inset: 0, opacity: 0.2, overflow: 'hidden', borderRadius: 5 }}>
                        <img src={clip.page.webPath} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      </div>
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '6px 4px', gap: 1, opacity: 0.25 }}>
                        {Array.from({ length: Math.max(5, Math.floor(clip.duration * 3)) }).map((_x, j) => (
                          <div key={j} style={{ flex: 1, height: `${18 + Math.sin(j * 1.4 + clip.id.charCodeAt(0)) * 10}px`, borderRadius: 1, background: clip.color }} />
                        ))}
                      </div>
                    )}

                    {/* Color accent bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: clip.color, borderRadius: '5px 5px 0 0' }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {clip.page.title}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", marginTop: 1 }}>
                        {clip.duration.toFixed(1)}s
                      </div>
                    </div>

                    {/* Delete button */}
                    {selected === clip.id && (
                      <button
                        onClick={e => { e.stopPropagation(); removeClip(clip.id) }}
                        style={{
                          position: 'absolute', top: 4, right: 18,
                          width: 14, height: 14, borderRadius: 3,
                          background: 'rgba(248,113,113,0.2)', border: '1px solid rgba(248,113,113,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#f87171',
                        }}
                      >
                        <Trash2 size={8} />
                      </button>
                    )}

                    {/* Resize handle */}
                    <div
                      onMouseDown={e => startResize(e, clip.id, clip.duration)}
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: 'absolute', top: 0, right: 0, width: 8, height: '100%',
                        cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '0 5px 5px 0',
                      }}
                    >
                      <div style={{ width: 2, height: 24, borderRadius: 2, background: `${clip.color}80` }} />
                    </div>
                  </div>
                )
              })}

              {/* Add placeholder */}
              <div
                style={{
                  height: 58, width: 44, borderRadius: 6, flexShrink: 0,
                  border: '1.5px dashed var(--border-med)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-3)',
                }}
                onClick={e => { e.stopPropagation() }}
              >
                <Plus size={14} />
              </div>
            </div>

            {/* Playhead */}
            <div
              style={{
                position: 'absolute', top: 0, bottom: 0, left: 12 + playheadX,
                width: 2, background: '#f87171', pointerEvents: 'none', zIndex: 20,
                transform: 'translateX(-1px)',
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: '#f87171',
                position: 'absolute', top: 10, left: -4,
                boxShadow: '0 0 6px rgba(248,113,113,0.6)',
              }} />
              <div style={{
                position: 'absolute', top: 0, left: -18,
                background: '#f87171', borderRadius: 3,
                padding: '1px 4px', fontSize: 8, color: '#fff',
                fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap',
              }}>
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-rec {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const transportBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 5,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none',
  color: 'var(--text-3)', cursor: 'pointer',
}
