import { useState, useEffect } from 'react'
import { Download, Film, FileText, Package, Check, Sparkles, Play, Settings2 } from 'lucide-react'
import type { Screen, NavigateMeta } from '../App'
import { getScan, exportScan } from '../lib/api'
import { showToast } from '../lib/toast'

interface Props {
  navigate: (s: Screen, meta?: NavigateMeta) => void
  sessionId?: string
}

const FORMATS = [
  {
    id: 'zip', icon: Package, label: 'ZIP Pack', ext: '.zip', desc: 'All screenshots as individual PNG files in a ZIP archive — perfect for sharing or archiving',
    size: '~24 MB', tag: 'Full quality', tagColor: '#a78bfa', preview: 'grid',
    options: ['All pages', 'Original quality', 'Includes video'],
    realType: 'zip' as const,
  },
  {
    id: 'pdf', icon: FileText, label: 'PDF Deck', ext: '.pdf', desc: 'Polished slide deck — one screenshot per page with captions and metadata',
    size: '~8 MB', tag: 'Shareable', tagColor: '#fbbf24', preview: 'deck',
    options: ['16:9 format', 'Dark theme', 'Captions included'],
    realType: 'pdf' as const,
  },
  {
    id: 'video', icon: Film, label: 'WebM Video', ext: '.webm', desc: 'Continuous walkthrough video recorded with Playwright — every page in sequence',
    size: '~12 MB', tag: 'Video', tagColor: '#6366f1', preview: 'video',
    options: ['All pages', 'Smooth scroll', 'Browser chrome'],
    realType: 'video' as const,
  },
  {
    id: 'mp4', icon: Film, label: 'MP4 Video', ext: '.mp4', desc: 'Full-quality H.264 video for social media, presentations, and embeds',
    size: '~12 MB', tag: 'Most popular', tagColor: '#6366f1', preview: 'video',
    options: ['1080p / 4K', '30fps / 60fps', 'Custom duration'],
    realType: null,
  },
  {
    id: 'gif', icon: Film, label: 'Animated GIF', ext: '.gif', desc: 'Lightweight loop for websites, Slack, Notion, and email previews',
    size: '~4 MB', tag: 'Embeddable', tagColor: '#34d399', preview: 'gif',
    options: ['480p / 720p', '12fps / 24fps', 'Loop count'],
    realType: null,
  },
  {
    id: 'bundle', icon: Package, label: 'Full Bundle', ext: '.zip', desc: 'Everything above in one download — all formats and assets included',
    size: '~48 MB', tag: 'Complete', tagColor: '#f87171', preview: 'all',
    options: ['All formats', 'Source screenshots', 'Project file'],
    realType: null,
  },
]

const QUALITY_OPTIONS = ['720p', '1080p', '4K']
const FPS_OPTIONS = ['24fps', '30fps', '60fps']

export default function ExportScreen({ navigate, sessionId }: Props) {
  const [selected, setSelected] = useState<string>('zip')
  const [quality, setQuality] = useState('1080p')
  const [fps, setFps] = useState('30fps')
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Real data state
  const [videoPath, setVideoPath] = useState<string | null>(null)
  const [screenshotCount, setScreenshotCount] = useState(8)
  const [scanUrl, setScanUrl] = useState('acme.io')
  const [screenshotIds, setScreenshotIds] = useState<string[]>([])
  const isReal = !!sessionId

  useEffect(() => {
    if (!sessionId) return
    getScan(sessionId).then(session => {
      if (session.videoPath) {
        setVideoPath(session.videoPath)
        setSelected('video') // auto-select video if available
      } else {
        setSelected('zip')
      }
      setScreenshotCount(session.screenshots.length)
      setScreenshotIds(session.screenshots.map(s => s.id))
      try {
        setScanUrl(new URL(session.url).hostname)
      } catch {
        setScanUrl(session.url)
      }
    }).catch(err => console.error('Failed to load session for export:', err))
  }, [sessionId])

  const selectedFormat = FORMATS.find(f => f.id === selected)!

  const startExport = async () => {
    setExporting(true)
    setExportProgress(0)
    setErrorMsg(null)
    setDone(false)

    if (isReal && selectedFormat.realType) {
      // Animate progress while waiting for real export
      let p = 0
      const iv = setInterval(() => {
        p += Math.random() * 8
        if (p < 85) setExportProgress(p)
      }, 300)

      try {
        const blobUrl = await exportScan(sessionId!, selectedFormat.realType, screenshotIds)
        clearInterval(iv)
        setExportProgress(100)

        // Trigger download
        const extMap = { zip: '.zip', pdf: '.pdf', video: '.webm' }
        const ext = extMap[selectedFormat.realType] || selectedFormat.ext
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = `shot-export-${sessionId!.slice(0,8)}${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
        showToast(`${selectedFormat.label} downloaded successfully`, 'success')
        setTimeout(() => { setExporting(false); setDone(true) }, 400)
      } catch (err: any) {
        clearInterval(iv)
        setExporting(false)
        setExportProgress(0)
        setErrorMsg(err.message || 'Export failed')
        showToast(err.message || 'Export failed', 'error')
      }
    } else {
      // Mock export animation
      let p = 0
      const iv = setInterval(() => {
        p += Math.random() * 18
        if (p >= 100) {
          p = 100
          clearInterval(iv)
          setTimeout(() => { setExporting(false); setDone(true) }, 400)
        }
        setExportProgress(p)
      }, 200)
    }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Export</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{scanUrl} · {screenshotCount} screenshots{videoPath ? ' · video available' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => navigate('canvas', sessionId ? { sessionId } : undefined)} style={{ fontSize: 12 }}>
            ← Back to Canvas
          </button>
          {!done ? (
            <button className="btn-primary" onClick={startExport} disabled={exporting} style={{ fontSize: 12, opacity: exporting ? 0.7 : 1 }}>
              {exporting ? `Exporting... ${Math.floor(exportProgress)}%` : <><Download size={13} /> Export {selectedFormat?.ext}</>}
            </button>
          ) : (
            <button className="btn-primary" style={{ fontSize: 12, background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <Check size={13} /> Downloaded!
            </button>
          )}
        </div>
      </div>

      {/* Export progress */}
      {exporting && (
        <div style={{ height: 2, background: 'var(--bg-3)', flexShrink: 0, position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
            width: `${exportProgress}%`, transition: 'width 0.2s ease',
            boxShadow: '0 0 12px rgba(99,102,241,0.5)',
          }} />
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div style={{
          margin: '12px 20px 0', padding: '8px 14px', borderRadius: 8,
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
          fontSize: 12, color: '#f87171',
        }}>
          Export failed: {errorMsg}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Format grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 14 }}>
            Choose Format
          </div>

          {/* Video preview player (shown when video is available and video format selected) */}
          {isReal && videoPath && selected === 'video' && (
            <div style={{
              marginBottom: 16, borderRadius: 12, overflow: 'hidden',
              border: '1px solid rgba(99,102,241,0.3)',
              background: '#050508',
            }}>
              <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Film size={13} color="#a78bfa" />
                <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 500 }}>Walkthrough Video Preview</span>
              </div>
              <video
                src={videoPath}
                controls
                style={{ width: '100%', maxHeight: 280, display: 'block' }}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {FORMATS.map(fmt => (
              <div
                key={fmt.id}
                className={`export-card ${selected === fmt.id ? 'selected' : ''}`}
                onClick={() => setSelected(fmt.id)}
                style={{ opacity: isReal && !fmt.realType ? 0.6 : 1 }}
              >
                {/* Preview area */}
                <div style={{ height: 100, background: 'var(--bg-3)', position: 'relative', overflow: 'hidden' }}>
                  <FormatPreview type={fmt.preview} accent={fmt.tagColor} />
                  {selected === fmt.id && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={11} color="#fff" strokeWidth={2.5} />
                    </div>
                  )}
                  {isReal && !fmt.realType && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4 }}>Coming soon</span>
                    </div>
                  )}
                </div>

                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <fmt.icon size={13} color={fmt.tagColor} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{fmt.label}</span>
                    <span className="tag" style={{ background: `${fmt.tagColor}20`, color: fmt.tagColor, marginLeft: 'auto' }}>{fmt.tag}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 8 }}>{fmt.desc}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {fmt.options.slice(0,2).map(o => (
                        <span key={o} className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}>{o.split('/')[0].trim()}</span>
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace'" }}>{fmt.size}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Settings panel */}
        <div style={{
          width: 260, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-1)',
          overflow: 'auto', padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Settings2 size={14} color="var(--text-3)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              Settings
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Resolution */}
            <SettingGroup label="Resolution">
              <div style={{ display: 'flex', gap: 5 }}>
                {QUALITY_OPTIONS.map(q => (
                  <button key={q} onClick={() => setQuality(q)} style={{
                    flex: 1, padding: '5px 4px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
                    background: quality === q ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    color: quality === q ? '#a78bfa' : 'var(--text-3)',
                    border: `1px solid ${quality === q ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                    fontWeight: quality === q ? 500 : 400,
                    transition: 'all 0.15s',
                  }}>{q}</button>
                ))}
              </div>
            </SettingGroup>

            {/* FPS */}
            <SettingGroup label="Frame Rate">
              <div style={{ display: 'flex', gap: 5 }}>
                {FPS_OPTIONS.map(f => (
                  <button key={f} onClick={() => setFps(f)} style={{
                    flex: 1, padding: '5px 4px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
                    background: fps === f ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    color: fps === f ? '#a78bfa' : 'var(--text-3)',
                    border: `1px solid ${fps === f ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                    fontWeight: fps === f ? 500 : 400,
                    transition: 'all 0.15s',
                  }}>{f}</button>
                ))}
              </div>
            </SettingGroup>

            {/* Options from selected format */}
            <SettingGroup label="Options">
              {selectedFormat.options.map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 4,
                    background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={8} color="#a78bfa" />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{opt}</span>
                </label>
              ))}
            </SettingGroup>

            {/* AI-enhance */}
            <div style={{
              padding: 12, borderRadius: 10,
              background: 'rgba(99,102,241,0.06)',
              border: '1px solid rgba(99,102,241,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Sparkles size={12} color="#a78bfa" />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#a78bfa' }}>AI Enhance</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 8 }}>
                Auto-color grade, smart crop, and add smooth transitions before export
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{
                  width: 28, height: 16, borderRadius: 8, background: '#6366f1', position: 'relative',
                  border: '1px solid rgba(99,102,241,0.5)',
                }}>
                  <div style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Enabled</span>
              </label>
            </div>

            {/* Summary */}
            <div style={{ padding: 12, borderRadius: 10, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Summary</div>
              {[
                ['Format', `${selectedFormat.label} (${selectedFormat.ext})`],
                ['Resolution', quality],
                ['Frame rate', fps],
                ['Clips', `${screenshotCount} selected`],
                ['Est. size', selectedFormat.size],
                ...(isReal && selectedFormat.realType ? [['Backend export', 'Real data']] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{k}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-1)', fontFamily: "'DM Mono', monospace'", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

function FormatPreview({ type, accent }: { type: string; accent: string }) {
  if (type === 'video' || type === 'gif') return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 60, height: 38, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${accent}30` }}>
        <Play size={16} color={accent} fill={accent} />
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1,2,3,4,5,6,7,8].map(i => <div key={i} style={{ width: 4, height: i % 3 === 0 ? 16 : i % 2 === 0 ? 10 : 13, borderRadius: 2, background: `${accent}60` }} />)}
      </div>
    </div>
  )
  if (type === 'deck') return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {[1,0.8,0.6].map((o,i) => (
        <div key={i} style={{ width: 36, height: 26, borderRadius: 4, background: `rgba(255,255,255,${o * 0.06})`, border: `1px solid rgba(255,255,255,${o * 0.1})`, transform: `rotate(${(i-1)*4}deg)`, boxShadow: `0 4px 12px rgba(0,0,0,0.3)` }} />
      ))}
    </div>
  )
  if (type === 'grid') return (
    <div style={{ position: 'absolute', inset: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
      {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ borderRadius: 4, background: `${accent}${15 + i * 5}`, border: '1px solid rgba(255,255,255,0.06)' }} />)}
    </div>
  )
  if (type === 'sprite') return (
    <div style={{ position: 'absolute', inset: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, alignItems: 'stretch' }}>
      {Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ borderRadius: 3, background: `${accent}${10 + i * 4}`, border: '1px solid rgba(255,255,255,0.05)' }} />)}
    </div>
  )
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {['mp4','gif','pdf','zip'].map((l,i) => (
        <div key={l} style={{ padding: '3px 6px', borderRadius: 4, background: `${accent}20`, border: `1px solid ${accent}40`, fontSize: 9, fontFamily: "'DM Mono', monospace'", color: accent, transform: `rotate(${(i-1.5)*5}deg)` }}>.{l}</div>
      ))}
    </div>
  )
}
