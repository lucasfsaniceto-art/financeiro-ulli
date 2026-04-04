'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  HandCoins,
  ShoppingCart,
  TrendingUp,
  FileBarChart,
  Settings,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const adminNavItems = [
  { section: 'Visao Geral', items: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Movimentacoes', items: [
    { href: '/movimentacoes', label: 'Todas', icon: ArrowLeftRight },
    { href: '/contas-pagar', label: 'Contas a Pagar', icon: CreditCard },
    { href: '/contas-receber', label: 'Contas a Receber', icon: HandCoins },
  ]},
  { section: 'Tours', items: [
    { href: '/vendas', label: 'Vendas', icon: ShoppingCart },
    { href: '/fluxo-futuro', label: 'Fluxo Futuro', icon: TrendingUp },
  ]},
  { section: 'Relatorios', items: [
    { href: '/relatorios', label: 'Relatorios', icon: FileBarChart },
  ]},
  { section: 'Configuracoes', items: [
    { href: '/configuracoes', label: 'Configuracoes', icon: Settings },
  ]},
]

const sellerNavItems = [
  { section: 'Visao Geral', items: [
    { href: '/', label: 'Meu Painel', icon: LayoutDashboard },
  ]},
  { section: 'Tours', items: [
    { href: '/vendas', label: 'Minhas Vendas', icon: ShoppingCart },
  ]},
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()

  const navSections = isAdmin ? adminNavItems : sellerNavItems

  // Full sidebar content (used in both desktop expanded panel and mobile drawer)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-[15px] font-display font-bold text-white tracking-tight">Caixa Ulli</h1>
        <p className="text-[10px] text-text-muted font-display font-medium tracking-widest uppercase mt-0.5">Financeiro</p>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.section} className="mb-4">
            <p className="px-3 mb-1.5 text-[10px] font-display font-semibold uppercase tracking-[0.15em] text-text-muted">
              {section.section}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-button text-[13px] font-display font-medium transition-all duration-normal relative',
                      isActive
                        ? 'bg-accent-subtle text-accent'
                        : 'text-dark-text-secondary hover:text-white hover:bg-white/[0.04]'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-accent rounded-r-full" />
                    )}
                    <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 pb-4">
        <div className="border-t border-dark-border-subtle pt-4 space-y-3">
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center">
              <User size={14} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-display font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-text-muted truncate uppercase tracking-wider font-display font-medium">
                {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-[13px] text-text-muted hover:text-status-error hover:bg-status-error/5 rounded-button w-full transition-all font-display"
          >
            <LogOut size={15} strokeWidth={1.5} />
            Sair do sistema
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ===== MOBILE: Hamburger button (fixed top-left) ===== */}
      <button
        onClick={() => mobileOpen ? onMobileClose() : onToggle()}
        className="md:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-full bg-surface-sidebar flex items-center justify-center text-white shadow-float"
        aria-label="Menu"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* ===== MOBILE: Drawer overlay + panel ===== */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden fixed left-0 top-0 h-full w-[280px] bg-surface-sidebar z-[56] overflow-hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== DESKTOP: Two-layer sidebar ===== */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full z-50">
        {/* Faixa de icones (sempre visivel) */}
        <div className="w-sidebar-icon bg-surface-sidebar-icon flex flex-col items-center py-4 relative">
          {/* Logo */}
          <div className="w-10 h-10 rounded-card bg-accent-subtle flex items-center justify-center mb-6">
            <span className="text-accent font-display font-extrabold text-lg">U</span>
          </div>

          {/* Icones de navegacao */}
          <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2">
            {navSections.flatMap(s => s.items).map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-normal',
                    isActive
                      ? 'bg-accent-subtle'
                      : 'hover:bg-white/5'
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2 : 1.5}
                    className={isActive ? 'text-accent' : 'text-text-muted'}
                  />
                </Link>
              )
            })}
          </nav>

          {/* Toggle + Avatar */}
          <div className="flex flex-col items-center gap-3 mt-auto">
            <button
              onClick={onToggle}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent-subtle transition-all"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
            <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center">
              <span className="text-accent font-display font-semibold text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>

          {/* ULLI marca d'agua vertical */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
            <span
              className="text-white font-display font-extrabold text-2xl tracking-[0.3em] opacity-[0.04]"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              ULLI
            </span>
          </div>
        </div>

        {/* Painel expandido */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="bg-surface-sidebar overflow-hidden flex flex-col"
            >
              <div className="w-[240px]">
                {sidebarContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </>
  )
}
