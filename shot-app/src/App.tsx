import { useState, useEffect } from 'react'
import HomeScreen from './screens/HomeScreen'
import ScanScreen from './screens/ScanScreen'
import GalleryScreen from './screens/GalleryScreen'
import CanvasScreen from './screens/CanvasScreen'
import ExportScreen from './screens/ExportScreen'
import HistoryScreen from './screens/HistoryScreen'
import AnalyticsScreen from './screens/AnalyticsScreen'
import TemplatesScreen from './screens/TemplatesScreen'
import SettingsScreen from './screens/SettingsScreen'
import LoginScreen from './screens/LoginScreen'
import Sidebar from './components/Sidebar'
import ToastContainer from './components/ToastContainer'
import { useAuth } from './contexts/AuthContext'
import { showToast } from './lib/toast'
import type { ScanSettings } from './lib/api'

export type Screen = 'home' | 'scan' | 'gallery' | 'canvas' | 'export' | 'history' | 'analytics' | 'templates' | 'settings'

export interface NavigateMeta {
  sessionId?: string
  pendingScanUrl?: string
  pendingScanSettings?: ScanSettings
}

const SCREEN_TITLES: Record<Screen, string> = {
  home:      'ROAM — Turn any website into a cinematic experience',
  scan:      'ROAM · Scanning',
  gallery:   'ROAM · Gallery',
  canvas:    'ROAM · Canvas',
  export:    'ROAM · Export',
  history:   'ROAM · History',
  analytics: 'ROAM · Analytics',
  templates: 'ROAM · Templates',
  settings:  'ROAM · Settings',
}

const KEYBOARD_NAV: Partial<Record<string, Screen>> = {
  h: 'history', s: 'scan', g: 'gallery', c: 'canvas', e: 'export',
  a: 'analytics', t: 'templates',
}

function App() {
  const { user, loading, refreshUser, applyPromo } = useAuth()
  const [screen, setScreen] = useState<Screen>('home')
  const [animKey, setAnimKey] = useState(0)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [pendingScanUrl, setPendingScanUrl] = useState<string | undefined>(undefined)
  const [pendingScanSettings, setPendingScanSettings] = useState<ScanSettings | undefined>(undefined)

  const navigate = (s: Screen, meta?: NavigateMeta) => {
    setScreen(s)
    setAnimKey(k => k + 1)
    if (meta?.sessionId !== undefined) setSessionId(meta.sessionId)
    if (meta?.pendingScanUrl !== undefined) {
      setPendingScanUrl(meta.pendingScanUrl)
      setSessionId(undefined)
    }
    if (meta?.pendingScanSettings !== undefined) setPendingScanSettings(meta.pendingScanSettings)
  }

  // Handle Stripe redirect success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const upgrade = params.get('upgrade')
    const cs = params.get('cs')
    if (upgrade === 'success' && cs) {
      const token = localStorage.getItem('roam_token')
      if (token) {
        fetch(`/api/stripe/verify?cs=${cs}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(d => {
            if (d.success) {
              refreshUser()
              showToast('ZEN+ activated! Unlimited scans unlocked.', 'success', 5000)
            }
          })
          .catch(() => {})
      }
      window.history.replaceState({}, '', '/')
    }
    if (upgrade === 'cancelled') {
      window.history.replaceState({}, '', '/')
    }
    // Apply any pending promo from login screen
    const pendingPromo = localStorage.getItem('roam_pending_promo')
    if (pendingPromo && user) {
      localStorage.removeItem('roam_pending_promo')
      applyPromo(pendingPromo).then(() => {
        showToast('Promo applied — unlimited access unlocked!', 'success', 5000)
      }).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    document.title = SCREEN_TITLES[screen] ?? 'ROAM'
  }, [screen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const dest = KEYBOARD_NAV[e.key.toLowerCase()]
      if (dest) { e.preventDefault(); navigate(dest) }
      if (e.key === 'Escape' && screen !== 'home') { e.preventDefault(); navigate('home') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen])

  // Show loading state
  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', flexDirection: 'column', gap: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(99,102,241,0.45)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading ROAM…</span>
        <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
      </div>
    )
  }

  // Not authenticated — show login
  if (!user) {
    return (
      <>
        <LoginScreen onAuth={() => { /* AuthContext auto-updates */ }} />
        <ToastContainer />
      </>
    )
  }

  const showSidebar = screen !== 'home'

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      {showSidebar && <Sidebar current={screen} navigate={navigate} />}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div key={animKey} className="screen-enter" style={{ height: '100%' }}>
          {screen === 'home'      && <HomeScreen navigate={navigate} />}
          {screen === 'scan'      && (
            <ScanScreen
              navigate={navigate}
              sessionId={sessionId}
              pendingScanUrl={pendingScanUrl}
              pendingScanSettings={pendingScanSettings}
              onSessionReady={(id) => setSessionId(id)}
            />
          )}
          {screen === 'gallery'   && <GalleryScreen navigate={navigate} sessionId={sessionId} />}
          {screen === 'canvas'    && <CanvasScreen navigate={navigate} sessionId={sessionId} />}
          {screen === 'export'    && <ExportScreen navigate={navigate} sessionId={sessionId} />}
          {screen === 'history'   && <HistoryScreen navigate={navigate} onOpenSession={(id) => { setSessionId(id); navigate('gallery', { sessionId: id }) }} />}
          {screen === 'analytics' && <AnalyticsScreen navigate={navigate} />}
          {screen === 'templates' && <TemplatesScreen navigate={navigate} sessionId={sessionId} />}
          {screen === 'settings'  && <SettingsScreen navigate={navigate} />}
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

export default App
