'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Target,
  Calendar,
  Clock,
  Info,
  CircleAlert,
} from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { EmptyDesert } from '@/components/DesertSVG'
import IconCircle from '@/components/IconCircle'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface CurrencyBalance {
  balance: number
  revenue: number
  expenses: number
  receivables: number
  payables: number
}

interface PrevMonth { revenue: number; expenses: number; net: number }

interface UpcomingItem {
  id: string
  description: string | null
  amount: number
  currency: string
  dueDate: string
  daysUntil: number
}

interface AlertItem {
  type: 'error' | 'warning' | 'info'
  text: string
  count?: number
}

interface DailyFlowPoint {
  date: string
  entradas: number
  saidas: number
}

interface RecentTransaction {
  id: string
  type: string
  amount: number
  currency: string
  description: string | null
  status: string
  transactionDate: string
  category: { name: string | null } | null
  paymentMethod: string
}

interface RecentSale {
  id: string
  client: string
  package: string
  totalValue: number
  currency: string
  saleDate: string
  status: string
  sellerName: string | null
}

interface DashboardData {
  balanceByCurrency: Record<string, CurrencyBalance>
  previousMonth: Record<string, PrevMonth>
  dailyFlow: DailyFlowPoint[]
  monthProgress: { daysElapsed: number; daysInMonth: number; percentage: number; pacedRevenue: number }
  forecast30: number
  breakEvenTarget: number
  breakEvenProgress: number
  breakEvenRemaining: number
  cashFlowRisk: boolean
  overdueCount: number
  uncategorizedCount: number
  upcomingPayables: UpcomingItem[]
  upcomingReceivables: UpcomingItem[]
  alerts: AlertItem[]
  recentTransactions: RecentTransaction[]
  revenueByPaymentMethod: Array<{ name: string; value: number }>
  salesSummary?: { totalActive: number; totalValue: number; monthlySalesCount: number }
  recentSales?: RecentSale[]
}

interface SellerDashboardData {
  sellerDashboard: true
  totalSales: number
  totalValue: number
  monthlySales: number
  monthlyValue: number
  totalProfit: number
  recentSales: Array<{ id: string; client: string; package: string; totalValue: number; saleDate: string; status: string }>
}

const CURRENCIES = ['BRL', 'CLP', 'USD']
const CURRENCY_FLAGS: Record<string, string> = { BRL: '\u{1F1E7}\u{1F1F7}', CLP: '\u{1F1E8}\u{1F1F1}', USD: '\u{1F1FA}\u{1F1F8}' }

// ===== Shared tooltip for charts =====
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const d = label ? new Date(label) : null
  const formattedLabel = d && !isNaN(d.getTime())
    ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : label
  return (
    <div className="card-elevated p-3 text-xs space-y-1 rounded-input border border-border">
      <p className="text-text-muted font-display font-medium">{formattedLabel}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <p className="text-text-primary font-mono font-medium">{p.name}: {formatCurrency(p.value)}</p>
        </div>
      ))}
    </div>
  )
}

// ===== Delta indicator (percentage change vs previous value) =====
function DeltaIndicator({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0 && current === 0) return null
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-small font-display text-text-muted">
        <span className="tabular-nums">novo</span>
      </span>
    )
  }
  const diff = current - previous
  const pct = Math.round((diff / Math.abs(previous)) * 100)
  const isUp = diff > 0
  const isGood = invert ? !isUp : isUp
  const Icon = isUp ? ArrowUp : ArrowDown
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-small font-display font-semibold tabular-nums',
      isGood ? 'text-status-success' : 'text-status-error'
    )}>
      <Icon size={11} strokeWidth={2.5} />
      {Math.abs(pct)}%
    </span>
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

  useEffect(() => { loadDashboard() }, [loadDashboard])

  useEffect(() => {
    const interval = setInterval(() => loadDashboard(true), 30000)
    return () => clearInterval(interval)
  }, [loadDashboard])

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

  // ===== Seller Dashboard (preserved from previous version) =====
  if (!isAdmin && sellerData) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading font-display text-text-primary">Olá, {user?.name}</h1>
            <p className="text-text-muted text-body mt-1">Seu painel de vendas</p>
          </div>
          <button onClick={() => loadDashboard(true)} disabled={refreshing} className="btn-ghost text-text-muted">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SimpleKPI title="Total de Vendas" value={String(sellerData.totalSales)} icon={ShoppingCart} />
          <SimpleKPI title="Valor Total" value={formatCurrency(sellerData.totalValue)} icon={DollarSign} />
          <SimpleKPI title="Vendas do Mês" value={String(sellerData.monthlySales)} subtitle={formatCurrency(sellerData.monthlyValue)} icon={TrendingUp} />
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

  // ===== Admin Dashboard — Executive Panel =====
  if (!data) return null

  const bc = data.balanceByCurrency
  const pm = data.previousMonth
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  // Main BRL metrics
  const brl = bc['BRL'] || { balance: 0, revenue: 0, expenses: 0, receivables: 0, payables: 0 }
  const brlPrev = pm['BRL'] || { revenue: 0, expenses: 0, net: 0 }
  const brlNet = brl.revenue - brl.expenses

  // 7-day upcoming totals (BRL only for KPI card — other currencies shown in detail list)
  const upcomingPayable7d = data.upcomingPayables.filter(i => i.currency === 'BRL').reduce((s, i) => s + i.amount, 0)
  const upcomingReceivable7d = data.upcomingReceivables.filter(i => i.currency === 'BRL').reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== COMPACT HEADER ===== */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label text-text-muted font-display">
            {greeting}, {user?.name?.split(' ')[0] || 'Administrador'}
          </p>
          <h1 className="text-heading font-display text-text-primary mt-0.5">Painel Executivo</h1>
          <p className="text-small text-text-muted font-display mt-0.5">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            Dia {data.monthProgress.daysElapsed} de {data.monthProgress.daysInMonth}
          </p>
        </div>
        <button
          onClick={() => loadDashboard(true)}
          disabled={refreshing}
          className="btn-ghost text-text-muted hover:text-accent flex-shrink-0"
          aria-label="Atualizar"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline text-small">Atualizar</span>
        </button>
      </div>

      {/* ===== ALERT BAR (only if alerts exist) ===== */}
      {data.alerts.length > 0 && <AlertBar alerts={data.alerts} />}

      {/* ===== KPI ROW — 6 Executive Cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <ExecutiveKPI
          label="Saldo BRL"
          value={formatCurrency(brl.balance)}
          icon={Wallet}
          tone={brl.balance >= 0 ? 'neutral' : 'negative'}
          accent
        />
        <ExecutiveKPI
          label="Entradas do mês"
          value={formatCurrency(brl.revenue)}
          icon={ArrowUpRight}
          delta={<DeltaIndicator current={brl.revenue} previous={brlPrev.revenue} />}
          tone="positive"
        />
        <ExecutiveKPI
          label="Saídas do mês"
          value={formatCurrency(brl.expenses)}
          icon={ArrowDownRight}
          delta={<DeltaIndicator current={brl.expenses} previous={brlPrev.expenses} invert />}
          tone="negative"
        />
        <ExecutiveKPI
          label="Resultado"
          value={formatCurrency(brlNet)}
          icon={TrendingUp}
          delta={<DeltaIndicator current={brlNet} previous={brlPrev.net} />}
          tone={brlNet >= 0 ? 'positive' : 'negative'}
        />
        <ExecutiveKPI
          label="A pagar (7 dias)"
          value={formatCurrency(upcomingPayable7d)}
          subtitle={data.upcomingPayables.length > 0 ? `${data.upcomingPayables.length} ${data.upcomingPayables.length === 1 ? 'conta' : 'contas'}` : 'nenhuma'}
          icon={Clock}
          tone="neutral"
        />
        <ExecutiveKPI
          label="A receber (7 dias)"
          value={formatCurrency(upcomingReceivable7d)}
          subtitle={data.upcomingReceivables.length > 0 ? `${data.upcomingReceivables.length} ${data.upcomingReceivables.length === 1 ? 'conta' : 'contas'}` : 'nenhuma'}
          icon={Calendar}
          tone="neutral"
        />
      </div>

      {/* ===== ROW 2: Cash Flow Chart + Break-even ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <CashFlowChart data={data.dailyFlow} />
        <BreakEvenCard data={data} />
      </div>

      {/* ===== ROW 3: Monthly Result + Currency Cards ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <MonthlyResultCard
          current={brlNet}
          previous={brlPrev.net}
          revenue={brl.revenue}
          expenses={brl.expenses}
          pacedRevenue={data.monthProgress.pacedRevenue}
          daysElapsed={data.monthProgress.daysElapsed}
          daysInMonth={data.monthProgress.daysInMonth}
        />
        <CurrencyPanel balanceByCurrency={bc} />
      </div>

      {/* ===== ROW 4: Recent Transactions + Upcoming ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <RecentTransactionsCard transactions={data.recentTransactions} />
        <UpcomingCard
          payables={data.upcomingPayables}
          receivables={data.upcomingReceivables}
        />
      </div>

      {/* ===== Recent Sales (preserved) ===== */}
      {data.recentSales && data.recentSales.length > 0 && (
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
                  <strong className="text-text-primary font-mono">{data.salesSummary.monthlySalesCount}</strong> este mês
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
    </div>
  )
}

// =======================================================================
// ========================   COMPONENTS   ===============================
// =======================================================================

function AlertBar({ alerts }: { alerts: AlertItem[] }) {
  const iconMap = { error: CircleAlert, warning: AlertTriangle, info: Info }
  const toneMap = {
    error: 'bg-status-error/[0.08] border-status-error/20 text-status-error',
    warning: 'bg-status-warning/[0.08] border-status-warning/20 text-status-warning',
    info: 'bg-accent/[0.06] border-accent/15 text-accent',
  }
  return (
    <div className="flex flex-wrap items-center gap-2 animate-slide-up">
      {alerts.map((a, i) => {
        const Icon = iconMap[a.type]
        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-pill border text-small font-display font-medium',
              toneMap[a.type]
            )}
          >
            <Icon size={13} strokeWidth={2.2} />
            <span>{a.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function ExecutiveKPI({
  label,
  value,
  subtitle,
  icon: Icon,
  delta,
  tone = 'neutral',
  accent = false,
}: {
  label: string
  value: string
  subtitle?: string
  icon: typeof Wallet
  delta?: React.ReactNode
  tone?: 'positive' | 'negative' | 'neutral'
  accent?: boolean
}) {
  const toneClass =
    tone === 'positive' ? 'text-status-success'
    : tone === 'negative' ? 'text-status-error'
    : accent ? 'text-accent'
    : 'text-text-primary'
  return (
    <div className="card-surface p-4 md:p-5 flex flex-col gap-2.5 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-label font-display text-text-muted uppercase tracking-wider leading-tight">
          {label}
        </span>
        <div className="w-7 h-7 rounded-full bg-accent-subtle flex items-center justify-center flex-shrink-0">
          <Icon size={13} strokeWidth={1.8} className="text-accent" />
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn('font-mono font-semibold tabular-nums tracking-tight text-[1.05rem] md:text-[1.125rem] truncate', toneClass)}>
          {value}
        </p>
        <div className="flex items-center gap-2 mt-0.5 min-h-[16px]">
          {delta}
          {subtitle && <span className="text-small font-display text-text-muted truncate">{subtitle}</span>}
        </div>
      </div>
    </div>
  )
}

function CashFlowChart({ data }: { data: DailyFlowPoint[] }) {
  const hasData = data.some(d => d.entradas > 0 || d.saidas > 0)
  return (
    <div className="card-surface p-5 md:p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-subheading font-display text-text-primary">Fluxo de Caixa</h3>
          <p className="text-small font-display text-text-muted mt-0.5">Entradas vs saídas · últimos 30 dias · BRL</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-small font-display text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" /> Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-text-secondary" /> Saídas
          </span>
        </div>
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C27B4F" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#C27B4F" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6B5D52" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#6B5D52" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,36,32,0.05)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#8C7B6B', fontFamily: 'Plus Jakarta Sans' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => {
                const d = new Date(v)
                return isNaN(d.getTime()) ? v : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
              }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#8C7B6B', fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
                return String(v)
              }}
              width={40}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#C27B4F" strokeWidth={2} fill="url(#gradEntradas)" />
            <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#6B5D52" strokeWidth={1.5} fill="url(#gradSaidas)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-[260px] gap-3">
          <EmptyDesert className="w-[180px] h-[100px] text-text-primary" />
          <p className="text-sm font-display text-text-muted">Sem movimentações nos últimos 30 dias</p>
        </div>
      )}
    </div>
  )
}

function BreakEvenCard({ data }: { data: DashboardData }) {
  const pct = Math.min(data.breakEvenProgress, 100)
  const overTarget = data.breakEvenProgress >= 100
  const paceVsTarget = data.breakEvenTarget > 0
    ? Math.round((data.monthProgress.pacedRevenue / data.breakEvenTarget) * 100)
    : 0
  const current = data.balanceByCurrency['BRL']?.revenue || 0
  return (
    <div className="card-surface p-5 md:p-6 flex flex-col">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-subheading font-display text-text-primary">Break-even</h3>
          <p className="text-small font-display text-text-muted mt-0.5">Meta mensal · BRL</p>
        </div>
        <IconCircle icon={Target} size="sm" />
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className={cn(
          'font-mono text-[2rem] md:text-[2.25rem] font-semibold tabular-nums tracking-tight leading-none',
          overTarget ? 'text-status-success' : 'text-text-primary'
        )}>
          {data.breakEvenProgress.toFixed(1)}%
        </span>
        <span className="text-small font-display text-text-muted">atingido</span>
      </div>

      <div className="mt-4 h-2 bg-surface-hover rounded-pill overflow-hidden">
        <div
          className="h-full rounded-pill transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: overTarget
              ? 'linear-gradient(90deg, #5B9A6B, #7AB88A)'
              : 'linear-gradient(90deg, #C27B4F, #D4956A)',
          }}
        />
      </div>

      <div className="mt-5 space-y-2.5 text-small font-display">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Atingido</span>
          <span className="font-mono tabular-nums text-text-primary font-semibold">{formatCurrency(current)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Meta</span>
          <span className="font-mono tabular-nums text-text-secondary">{formatCurrency(data.breakEvenTarget)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <span className="text-text-muted">Falta</span>
          <span className={cn(
            'font-mono tabular-nums font-semibold',
            overTarget ? 'text-status-success' : 'text-accent'
          )}>
            {overTarget ? 'Meta batida ✓' : formatCurrency(data.breakEvenRemaining)}
          </span>
        </div>
      </div>

      {data.monthProgress.daysElapsed > 0 && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="flex items-center justify-between text-small font-display">
            <span className="text-text-muted">Projeção (ritmo atual)</span>
            <span className={cn(
              'font-mono tabular-nums font-semibold',
              paceVsTarget >= 100 ? 'text-status-success' : 'text-text-secondary'
            )}>
              {formatCurrency(data.monthProgress.pacedRevenue)}
            </span>
          </div>
          <p className="text-[0.7rem] text-text-muted font-display mt-1">
            No ritmo atual, projeção de {paceVsTarget}% da meta ao fim do mês
          </p>
        </div>
      )}
    </div>
  )
}

function MonthlyResultCard({
  current,
  previous,
  revenue,
  expenses,
  pacedRevenue,
  daysElapsed,
  daysInMonth,
}: {
  current: number
  previous: number
  revenue: number
  expenses: number
  pacedRevenue: number
  daysElapsed: number
  daysInMonth: number
}) {
  const isPositive = current >= 0
  const pctChange = previous !== 0 ? Math.round(((current - previous) / Math.abs(previous)) * 100) : null
  return (
    <div className="card-surface p-5 md:p-6 relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-subheading font-display text-text-primary">Resultado do Mês</h3>
          <p className="text-small font-display text-text-muted mt-0.5">
            Receita − Despesas · BRL
          </p>
        </div>
        <IconCircle icon={isPositive ? TrendingUp : TrendingDown} size="sm" />
      </div>

      <div className="flex items-baseline gap-3 flex-wrap">
        <span className={cn(
          'font-mono text-[2rem] md:text-[2.5rem] font-semibold tabular-nums tracking-tight leading-none',
          isPositive ? 'text-status-success' : 'text-status-error'
        )}>
          {isPositive ? '+' : ''}{formatCurrency(current)}
        </span>
        {pctChange !== null && (
          <span className={cn(
            'inline-flex items-center gap-1 text-small font-display font-semibold px-2 py-1 rounded-pill',
            pctChange >= 0 ? 'bg-status-success/[0.08] text-status-success' : 'bg-status-error/[0.08] text-status-error'
          )}>
            {pctChange >= 0 ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />}
            {Math.abs(pctChange)}% vs mês anterior
          </span>
        )}
        {pctChange === null && previous === 0 && (
          <span className="text-small font-display text-text-muted">sem comparativo</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-border-subtle">
        <div>
          <p className="text-label font-display text-text-muted uppercase tracking-wider">Receita</p>
          <p className="font-mono text-sm md:text-base font-semibold tabular-nums text-accent mt-1">
            {formatCurrency(revenue)}
          </p>
        </div>
        <div>
          <p className="text-label font-display text-text-muted uppercase tracking-wider">Despesas</p>
          <p className="font-mono text-sm md:text-base font-semibold tabular-nums text-text-secondary mt-1">
            {formatCurrency(expenses)}
          </p>
        </div>
        <div>
          <p className="text-label font-display text-text-muted uppercase tracking-wider">Mês anterior</p>
          <p className="font-mono text-sm md:text-base font-semibold tabular-nums text-text-muted mt-1">
            {formatCurrency(previous)}
          </p>
        </div>
        <div>
          <p className="text-label font-display text-text-muted uppercase tracking-wider">Projeção</p>
          <p className="font-mono text-sm md:text-base font-semibold tabular-nums text-text-primary mt-1">
            {formatCurrency(pacedRevenue - expenses * (daysInMonth / Math.max(daysElapsed, 1)))}
          </p>
        </div>
      </div>
    </div>
  )
}

function CurrencyPanel({ balanceByCurrency }: { balanceByCurrency: Record<string, CurrencyBalance> }) {
  const activeCurrencies = CURRENCIES.filter(cur => {
    const c = balanceByCurrency[cur]
    return c && (c.balance !== 0 || c.revenue !== 0 || c.expenses !== 0)
  })

  return (
    <div className="card-surface p-5 md:p-6">
      <h3 className="text-subheading font-display text-text-primary mb-1">Fluxo por Moeda</h3>
      <p className="text-small font-display text-text-muted mb-5">Resumo do mês atual</p>

      {activeCurrencies.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-small font-display text-text-muted">Sem dados para exibir</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeCurrencies.map(cur => {
            const c = balanceByCurrency[cur]
            const net = c.revenue - c.expenses
            return (
              <div key={cur} className="p-4 rounded-input bg-surface-hover/60 border border-border-subtle">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{CURRENCY_FLAGS[cur]}</span>
                    <span className="text-label font-display text-text-primary font-semibold uppercase tracking-wider">{cur}</span>
                  </div>
                  <span className={cn(
                    'font-mono text-sm font-semibold tabular-nums',
                    c.balance >= 0 ? 'text-status-success' : 'text-status-error'
                  )}>
                    {formatCurrency(c.balance, cur)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[0.68rem] font-display text-text-muted uppercase tracking-wider">Entradas</p>
                    <p className="font-mono text-[0.78rem] md:text-xs font-semibold tabular-nums text-accent mt-0.5 truncate">
                      {formatCurrency(c.revenue, cur)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-display text-text-muted uppercase tracking-wider">Saídas</p>
                    <p className="font-mono text-[0.78rem] md:text-xs font-semibold tabular-nums text-text-secondary mt-0.5 truncate">
                      {formatCurrency(c.expenses, cur)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.68rem] font-display text-text-muted uppercase tracking-wider">Líquido</p>
                    <p className={cn(
                      'font-mono text-[0.78rem] md:text-xs font-semibold tabular-nums mt-0.5 truncate',
                      net >= 0 ? 'text-status-success' : 'text-status-error'
                    )}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net, cur)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RecentTransactionsCard({ transactions }: { transactions: RecentTransaction[] }) {
  return (
    <div className="card-surface overflow-hidden">
      <div className="px-5 md:px-6 py-4 md:py-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-subheading font-display text-text-primary">Movimentações Recentes</h3>
          <p className="text-small font-display text-text-muted mt-0.5">Últimos registros financeiros</p>
        </div>
      </div>
      <div className="p-4 md:p-5">
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map(t => {
              const isEntrada = t.type === 'entrada'
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-input hover:bg-surface-hover/70 transition-colors group"
                >
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    isEntrada ? 'bg-accent-subtle' : 'bg-surface-hover'
                  )}>
                    {isEntrada
                      ? <ArrowUpRight size={15} className="text-accent" strokeWidth={2} />
                      : <ArrowDownRight size={15} className="text-text-secondary" strokeWidth={2} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-display font-medium text-text-primary truncate">
                        {t.description || 'Sem descrição'}
                      </p>
                      <span className={cn('text-[0.68rem]', STATUS_COLORS[t.status] || 'badge-neutral')}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-small font-display text-text-muted">
                        {t.category?.name || 'Sem categoria'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-text-muted/40" />
                      <span className="text-small font-mono text-text-muted tabular-nums">
                        {formatDate(t.transactionDate)}
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    'font-mono font-semibold tabular-nums text-sm flex-shrink-0',
                    isEntrada ? 'text-accent' : 'text-text-secondary'
                  )}>
                    {isEntrada ? '+' : '−'}{formatCurrency(t.amount, t.currency)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <EmptyDesert className="w-[160px] h-[90px] text-text-primary" />
            <p className="text-sm font-display text-text-muted">Nenhuma movimentação encontrada</p>
          </div>
        )}
      </div>
    </div>
  )
}

function UpcomingCard({ payables, receivables }: { payables: UpcomingItem[]; receivables: UpcomingItem[] }) {
  const hasAny = payables.length > 0 || receivables.length > 0
  return (
    <div className="card-surface overflow-hidden flex flex-col">
      <div className="px-5 md:px-6 py-4 md:py-5 border-b border-border">
        <h3 className="text-subheading font-display text-text-primary">Próximos 7 dias</h3>
        <p className="text-small font-display text-text-muted mt-0.5">Contas vencendo em breve</p>
      </div>
      <div className="p-4 md:p-5 flex-1">
        {!hasAny ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <p className="text-small font-display text-text-muted">Nenhum vencimento próximo</p>
          </div>
        ) : (
          <div className="space-y-5">
            {receivables.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight size={12} className="text-accent" />
                  <span className="text-label font-display text-text-muted uppercase tracking-wider">
                    A receber
                  </span>
                </div>
                <div className="space-y-1.5">
                  {receivables.map(item => (
                    <UpcomingRow key={item.id} item={item} variant="receivable" />
                  ))}
                </div>
              </div>
            )}
            {payables.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight size={12} className="text-text-secondary" />
                  <span className="text-label font-display text-text-muted uppercase tracking-wider">
                    A pagar
                  </span>
                </div>
                <div className="space-y-1.5">
                  {payables.map(item => (
                    <UpcomingRow key={item.id} item={item} variant="payable" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function UpcomingRow({ item, variant }: { item: UpcomingItem; variant: 'payable' | 'receivable' }) {
  const isToday = item.daysUntil === 0
  const dayLabel = isToday ? 'hoje' : item.daysUntil === 1 ? 'amanhã' : `em ${item.daysUntil}d`
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-small font-display text-text-primary truncate font-medium">
          {item.description || 'Sem descrição'}
        </p>
        <p className={cn(
          'text-[0.7rem] font-display mt-0.5',
          isToday ? 'text-status-warning font-semibold' : 'text-text-muted'
        )}>
          {dayLabel} · {formatDate(item.dueDate)}
        </p>
      </div>
      <span className={cn(
        'font-mono text-xs font-semibold tabular-nums flex-shrink-0',
        variant === 'receivable' ? 'text-accent' : 'text-text-secondary'
      )}>
        {formatCurrency(item.amount, item.currency)}
      </span>
    </div>
  )
}

function SimpleKPI({ title, value, subtitle, icon }: {
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
