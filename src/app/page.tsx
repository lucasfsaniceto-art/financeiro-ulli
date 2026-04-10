'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Users,
  RefreshCw,
} from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { HorizonSilhouette, SunIndicator, GaugeArc, EmptyDesert } from '@/components/DesertSVG'
import IconCircle from '@/components/IconCircle'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, ResponsiveContainer,
} from 'recharts'

interface CurrencyBalance {
  balance: number
  revenue: number
  expenses: number
  receivables: number
  payables: number
}

interface RecentSale {
  id: string; client: string; package: string; totalValue: number; currency: string
  saleDate: string; status: string; sellerName: string | null
}

interface DashboardData {
  balanceByCurrency: Record<string, CurrencyBalance>
  forecast30: number
  breakEvenTarget: number
  breakEvenProgress: number
  cashFlowRisk: boolean
  recentTransactions: Array<{
    id: string; type: string; amount: number; currency: string; description: string | null
    status: string; transactionDate: string; category: { name: string } | null; paymentMethod: string
  }>
  revenueByPaymentMethod: Array<{ name: string; value: number }>
  revenueDistribution: Array<{ currency: string; recebido: number; previsto: number }>
  salesSummary?: { totalActive: number; totalValue: number; monthlySalesCount: number }
  recentSales?: RecentSale[]
}

interface SellerDashboardData {
  sellerDashboard: true; totalSales: number; totalValue: number; monthlySales: number
  monthlyValue: number; totalProfit: number
  recentSales: Array<{ id: string; client: string; package: string; totalValue: number; saleDate: string; status: string }>
}

const CURRENCIES = ['BRL', 'CLP', 'USD']
const CURRENCY_FLAGS: Record<string, string> = { BRL: '\u{1F1E7}\u{1F1F7}', CLP: '\u{1F1E8}\u{1F1F1}', USD: '\u{1F1FA}\u{1F1F8}' }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-elevated p-3 text-xs space-y-1 rounded-input border border-border">
      <p className="text-text-muted font-display font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-text-primary font-mono font-medium">{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { isAdmin, user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [sellerData, setSellerData] = useState<SellerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await apiFetch('/api/dashboard')
      if (res.ok) {
        const d = await res.json()
        if (d.sellerDashboard) { setSellerData(d); setData(null) }
        else { setData(d); setSellerData(null) }
      }
    } catch (e) { console.error(e) } finally { setLoading(false); setRefreshing(false) }
  }, [])

  // Load on mount — always fetch fresh data
  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Also poll every 30 seconds to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [loadDashboard])

  // Refresh when tab/window becomes visible
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') loadDashboard(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  // Seller Dashboard
  if (!isAdmin && sellerData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading font-display text-text-primary">Ola, {user?.name}</h1>
            <p className="text-text-muted text-body mt-1">Seu painel de vendas</p>
          </div>
          <button onClick={() => loadDashboard(true)} disabled={refreshing} className="btn-ghost text-text-muted">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <KPICard title="Total de Vendas" value={String(sellerData.totalSales)} icon={ShoppingCart} />
          <KPICard title="Valor Total" value={formatCurrency(sellerData.totalValue)} icon={DollarSign} />
          <KPICard title="Vendas do Mes" value={String(sellerData.monthlySales)} subtitle={formatCurrency(sellerData.monthlyValue)} icon={TrendingUp} />
        </div>
        <div className="card-surface overflow-hidden">
          <div className="px-6 py-5 border-b border-border">
            <h2 className="text-subheading font-display text-text-primary">Vendas Recentes</h2>
          </div>
          <table className="table-warm">
            <thead><tr><th>Cliente</th><th>Pacote</th><th>Data</th><th>Status</th><th className="text-right">Valor</th></tr></thead>
            <tbody>
              {sellerData.recentSales.map(s => (
                <tr key={s.id}>
                  <td className="text-text-primary font-medium">{s.client}</td>
                  <td className="text-text-secondary">{s.package}</td>
                  <td className="text-text-muted font-mono tabular-nums">{formatDate(s.saleDate)}</td>
                  <td><span className={cn(s.status === 'ativo' ? 'badge-success' : s.status === 'cancelado' ? 'badge-error' : 'badge-accent')}>{s.status}</span></td>
                  <td className="text-right text-accent font-mono font-semibold tabular-nums">{formatCurrency(s.totalValue)}</td>
                </tr>
              ))}
              {sellerData.recentSales.length === 0 && <tr><td colSpan={5} className="text-center text-text-muted py-12">Nenhuma venda encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Admin Dashboard
  const bc = data?.balanceByCurrency || {}
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  // Build revenue flow data for area chart
  const flowData = CURRENCIES.filter(cur => bc[cur]).map(cur => ({
    name: cur,
    receita: bc[cur].revenue,
    despesa: bc[cur].expenses,
  }))

  return (
    <div className="space-y-8">
      {/* ===== ZONA A: Hero Card — Horizonte do Atacama ===== */}
      <div className="card-surface relative overflow-hidden" style={{ minHeight: 140 }}>
        <div className="absolute inset-0">
          <HorizonSilhouette className="absolute bottom-0 left-0 w-full h-[60px] md:h-[80px] text-text-primary" />
          <SunIndicator hour={hour} />
        </div>
        {/* Refresh button */}
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-text-muted hover:text-accent transition-colors"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between p-4 md:p-6 h-full gap-2">
          <div>
            <p className="text-text-muted text-label font-display">{greeting},</p>
            <h1 className="text-heading font-display text-text-primary mt-1">{user?.name}</h1>
            <p className="text-text-muted text-small font-display mt-1 md:mt-2">
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-label text-text-muted font-display uppercase tracking-wider">Balanco Geral</p>
            <p className="metric-hero text-text-primary mt-1">
              {formatCurrency(bc['BRL']?.balance || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Alert */}
      {data?.cashFlowRisk && (
        <div className="flex items-center gap-3 bg-status-error/[0.08] border border-status-error/15 rounded-card p-4 animate-fade-in">
          <AlertTriangle size={20} className="text-status-error flex-shrink-0" />
          <div>
            <p className="text-sm font-display font-semibold text-status-error">Alerta de Fluxo de Caixa</p>
            <p className="text-small font-display text-status-error/70 mt-0.5">Contas a pagar excedem contas a receber em uma ou mais moedas</p>
          </div>
        </div>
      )}

      {/* ===== ZONA B + C: Chart + KPIs side by side ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        {/* Zona B: Chart Principal — Paisagem de Dunas */}
        <div className="card-surface p-6">
          <h3 className="text-label font-display text-text-muted uppercase tracking-wider mb-6">Receita por Pagamento</h3>
          {data?.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueByPaymentMethod} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,36,32,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8C7B6B', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#8C7B6B', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Receita" fill="#C27B4F" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState text="Sem dados para exibir" />}
        </div>

        {/* Zona C: KPIs com Gauge Arcs */}
        <div className="space-y-4">
          {CURRENCIES.filter(cur => bc[cur] && (bc[cur].balance !== 0 || bc[cur].revenue !== 0)).map(cur => {
            const c = bc[cur]
            const target = c.revenue + c.expenses > 0 ? c.revenue + c.expenses : 1
            const revenuePercent = (c.revenue / target) * 100
            return (
              <div key={cur} className="card-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{CURRENCY_FLAGS[cur]}</span>
                  <span className="text-label font-display text-text-muted uppercase tracking-wider">{cur}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="min-w-0 overflow-hidden">
                    <p className="font-mono text-xs md:text-sm font-semibold tabular-nums text-accent truncate">{formatCurrency(c.revenue, cur)}</p>
                    <p className="text-small text-text-muted font-display">Receita</p>
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className="font-mono text-xs md:text-sm font-semibold tabular-nums text-text-secondary truncate">{formatCurrency(c.expenses, cur)}</p>
                    <p className="text-small text-text-muted font-display">Despesas</p>
                  </div>
                  <div className="min-w-0 overflow-hidden">
                    <p className={cn('font-mono text-xs md:text-sm font-semibold tabular-nums truncate', c.balance >= 0 ? 'text-status-success' : 'text-status-error')}>
                      {formatCurrency(c.balance, cur)}
                    </p>
                    <p className="text-small text-text-muted font-display">Saldo</p>
                  </div>
                </div>
                <div className="mt-3">
                  <GaugeArc percentage={revenuePercent} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Break-even + Forecast */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card-surface p-6">
            <h3 className="text-label font-display text-text-muted uppercase tracking-wider mb-5">Resultado do Mes</h3>
            <div className="space-y-4">
              {CURRENCIES.map(cur => {
                const c = bc[cur]
                if (!c || (c.revenue === 0 && c.expenses === 0)) return null
                const net = c.revenue - c.expenses
                return (
                  <div key={cur} className="flex items-center justify-between">
                    <span className="text-sm font-display text-text-secondary flex items-center gap-2">
                      <span>{CURRENCY_FLAGS[cur]}</span> {cur}
                    </span>
                    <span className={cn('text-sm font-mono font-bold tabular-nums', net >= 0 ? 'text-status-success' : 'text-status-error')}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net, cur)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card-surface p-6">
            <h3 className="text-label font-display text-text-muted uppercase tracking-wider mb-5">Break-even Mensal (BRL)</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-surface-hover rounded-pill overflow-hidden">
                  <div
                    className="h-full rounded-pill transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(data.breakEvenProgress, 100)}%`,
                      background: data.breakEvenProgress >= 100
                        ? 'linear-gradient(90deg, #5B9A6B, #7AB88A)'
                        : 'linear-gradient(90deg, #C27B4F, #D4956A)',
                    }}
                  />
                </div>
                <span className="text-sm font-mono font-bold text-text-primary w-14 text-right tabular-nums">{data.breakEvenProgress}%</span>
              </div>
              <div className="flex justify-between text-small font-display text-text-muted">
                <span>Meta: {formatCurrency(data.breakEvenTarget)}</span>
                <span>Atingido: {formatCurrency(bc['BRL']?.revenue || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Flow Area Chart */}
      {flowData.length > 0 && (
        <div className="card-surface p-6">
          <h3 className="text-label font-display text-text-muted uppercase tracking-wider mb-6">Fluxo por Moeda</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={flowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,36,32,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8C7B6B', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8C7B6B', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <defs>
                <linearGradient id="gradientReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C27B4F" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#C27B4F" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="receita" name="Receita" stroke="#C27B4F" strokeWidth={2} fill="url(#gradientReceita)" />
              <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#8C7B6B" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ===== VENDAS RECENTES (Admin) ===== */}
      {data?.recentSales && data.recentSales.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconCircle icon={ShoppingCart} size="sm" />
              <h3 className="text-subheading font-display text-text-primary">Vendas Recentes</h3>
            </div>
            {data.salesSummary && (
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-small font-display text-text-muted">
                  <strong className="text-text-primary font-mono">{data.salesSummary.totalActive}</strong> ativas
                </span>
                <span className="text-small font-display text-text-muted">
                  <strong className="text-accent font-mono">{formatCurrency(data.salesSummary.totalValue)}</strong> total
                </span>
                <span className="text-small font-display text-text-muted">
                  <strong className="text-text-primary font-mono">{data.salesSummary.monthlySalesCount}</strong> este mes
                </span>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="table-warm">
              <thead>
                <tr><th>Cliente</th><th>Pacote</th><th>Vendedor</th><th>Data</th><th>Status</th><th className="text-right">Valor</th></tr>
              </thead>
              <tbody>
                {data.recentSales.map(s => (
                  <tr key={s.id}>
                    <td className="text-text-primary font-display font-medium">{s.client}</td>
                    <td className="text-text-secondary font-display">{s.package}</td>
                    <td className="text-text-muted font-display">{s.sellerName || '-'}</td>
                    <td className="text-text-muted font-mono tabular-nums">{formatDate(s.saleDate)}</td>
                    <td>
                      <span className={cn(
                        s.status === 'ativo' ? 'badge-success' :
                        s.status === 'cancelado' ? 'badge-error' : 'badge-accent'
                      )}>{s.status}</span>
                    </td>
                    <td className="text-right font-mono font-semibold tabular-nums text-accent">{formatCurrency(s.totalValue, s.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== ZONA D: Feed de Movimentacoes Recentes — Trilha no Deserto ===== */}
      <div className="card-surface overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-subheading font-display text-text-primary">Movimentacoes Recentes</h3>
        </div>
        <div className="p-6">
          {data?.recentTransactions && data.recentTransactions.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="timeline-line" />
              <div className="space-y-4">
                {data.recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-start gap-2 md:gap-4 pl-2 md:pl-[28px] relative">
                    {/* Node */}
                    <div className="absolute left-[8px] md:left-[34px] top-1.5 hidden md:block">
                      {t.type === 'entrada' ? (
                        <div className="timeline-node-income" />
                      ) : (
                        <div className="timeline-node-expense" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 md:ml-6 card-surface p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-display font-medium text-text-primary truncate">{t.description || 'Sem descricao'}</p>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1">
                          <span className="text-small font-display text-text-muted">{t.category?.name || '-'}</span>
                          <span className="text-small font-mono text-text-muted tabular-nums">{formatDate(t.transactionDate)}</span>
                          <span className={STATUS_COLORS[t.status] || 'badge-neutral'}>{STATUS_LABELS[t.status] || t.status}</span>
                        </div>
                      </div>
                      <span className={cn(
                        'font-mono font-semibold tabular-nums flex items-center gap-1 text-sm flex-shrink-0',
                        t.type === 'entrada' ? 'text-accent' : 'text-text-secondary'
                      )}>
                        {t.type === 'entrada' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {formatCurrency(t.amount, t.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState text="Nenhuma movimentacao encontrada" />
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, subtitle, icon }: {
  title: string; value: string; subtitle?: string; icon: typeof Wallet
}) {
  return (
    <div className="card-surface-interactive p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-label font-display text-text-muted uppercase tracking-wider">{title}</span>
        <IconCircle icon={icon} size="md" />
      </div>
      <p className="font-mono text-xl font-bold tabular-nums text-text-primary">{value}</p>
      {subtitle && <p className="text-small font-display text-text-muted mt-1">{subtitle}</p>}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] gap-4">
      <EmptyDesert className="w-[200px] h-[120px] text-text-primary" />
      <p className="text-sm font-display text-text-muted">{text}</p>
    </div>
  )
}
