import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, tokenStore } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  signIn: (token: string, user: User) => void
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(() => tokenStore.get())

  const me = useQuery({
    queryKey: ['me', token],
    queryFn: () => api.me().then((r) => r.user),
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60_000,
  })

  const signIn = useCallback(
    (newToken: string, user: User) => {
      tokenStore.set(newToken)
      queryClient.setQueryData(['me', newToken], user)
      setToken(newToken)
    },
    [queryClient],
  )

  const signOut = useCallback(() => {
    tokenStore.clear()
    setToken(null)
    queryClient.clear()
  }, [queryClient])

  // The API client fires this when the server rejects an expired token.
  useEffect(() => {
    const onLogout = () => signOut()
    window.addEventListener('freshfold:logout', onLogout)
    return () => window.removeEventListener('freshfold:logout', onLogout)
  }, [signOut])

  const user = token ? (me.data ?? null) : null
  return (
    <AuthContext.Provider value={{ user, loading: !!token && me.isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
