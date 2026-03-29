import { useState } from 'react'
import { Check } from 'lucide-react'

export interface CardPageData {
  id: string
  path: string
  title: string
  category: string
  color: string
  gradient: string
  accent: string
  captured: boolean
  depth: number
  children?: string[]
  webPath?: string   // Real screenshot image path from backend
}

interface Props {
  page: CardPageData
  selected?: boolean
  onSelect?: () => void
  showSelect?: boolean
  style?: React.CSSProperties
}

export default function ScreenshotCard({ page, selected, onSelect, showSelect, style }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="ss-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        border: selected ? '1.5px solid rgba(99,102,241,0.7)' : '1px solid var(--border)',
        cursor: 'pointer',
        position: 'relative',
        background: page.gradient,
        boxShadow: selected ? '0 0 0 1px rgba(99,102,241,0.3), 0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.3)',
        ...style,
      }}
    >
      {/* Screenshot image or mock content */}
      <div style={{ height: 110, position: 'relative', overflow: 'hidden' }}>
        {page.webPath ? (
          // Real screenshot
          <img
            src={page.webPath}
            alt={page.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          // Mock screenshot content
          <>
            {/* Nav bar mock */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 22,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6,
            }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: ['#ff5f57','#febc2e','#28c840'][i-1] }} />
              ))}
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginLeft: 8 }} />
            </div>

            {/* Hero section mock */}
            <div style={{ padding: '28px 12px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ height: 8, width: '60%', borderRadius: 4, background: `${page.accent}60` }} />
              <div style={{ height: 5, width: '80%', borderRadius: 3, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ height: 5, width: '70%', borderRadius: 3, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                <div style={{ height: 14, width: 48, borderRadius: 4, background: page.accent }} />
                <div style={{ height: 14, width: 40, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }} />
              </div>
            </div>

            {/* Cards row mock */}
            <div style={{ display: 'flex', gap: 5, padding: '0 12px' }}>
              {[0.7,0.5,0.6].map((o,i) => (
                <div key={i} style={{ flex: 1, height: 22, borderRadius: 5, background: `rgba(255,255,255,${o * 0.06})`, border: '1px solid rgba(255,255,255,0.06)' }} />
              ))}
            </div>

            {/* Glow */}
            <div style={{
              position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
              width: 80, height: 40, borderRadius: '50%',
              background: `${page.accent}30`, filter: 'blur(20px)',
              pointerEvents: 'none',
            }} />
          </>
        )}

        {/* Scan line on hover */}
        {hovered && <div className="scan-line" />}
      </div>

      {/* Footer */}
      <div style={{
        padding: '7px 10px',
        background: 'rgba(0,0,0,0.35)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.3 }}>{page.title}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>{page.path}</div>
        </div>
        <span className="tag" style={{ background: `${page.accent}20`, color: page.accent }}>
          {page.category}
        </span>
      </div>

      {/* Select overlay */}
      {showSelect && (
        <div className="ss-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)',
          opacity: hovered || selected ? 1 : 0,
          transition: 'opacity 0.2s',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: selected ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
            border: `1.5px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}>
            {selected && <Check size={14} color="#fff" strokeWidth={3} />}
          </div>
        </div>
      )}
    </div>
  )
}
