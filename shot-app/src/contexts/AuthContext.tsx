import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface AuthUser {
  id: string
  email: string
  freeScansUsed: number
  hasPromo: boolean
  subscriptionActive: boolean
  stripeCustomerId: string | null
  createdAt: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  applyPromo: (code: string) => Promise<void>
  refreshUser: () => Promise<void>
  canScan: boolean
  isPro: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('roam_token'))
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    const t = localStorage.getItem('roam_token')
    if (!t) { setLoading(false); return }
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setToken(t)
      } else {
        localStorage.removeItem('roam_token')
        setUser(null); setToken(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refreshUser() }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Login failed') }
    const data = await res.json()
    localStorage.setItem('roam_token', data.token)
    setToken(data.token); setUser(data.user)
  }

  const register = async (email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Registration failed') }
    const data = await res.json()
    localStorage.setItem('roam_token', data.token)
    setToken(data.token); setUser(data.user)
  }

  const logout = () => {
    const t = localStorage.getItem('roam_token')
    if (t) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {})
    localStorage.removeItem('roam_token')
    setToken(null); setUser(null)
  }

  const applyPromo = async (code: string) => {
    const t = localStorage.getItem('roam_token')
    const res = await fetch('/api/auth/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ code }),
    })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Invalid promo code') }
    await refreshUser()
  }

  const isPro = !!user && (user.hasPromo || user.subscriptionActive)
  const canScan = !!user && (user.freeScansUsed < 1 || isPro)

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, applyPromo, refreshUser, canScan, isPro }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be within AuthProvider')
  return ctx
}
