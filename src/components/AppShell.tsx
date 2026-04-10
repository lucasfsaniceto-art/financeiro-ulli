'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import TopographyPattern from './TopographyPattern'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Track screen size
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-card bg-accent-subtle flex items-center justify-center animate-pulse-soft">
            <span className="text-accent font-display font-extrabold text-xl">U</span>
          </div>
          <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (pathname === '/login') {
    return <>{children}</>
  }

  if (!user) return null

  const sidebarWidth = sidebarCollapsed ? 60 : 300

  function handleToggle() {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen(prev => !prev)
    } else {
      setSidebarCollapsed(prev => !prev)
    }
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <TopographyPattern />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        className="min-h-screen relative z-10 transition-[margin-left,padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          paddingTop: isMobile ? '4rem' : '1.5rem',
          paddingLeft: isMobile ? '1rem' : '1.5rem',
          paddingRight: isMobile ? '1rem' : '1.5rem',
          paddingBottom: isMobile ? '1.5rem' : '1.5rem',
        }}
      >
        <div className="max-w-[1440px] mx-auto lg:px-2">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  )
}
