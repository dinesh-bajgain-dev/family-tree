import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getRefreshToken, setAccessToken, setRefreshToken } from '../lib/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function loadCurrentUser() {
    try {
      const { data } = await api.get<User>('/auth/me/')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (getRefreshToken()) {
      loadCurrentUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/token/', { email, password })
    setAccessToken(data.access)
    setRefreshToken(data.refresh)
    await loadCurrentUser()
  }

  async function register(email: string, password: string, fullName: string) {
    await api.post('/auth/register/', { email, password, full_name: fullName })
    await login(email, password)
  }

  function logout() {
    setAccessToken(null)
    setRefreshToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
