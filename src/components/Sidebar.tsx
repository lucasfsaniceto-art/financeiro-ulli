'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const adminNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/movimentacoes', label: 'Movimentacoes', icon: ArrowLeftRight },
  { href: '/contas-pagar', label: 'Contas a Pagar', icon: CreditCard },
  { href: '/contas-receber', label: 'Contas a Receber', icon: HandCoins },
  { href: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { href: '/fluxo-futuro', label: 'Fluxo Futuro', icon: TrendingUp },
  { href: '/relatorios', label: 'Relatorios', icon: FileBarChart },
  { href: '/configuracoes', label: 'Configuracoes', icon: Settings },
]

const sellerNavItems = [
  { href: '/', label: 'Meu Painel', icon: LayoutDashboard },
  { href: '/vendas', label: 'Minhas Vendas', icon: ShoppingCart },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()

  const navItems = isAdmin ? adminNavItems : sellerNavItems

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0E1A2B] text-white flex flex-col z-50">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-[#FFC233]">Caixa Ulli</h1>
        <p className="text-xs text-gray-400 mt-1">Gestao Financeira</p>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-6 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-[#FFC233]/10 text-[#FFC233] border-r-2 border-[#FFC233]'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[#FFC233]/20 flex items-center justify-center">
            <User size={16} className="text-[#FFC233]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">
              {user?.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg w-full transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
