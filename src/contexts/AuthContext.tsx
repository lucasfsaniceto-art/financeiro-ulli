'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'vendedor'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAdmin: boolean
  token: string | null
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('caixa-ulli-token')
    const storedUser = localStorage.getItem('caixa-ulli-user')
    if (stored && storedUser) {
      setToken(stored)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem('caixa-ulli-token', data.token)
        localStorage.setItem('caixa-ulli-user', JSON.stringify(data.user))
        return { success: true }
      }
      return { success: false, error: data.error || 'Erro ao fazer login' }
    } catch {
      return { success: false, error: 'Erro de conexao' }
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('caixa-ulli-token')
    localStorage.removeItem('caixa-ulli-user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin', token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
