'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import TopographyPattern from './TopographyPattern'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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
    // On mobile, toggle the mobile drawer
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
      {/* Desktop: animated marginLeft; Mobile: no margin, top padding for hamburger */}
      <motion.main
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:block min-h-screen p-6 lg:p-8 relative z-10"
      >
        <div className="max-w-[1440px] mx-auto animate-fade-in">
          {children}
        </div>
      </motion.main>
      {/* Mobile: no sidebar margin, compact padding */}
      <main className="md:hidden min-h-screen pt-16 px-4 pb-6 relative z-10">
        <div className="max-w-[1440px] mx-auto animate-fade-in">
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
