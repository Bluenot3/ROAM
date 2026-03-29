import { Grid2x2, Sparkles, Download, Settings, Globe, Clock, BarChart2, Layers, LogOut, Zap } from 'lucide-react'
import type { Screen, NavigateMeta } from '../App'
import { useAuth } from '../contexts/AuthContext'

interface Props { current: Screen; navigate: (s: Screen, meta?: NavigateMeta) => void }

const PRIMARY_ITEMS = [
  { id: 'scan' as Screen, icon: Globe, label: 'Scan' },
  { id: 'gallery' as Screen, icon: Grid2x2, label: 'Gallery' },
  { id: 'canvas' as Screen, icon: Sparkles, label: 'Canvas' },
  { id: 'export' as Screen, icon: Download, label: 'Export' },
]

const SECONDARY_ITEMS = [
  { id: 'history' as Screen, icon: Clock, label: 'History' },
  { id: 'analytics' as Screen, icon: BarChart2, label: 'Analytics' },
  { id: 'templates' as Screen, icon: Layers, label: 'Templates' },
]

function NavItem({ icon: Icon, label, active, onClick }: {
  id?: Screen; icon: any; label: string; active: boolean; onClick: () => void
}) {
  return (
    <div
      title={label}
      onClick={onClick}
      style={{
        width: 44, height: 40, borderRadius: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2,
        cursor: 'pointer',
        background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: active ? '#a78bfa' : 'var(--text-3)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)' } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)' } }}
    >
      <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
      <span style={{ fontSize: 8, fontWeight: active ? 600 : 400, letterSpacing: '0.2px', lineHeight: 1 }}>{label}</span>
      {active && (
        <div style={{
          position: 'absolute', left: -1, top: '50%', transform: 'translateY(-50%)',
          width: 2.5, height: 18, borderRadius: '0 2px 2px 0',
          background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6)',
        }} />
      )}
    </div>
  )
}

export default function Sidebar({ current, navigate }: Props) {
  const { user, logout, isPro } = useAuth()
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '?'

  return (
    <div style={{
      width: 62,
      height: '100dvh',
      background: 'var(--bg-1)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: 2,
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Logo */}
      <div
        onClick={() => navigate('home')}
        title="ROAM Home"
        style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', marginBottom: 12, flexShrink: 0,
          boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(99,102,241,0.6)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(99,102,241,0.4)' }}
      >
        {/* Compass icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      </div>

      {/* Primary nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: 'center' }}>
        {PRIMARY_ITEMS.map(({ id, icon, label }) => (
          <NavItem key={id} id={id} icon={icon} label={label} active={current === id} onClick={() => navigate(id)} />
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 30, height: 1, background: 'var(--border)', margin: '6px 0' }} />

      {/* Secondary nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', alignItems: 'center' }}>
        {SECONDARY_ITEMS.map(({ id, icon, label }) => (
          <NavItem key={id} id={id} icon={icon} label={label} active={current === id} onClick={() => navigate(id)} />
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Settings */}
      <NavItem id="settings" icon={Settings} label="Settings" active={current === 'settings'} onClick={() => navigate('settings')} />

      {/* Pro badge */}
      {isPro && (
        <div title="ZEN+ Active" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 16, borderRadius: 4,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          marginTop: 4,
        }}>
          <Zap size={9} color="#fff" fill="#fff" />
          <span style={{ fontSize: 8, color: '#fff', fontWeight: 700, marginLeft: 2 }}>PRO</span>
        </div>
      )}

      {/* Avatar */}
      <div
        title={`${user?.email || ''} — Click to sign out`}
        onClick={() => {
          if (confirm('Sign out of ROAM?')) logout()
        }}
        style={{
          width: 30, height: 30, borderRadius: '50%', marginTop: 6,
          background: isPro
            ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
            : 'linear-gradient(135deg, #374151, #1f2937)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: '#fff', cursor: 'pointer',
          border: isPro ? '1.5px solid rgba(99,102,241,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
          transition: 'transform 0.15s',
          position: 'relative',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'
          const lout = e.currentTarget.querySelector('.lout-icon') as HTMLElement
          if (lout) lout.style.opacity = '1'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          const lout = e.currentTarget.querySelector('.lout-icon') as HTMLElement
          if (lout) lout.style.opacity = '0'
        }}
      >
        <span>{initials}</span>
        <div className="lout-icon" style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.15s',
        }}>
          <LogOut size={11} color="#fff" />
        </div>
      </div>
    </div>
  )
}
