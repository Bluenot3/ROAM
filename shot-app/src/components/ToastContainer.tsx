import { useState, useEffect } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'
import type { Toast } from '../lib/toast'

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const toast = (e as CustomEvent).detail as Toast
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, toast.duration)
    }
    window.addEventListener('shot-toast', handler)
    return () => window.removeEventListener('shot-toast', handler)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const colors = {
          success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#34d399', icon: <Check size={13} strokeWidth={2.5} /> },
          error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171', icon: <X size={13} strokeWidth={2.5} /> },
          warning: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24', icon: <AlertTriangle size={13} strokeWidth={2.5} /> },
          info:    { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)',  text: '#a78bfa', icon: <Info size={13} strokeWidth={2.5} /> },
        }[toast.type]

        return (
          <div
            key={toast.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              backdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              pointerEvents: 'auto',
              minWidth: 220, maxWidth: 360,
              animation: 'toast-in 0.2s ease',
            }}
          >
            <span style={{ color: colors.text, flexShrink: 0 }}>{colors.icon}</span>
            <span style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.4 }}>{toast.message}</span>
          </div>
        )
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
