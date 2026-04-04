'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface CurrencyBalance {
  balance: number
  revenue: number
  expenses: number
  receivables: number
  payables: number
}

interface DashboardData {
  balanceByCurrency: Record<string, CurrencyBalance>
  forecast30: number
  breakEvenTarget: number
  breakEvenProgress: number
  cashFlowRisk: boolean
  recentTransactions: Array<{
    id: string
    type: string
    amount: number
    currency: string
    description: string | null
    status: string
    transactionDate: string
    category: { name: string } | null
    paymentMethod: string
  }>
  revenueByPaymentMethod: Array<{ name: string; value: number }>
  revenueDistribution: Array<{ currency: string; recebido: number; previsto: number }>
}

interface SellerDashboardData {
  sellerDashboard: true
  totalSales: number
  totalValue: number
  monthlySales: number
  monthlyValue: number
  totalProfit: number
  recentSales: Array<{
    id: string
    client: string
    package: string
    totalValue: number
    saleDate: string
    status: string
  }>
}

const CHART_COLORS = ['#FFC233', '#E61C5D', '#0E1A2B', '#3B82F6', '#10B981', '#8B5CF6']
const CURRENCIES = ['BRL', 'CLP', 'USD']
const CURRENCY_FLAGS: Record<string, string> = { BRL: '🇧🇷', CLP: '🇨🇱', USD: '🇺🇸' }

export default function Dashboard() {
  const { isAdmin, user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [sellerData, setSellerData] = useState<SellerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const res = await apiFetch('/api/dashboard')
      if (res.ok) {
        const d = await res.json()
        if (d.sellerDashboard) {
          setSellerData(d)
        } else {
          setData(d)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC233]" />
      </div>
    )
  }

  // Seller Dashboard
  if (!isAdmin && sellerData) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ola, {user?.name}!</h1>
          <p className="text-gray-500">Seu painel de vendas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Total de Vendas</p>
              <ShoppingCart size={20} className="text-[#FFC233]" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{sellerData.totalSales}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Valor Total</p>
              <DollarSign size={20} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(sellerData.totalValue)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Vendas do Mes</p>
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{sellerData.monthlySales}</p>
            <p className="text-sm text-gray-400 mt-1">{formatCurrency(sellerData.monthlyValue)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Vendas Recentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Cliente</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Pacote</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Data</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-500">Valor</th>
                </tr>
              </thead>
              <tbody>
                {sellerData.recentSales.map(s => (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 text-sm font-medium text-gray-800">{s.client}</td>
                    <td className="p-4 text-sm text-gray-600">{s.package}</td>
                    <td className="p-4 text-sm text-gray-600">{formatDate(s.saleDate)}</td>
                    <td className="p-4">
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium',
                        s.status === 'ativo' ? 'bg-green-100 text-green-700' :
                        s.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      )}>
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-right font-medium text-green-600">
                      {formatCurrency(s.totalValue)}
                    </td>
                  </tr>
                ))}
                {sellerData.recentSales.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhuma venda encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Admin Dashboard
  const bc = data?.balanceByCurrency || {}

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Radar Financeiro</p>
        </div>
      </div>

      {data?.cashFlowRisk && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-[#E61C5D]" size={24} />
          <div>
            <p className="font-semibold text-red-800">Alerta de Fluxo de Caixa</p>
            <p className="text-sm text-red-600">
              Contas a pagar excedem contas a receber em uma ou mais moedas
            </p>
          </div>
        </div>
      )}

      {/* Saldo por Moeda */}
      {CURRENCIES.map(cur => {
        const c = bc[cur]
        if (!c || (c.balance === 0 && c.revenue === 0 && c.expenses === 0 && c.receivables === 0 && c.payables === 0)) return null
        return (
          <div key={cur}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-xl">{CURRENCY_FLAGS[cur]}</span> {cur}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard title="Saldo" value={formatCurrency(c.balance, cur)} icon={<Wallet size={20} />} color="bg-[#0E1A2B]" trend={c.balance >= 0 ? 'up' : 'down'} />
              <KPICard title="Receita do Mes" value={formatCurrency(c.revenue, cur)} icon={<TrendingUp size={20} />} color="bg-green-600" trend="up" />
              <KPICard title="Despesas do Mes" value={formatCurrency(c.expenses, cur)} icon={<TrendingDown size={20} />} color="bg-[#E61C5D]" trend="down" />
              <KPICard title="A Receber" value={formatCurrency(c.receivables, cur)} icon={<Clock size={20} />} color="bg-blue-600" />
              <KPICard title="A Pagar" value={formatCurrency(c.payables, cur)} icon={<ArrowDownRight size={20} />} color="bg-orange-500" />
            </div>
          </div>
        )
      })}

      {/* Resultado consolidado */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Resultado do Mes por Moeda</h2>
            <div className="space-y-3">
              {CURRENCIES.map(cur => {
                const c = bc[cur]
                if (!c || (c.revenue === 0 && c.expenses === 0)) return null
                const net = c.revenue - c.expenses
                return (
                  <div key={cur} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <span>{CURRENCY_FLAGS[cur]}</span> {cur}
                    </span>
                    <span className={cn('text-sm font-bold', net >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net, cur)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Break-even do Mes (BRL)</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="h-4 rounded-full transition-all"
                    style={{
                      width: `${Math.min(data.breakEvenProgress, 100)}%`,
                      backgroundColor: data.breakEvenProgress >= 100 ? '#10B981' : '#FFC233',
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600 w-16 text-right">{data.breakEvenProgress}%</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Meta: {formatCurrency(data.breakEvenTarget)} | Atingido: {formatCurrency(bc['BRL']?.revenue || 0)}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Receita por Metodo de Pagamento</h2>
          {data?.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueByPaymentMethod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#FFC233" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">Sem dados para exibir</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Distribuicao de Receita</h2>
          {data?.revenueDistribution && data.revenueDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.revenueDistribution.flatMap(d => [
                    { name: `${d.currency} Recebido`, value: d.recebido },
                    { name: `${d.currency} Previsto`, value: d.previsto },
                  ]).filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={100} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.revenueDistribution.flatMap((_, i) => [
                    <Cell key={`rec-${i}`} fill={CHART_COLORS[i * 2 % CHART_COLORS.length]} />,
                    <Cell key={`prev-${i}`} fill={CHART_COLORS[(i * 2 + 1) % CHART_COLORS.length]} />,
                  ]).filter((_, idx) => {
                    const flatData = data.revenueDistribution.flatMap(d => [d.recebido, d.previsto])
                    return flatData[idx] > 0
                  })}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">Sem dados para exibir</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Movimentacoes Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-500">Data</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Descricao</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Categoria</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentTransactions?.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-600">{formatDate(t.transactionDate)}</td>
                  <td className="p-4 text-sm text-gray-800">{t.description || '-'}</td>
                  <td className="p-4 text-sm text-gray-600">{t.category?.name || '-'}</td>
                  <td className="p-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', STATUS_COLORS[t.status] || 'bg-gray-100')}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-right font-medium">
                    <span className={cn('flex items-center justify-end gap-1', t.type === 'entrada' ? 'text-green-600' : 'text-red-600')}>
                      {t.type === 'entrada' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {formatCurrency(t.amount, t.currency)}
                    </span>
                  </td>
                </tr>
              ))}
              {(!data?.recentTransactions || data.recentTransactions.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhuma movimentacao encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, icon, color, trend }: { title: string; value: string; icon: React.ReactNode; color: string; trend?: 'up' | 'down' }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{title}</p>
        <div className={cn('p-1.5 rounded-lg text-white', color)}>{icon}</div>
      </div>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      {trend && (
        <div className="flex items-center mt-1">
          {trend === 'up' ? <ArrowUpRight className="text-green-500" size={14} /> : <ArrowDownRight className="text-red-500" size={14} />}
        </div>
      )}
    </div>
  )
}
