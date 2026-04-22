import { createContext, useContext, type ReactNode } from 'react'

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

// No-auth stub — app runs without login, all features unlocked
const GUEST_USER: AuthUser = {
  id: 'local',
  email: 'local@roam.tool',
  freeScansUsed: 0,
  hasPromo: true,
  subscriptionActive: true,
  stripeCustomerId: null,
  createdAt: new Date().toISOString(),
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const noop = async () => {}

  return (
    <AuthContext.Provider value={{
      user: GUEST_USER,
      token: null,
      loading: false,
      login: noop,
      register: noop,
      logout: noop,
      applyPromo: noop,
      refreshUser: noop,
      canScan: true,
      isPro: true,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be within AuthProvider')
  return ctx
}
