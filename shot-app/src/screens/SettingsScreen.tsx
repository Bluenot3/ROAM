import { useState } from 'react'
import { Settings, Monitor, Globe, Zap, Eye, Keyboard, Info, Bell } from 'lucide-react'
import type { Screen, NavigateMeta } from '../App'

interface Props {
  navigate: (s: Screen, meta?: NavigateMeta) => void
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: 'none',
        background: value ? 'var(--accent)' : 'var(--border)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        outline: 'none',
      }}
      aria-checked={value}
      role="switch"
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: value ? 21 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 12,
  marginTop: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const sectionStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '16px 18px',
  marginBottom: 14,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid var(--border)',
}

const rowLastStyle: React.CSSProperties = {
  ...rowStyle,
  borderBottom: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text)',
}

const subLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  marginTop: 2,
}

function StepperNumber({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}) {
  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(2))))
  const inc = () => onChange(Math.min(max, parseFloat((value + step).toFixed(2))))
  const display = format ? format(value) : String(value)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      <button
        onClick={dec}
        style={{
          width: 28, height: 28, borderRadius: '6px 0 0 6px',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >−</button>
      <div style={{
        padding: '0 12px', height: 28, border: '1px solid var(--border)',
        borderLeft: 'none', borderRight: 'none',
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, minWidth: 52, textAlign: 'center',
        color: 'var(--accent)',
      }}>
        {display}
      </div>
      <button
        onClick={inc}
        style={{
          width: 28, height: 28, borderRadius: '0 6px 6px 0',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  )
}

function SelectButtons({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${value === opt ? 'var(--accent)' : 'var(--border)'}`,
            background: value === opt ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: value === opt ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: 12,
            fontWeight: value === opt ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

const SHORTCUTS = {
  Global: [
    { key: 'H', action: 'Home' },
    { key: 'S', action: 'Scan' },
    { key: 'G', action: 'Gallery' },
    { key: 'C', action: 'Canvas' },
    { key: 'E', action: 'Export' },
  ],
  Canvas: [
    { key: 'Space', action: 'Play / Pause' },
    { key: '←', action: 'Seek −1s' },
    { key: '→', action: 'Seek +1s' },
    { key: 'Del', action: 'Remove clip' },
    { key: 'R', action: 'Resize mode' },
    { key: '0', action: 'Jump to start' },
  ],
  Gallery: [
    { key: 'A', action: 'Select all' },
    { key: 'Esc', action: 'Deselect' },
    { key: 'Enter', action: 'Open in Canvas' },
  ],
}

export default function SettingsScreen({ navigate: _navigate }: Props) {
  // Scan Defaults
  const [maxPages, setMaxPages] = useState(20)
  const [viewport, setViewport] = useState('1440×900')
  const [waitTime, setWaitTime] = useState('1s')
  const [fullPage, setFullPage] = useState(true)
  const [recordVideo, setRecordVideo] = useState(false)

  // Gallery
  const [autoSelectPages, setAutoSelectPages] = useState(true)
  const [showDepthIndicators, setShowDepthIndicators] = useState(true)
  const [autoNavGallery, setAutoNavGallery] = useState(true)

  // Canvas
  const [autoLoadTimeline, setAutoLoadTimeline] = useState(true)
  const [defaultClipDuration, setDefaultClipDuration] = useState(2.7)
  const [loopPlayback, setLoopPlayback] = useState(false)

  // Export
  const [defaultQuality, setDefaultQuality] = useState('1080p')
  const [aiEnhance, setAiEnhance] = useState(true)

  // Notifications
  const [notifyScanComplete, setNotifyScanComplete] = useState(true)
  const [showTips, setShowTips] = useState(true)

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: 'var(--bg)',
      color: 'var(--text)',
      padding: '32px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Settings size={20} style={{ color: 'var(--accent)' }} />
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Settings</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* LEFT: Settings sections */}
        <div>
          {/* Scan Defaults */}
          <p style={sectionHeaderStyle}>
            <Monitor size={13} /> Scan Defaults
          </p>
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Max Pages</div>
                <div style={subLabelStyle}>Maximum number of pages to crawl per scan</div>
              </div>
              <StepperNumber
                value={maxPages}
                onChange={setMaxPages}
                min={5}
                max={100}
                step={5}
              />
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Viewport</div>
                <div style={subLabelStyle}>Browser window dimensions for screenshots</div>
              </div>
              <SelectButtons
                options={['1440×900', '1920×1080', '1280×720']}
                value={viewport}
                onChange={setViewport}
              />
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Wait Time</div>
                <div style={subLabelStyle}>Delay before capturing each page</div>
              </div>
              <SelectButtons
                options={['0.5s', '1s', '2s', '3s']}
                value={waitTime}
                onChange={setWaitTime}
              />
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Full-page screenshot</div>
                <div style={subLabelStyle}>Capture the entire scrollable page height</div>
              </div>
              <ToggleSwitch value={fullPage} onChange={setFullPage} />
            </div>
            <div style={rowLastStyle}>
              <div>
                <div style={labelStyle}>Record video walkthrough</div>
                <div style={subLabelStyle}>Capture a video alongside screenshots</div>
              </div>
              <ToggleSwitch value={recordVideo} onChange={setRecordVideo} />
            </div>
          </div>

          {/* Gallery */}
          <p style={{ ...sectionHeaderStyle, marginTop: 20 }}>
            <Eye size={13} /> Gallery
          </p>
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Auto-select all pages in Continue Scan</div>
                <div style={subLabelStyle}>Automatically check all pages when resuming a scan</div>
              </div>
              <ToggleSwitch value={autoSelectPages} onChange={setAutoSelectPages} />
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Show page depth indicators</div>
                <div style={subLabelStyle}>Display crawl depth badge on gallery cards</div>
              </div>
              <ToggleSwitch value={showDepthIndicators} onChange={setShowDepthIndicators} />
            </div>
            <div style={rowLastStyle}>
              <div>
                <div style={labelStyle}>Auto-navigate to Gallery after scan</div>
                <div style={subLabelStyle}>Jump to Gallery when scan finishes</div>
              </div>
              <ToggleSwitch value={autoNavGallery} onChange={setAutoNavGallery} />
            </div>
          </div>

          {/* Canvas */}
          <p style={{ ...sectionHeaderStyle, marginTop: 20 }}>
            <Zap size={13} /> Canvas
          </p>
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Auto-load screenshots into timeline</div>
                <div style={subLabelStyle}>Add all gallery selections to Canvas on open</div>
              </div>
              <ToggleSwitch value={autoLoadTimeline} onChange={setAutoLoadTimeline} />
            </div>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Clip duration default</div>
                <div style={subLabelStyle}>Default seconds per clip when adding to timeline</div>
              </div>
              <StepperNumber
                value={defaultClipDuration}
                onChange={setDefaultClipDuration}
                min={0.5}
                max={10}
                step={0.1}
                format={v => `${v.toFixed(1)}s`}
              />
            </div>
            <div style={rowLastStyle}>
              <div>
                <div style={labelStyle}>Loop playback</div>
                <div style={subLabelStyle}>Restart timeline automatically when it ends</div>
              </div>
              <ToggleSwitch value={loopPlayback} onChange={setLoopPlayback} />
            </div>
          </div>

          {/* Export */}
          <p style={{ ...sectionHeaderStyle, marginTop: 20 }}>
            <Globe size={13} /> Export
          </p>
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Default quality</div>
                <div style={subLabelStyle}>Output resolution for exported videos</div>
              </div>
              <SelectButtons
                options={['720p', '1080p', '4K']}
                value={defaultQuality}
                onChange={setDefaultQuality}
              />
            </div>
            <div style={rowLastStyle}>
              <div>
                <div style={labelStyle}>AI Enhance on export</div>
                <div style={subLabelStyle}>Apply AI upscaling and sharpening automatically</div>
              </div>
              <ToggleSwitch value={aiEnhance} onChange={setAiEnhance} />
            </div>
          </div>

          {/* Notifications */}
          <p style={{ ...sectionHeaderStyle, marginTop: 20 }}>
            <Bell size={13} /> Notifications
          </p>
          <div style={sectionStyle}>
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Notify when scan completes</div>
                <div style={subLabelStyle}>Show a notification when crawling finishes</div>
              </div>
              <ToggleSwitch value={notifyScanComplete} onChange={setNotifyScanComplete} />
            </div>
            <div style={rowLastStyle}>
              <div>
                <div style={labelStyle}>Show tips and shortcuts</div>
                <div style={subLabelStyle}>Display contextual hints throughout the app</div>
              </div>
              <ToggleSwitch value={showTips} onChange={setShowTips} />
            </div>
          </div>
        </div>

        {/* RIGHT: Keyboard shortcuts */}
        <div style={{ position: 'sticky', top: 0 }}>
          <p style={sectionHeaderStyle}>
            <Keyboard size={13} /> Keyboard Shortcuts
          </p>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 14,
          }}>
            {(Object.entries(SHORTCUTS) as [string, { key: string; action: string }[]][]).map(([group, shortcuts], gi) => (
              <div key={group}>
                <div style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  borderTop: gi > 0 ? '1px solid var(--border)' : 'none',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {group}
                </div>
                {shortcuts.map(({ key, action }, i) => (
                  <div key={key} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 14px',
                    borderBottom: i < shortcuts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{action}</span>
                    <kbd style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      color: 'var(--text)',
                      boxShadow: '0 1px 0 var(--border)',
                    }}>
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* About */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Info size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>About</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>Shot</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              v1.0.0-beta
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
              Capture, compose, and export beautiful product walkthroughs from any website.
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['Documentation', 'Changelog', 'Report a bug'].map(link => (
                <a
                  key={link}
                  href="#"
                  onClick={e => e.preventDefault()}
                  style={{
                    fontSize: 12,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    opacity: 0.85,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
