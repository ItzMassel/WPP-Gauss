import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react'
import {api} from './api'

export interface User {
  id: string
  username: string
}

interface Session {
  user: User
  totalPoints: number
}

export type PointSource = 'quiz' | 'lesson' | 'game'

interface AuthValue {
  user: User | null
  totalPoints: number
  loading: boolean
  login: (login: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Reports earned Gauß-Punkte to the server. Does nothing when logged out. Returns points actually awarded. */
  awardPoints: (source: PointSource, sourceRef: string, points: number) => Promise<number>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({children}: {children: ReactNode}) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<Session>('/me')
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (loginName: string, password: string) => {
    setSession(await api<Session>('/login', {login: loginName, password}))
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    setSession(await api<Session>('/register', {username, email, password}))
  }, [])

  const logout = useCallback(async () => {
    await api('/logout', {}).catch(() => undefined)
    setSession(null)
  }, [])

  const awardPoints = useCallback(
    async (source: PointSource, sourceRef: string, points: number) => {
      if (!session || points < 1) return 0
      try {
        const res = await api<{awarded: number; totalPoints: number}>('/points', {source, sourceRef, points})
        setSession((s) => (s ? {...s, totalPoints: res.totalPoints} : s))
        return res.awarded
      } catch {
        return 0
      }
    },
    [session],
  )

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      totalPoints: session?.totalPoints ?? 0,
      loading,
      login,
      register,
      logout,
      awardPoints,
    }),
    [session, loading, login, register, logout, awardPoints],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
