import { useState } from 'react'
import { X, Zap, Globe, Camera, Film, Map, Download, Star, Tag } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  onClose: () => void
  onUpgraded: () => void
}

const FEATURES = [
  { icon: Globe, label: 'Unlimited URL scans' },
  { icon: Camera, label: 'Full-page HD screenshots, every page' },
  { icon: Film, label: 'Video walkthroughs of any site' },
  { icon: Map, label: 'Complete site maps & page discovery' },
  { icon: Download, label: '14+ export formats (ZIP, PDF, Video)' },
  { icon: Star, label: 'AI-curated canvas & sequence editor' },
]

export default function UpgradeModal({ onClose, onUpgraded }: Props) {
  const { user, applyPromo, refreshUser } = useAuth()
  const [promoVisible, setPromoVisible] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    try {
      const token = localStorage.getItem('roam_token')
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const e = await res.json()
        alert(e.error || 'Could not start checkout')
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (e) {
      alert('Checkout unavailable. Please try again later.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handlePromo = async () => {
    if (!promoCode.trim()) return
    setPromoLoading(true); setPromoError('')
    try {
      await applyPromo(promoCode.trim())
      await refreshUser()
      onUpgraded()
    } catch (err: unknown) {
      setPromoError(err instanceof Error ? err.message : 'Invalid code')
    } finally { setPromoLoading(false) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 480, borderRadius: 20,
        background: 'var(--bg-1)',
        border: '1px solid var(--border-med)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border)', borderRadius: 8, width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)',
        }}>
          <X size={14} />
        </button>

        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          }}>
            <Zap size={22} color="#fff" fill="#fff" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.6px', color: 'var(--text-1)', margin: '0 0 6px' }}>
            Upgrade to ZEN+
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 4px' }}>
            You've used your free scan.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
            Unlock unlimited access for <strong style={{ color: 'var(--text-2)' }}>$15/month</strong>.
          </p>
        </div>

        {/* Features */}
        <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-2)' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={12} color="#a78bfa" />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.3 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ padding: '0 28px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-primary" onClick={handleUpgrade} disabled={checkoutLoading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, opacity: checkoutLoading ? 0.7 : 1 }}>
            {checkoutLoading ? 'Opening checkout…' : 'Upgrade to ZEN+ — $15/mo'}
          </button>

          {/* Promo */}
          <button onClick={() => setPromoVisible(v => !v)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            color: 'var(--text-3)', fontSize: 12, padding: '4px 0',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            <Tag size={12} /> Have a promo code?
          </button>

          {promoVisible && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={promoCode} onChange={e => setPromoCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePromo()}
                placeholder="Enter promo code"
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 9,
                  background: 'var(--bg-2)', border: `1px solid ${promoError ? 'rgba(248,113,113,0.5)' : 'var(--border-med)'}`,
                  color: 'var(--text-1)', fontSize: 13, outline: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <button onClick={handlePromo} disabled={promoLoading} style={{
                padding: '10px 16px', borderRadius: 9,
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                color: 'var(--text-1)', fontSize: 13, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                opacity: promoLoading ? 0.6 : 1,
              }}>
                {promoLoading ? '…' : 'Apply'}
              </button>
            </div>
          )}
          {promoError && <p style={{ fontSize: 12, color: '#f87171', margin: 0, textAlign: 'center' }}>{promoError}</p>}

          <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', margin: 0 }}>
            Logged in as <strong style={{ color: 'var(--text-2)' }}>{user?.email}</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
