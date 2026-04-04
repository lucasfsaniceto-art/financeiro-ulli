'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC233]" />
      </div>
    )
  }

  if (pathname === '/login') {
    return <>{children}</>
  }

  if (!user) return null

  return (
    <>
      <Sidebar />
      <main className="ml-64 min-h-screen p-6 bg-gray-50">
        {children}
      </main>
    </>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  )
}
