'use client'

import { useEffect, useState, useCallback } from 'react'
import { Download, FileBarChart } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS } from '@/lib/utils'
import { mapFinancialRecord } from '@/lib/api'

interface Category { id: string; name: string; type: string }
interface FinancialRecord {
  id: string; type: string; paymentMethod: string; amount: number; currency: string
  transactionDate: string; dueDate: string | null; paymentDate: string | null; status: string
  description: string | null; category: { name: string } | null; sale: { client: string } | null
}

const CURRENCIES = ['BRL', 'CLP', 'USD']
const CURRENCY_FLAGS: Record<string, string> = { BRL: '\u{1F1E7}\u{1F1F7}', CLP: '\u{1F1E8}\u{1F1F1}', USD: '\u{1F1FA}\u{1F1F8}' }

export default function RelatoriosPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ startDate: '', endDate: '', categoryId: '', status: '', type: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.status) params.set('status', filters.status)
      if (filters.type) params.set('type', filters.type)
      const res = await fetch(`/api/financial-records?${params}`)
      if (res.ok) { const raw = await res.json(); setRecords(raw.map(mapFinancialRecord)) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [filters])

  useEffect(() => {
    loadData()
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(console.error)
  }, [loadData])

  function exportCSV() {
    const headers = ['Data', 'Tipo', 'Descricao', 'Categoria', 'Metodo Pagamento', 'Status', 'Valor', 'Moeda']
    const rows = records.map(r => [formatDate(r.transactionDate), r.type === 'entrada' ? 'Entrada' : 'Saida', r.description || '', r.category?.name || '', r.paymentMethod, STATUS_LABELS[r.status] || r.status, r.amount.toFixed(2), r.currency])
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`; link.click()
    URL.revokeObjectURL(url)
  }

  const totalsByCurrency: Record<string, { entradas: number; saidas: number; count: number }> = {}
  for (const r of records) {
    const cur = r.currency || 'BRL'
    if (!totalsByCurrency[cur]) totalsByCurrency[cur] = { entradas: 0, saidas: 0, count: 0 }
    totalsByCurrency[cur].count++
    if (r.type === 'entrada') totalsByCurrency[cur].entradas += r.amount
    else totalsByCurrency[cur].saidas += r.amount
  }

  const byCatCurrency: Record<string, Record<string, { entradas: number; saidas: number }>> = {}
  for (const r of records) {
    const cur = r.currency || 'BRL'; const catName = r.category?.name || 'Sem Categoria'
    if (!byCatCurrency[cur]) byCatCurrency[cur] = {}
    if (!byCatCurrency[cur][catName]) byCatCurrency[cur][catName] = { entradas: 0, saidas: 0 }
    if (r.type === 'entrada') byCatCurrency[cur][catName].entradas += r.amount
    else byCatCurrency[cur][catName].saidas += r.amount
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-display text-text-primary">Relatorios</h1>
          <p className="text-text-muted text-body mt-1">Analise financeira detalhada</p>
        </div>
        <button onClick={exportCSV} className="btn-outline self-start sm:self-auto"><Download size={16} /> Exportar CSV</button>
      </div>

      <div className="card-surface p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="input-warm" />
          <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="input-warm" />
          <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="select-warm"><option value="">Todos os tipos</option><option value="entrada">Entrada</option><option value="saida">Saida</option></select>
          <select value={filters.categoryId} onChange={e => setFilters({ ...filters, categoryId: e.target.value })} className="select-warm"><option value="">Todas as categorias</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="select-warm"><option value="">Todos os status</option><option value="previsto">Previsto</option><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="recebido">Recebido</option><option value="cancelado">Cancelado</option></select>
        </div>
      </div>

      {CURRENCIES.filter(cur => totalsByCurrency[cur]).map(cur => {
        const t = totalsByCurrency[cur]
        return (
          <div key={cur}>
            <h2 className="text-subheading font-display text-text-primary mb-3 flex items-center gap-2">
              <span className="text-lg">{CURRENCY_FLAGS[cur]}</span> {cur}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-surface p-6">
                <p className="text-label font-display text-text-muted uppercase tracking-wider">Total Entradas</p>
                <p className="metric-display text-accent mt-2 tabular-nums">{formatCurrency(t.entradas, cur)}</p>
                <p className="text-small font-display text-text-muted mt-1">{records.filter(r => r.type === 'entrada' && (r.currency || 'BRL') === cur).length} registros</p>
              </div>
              <div className="card-surface p-6">
                <p className="text-label font-display text-text-muted uppercase tracking-wider">Total Saidas</p>
                <p className="metric-display text-text-secondary mt-2 tabular-nums">{formatCurrency(t.saidas, cur)}</p>
                <p className="text-small font-display text-text-muted mt-1">{records.filter(r => r.type === 'saida' && (r.currency || 'BRL') === cur).length} registros</p>
              </div>
              <div className="card-surface p-6">
                <p className="text-label font-display text-text-muted uppercase tracking-wider">Resultado</p>
                <p className={`metric-display mt-2 tabular-nums ${t.entradas - t.saidas >= 0 ? 'text-status-success' : 'text-status-error'}`}>{formatCurrency(t.entradas - t.saidas, cur)}</p>
                <p className="text-small font-display text-text-muted mt-1">{t.count} registros total</p>
              </div>
            </div>
          </div>
        )
      })}

      {CURRENCIES.filter(cur => byCatCurrency[cur]).map(cur => (
        <div key={cur} className="card-surface overflow-hidden">
          <div className="p-6 border-b border-border flex items-center gap-2">
            <FileBarChart size={18} className="text-accent" />
            <h2 className="text-subheading font-display text-text-primary">Resumo por Categoria - {CURRENCY_FLAGS[cur]} {cur}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="table-warm">
              <thead><tr><th>Categoria</th><th className="text-right">Entradas</th><th className="text-right">Saidas</th><th className="text-right">Saldo</th></tr></thead>
              <tbody>
                {Object.entries(byCatCurrency[cur]).map(([catName, cat], i) => (
                  <tr key={i}>
                    <td className="text-text-primary font-display font-medium">{catName}</td>
                    <td className="text-right text-accent font-mono tabular-nums">{formatCurrency(cat.entradas, cur)}</td>
                    <td className="text-right text-text-secondary font-mono tabular-nums">{formatCurrency(cat.saidas, cur)}</td>
                    <td className="text-right font-mono font-medium tabular-nums"><span className={cat.entradas - cat.saidas >= 0 ? 'text-status-success' : 'text-status-error'}>{formatCurrency(cat.entradas - cat.saidas, cur)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="card-surface overflow-hidden">
        <div className="p-6 border-b border-border"><h2 className="text-subheading font-display text-text-primary">Registros Detalhados</h2></div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto" /></div>
          ) : (
            <table className="table-warm">
              <thead><tr><th>Data</th><th>Tipo</th><th>Descricao</th><th>Categoria</th><th>Status</th><th className="text-right">Valor</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td className="text-text-muted font-mono tabular-nums">{formatDate(r.transactionDate)}</td>
                    <td>{r.type === 'entrada' ? <span className="text-accent font-display">Entrada</span> : <span className="text-text-secondary font-display">Saida</span>}</td>
                    <td className="text-text-primary font-display">{r.description || '-'}</td>
                    <td className="text-text-muted font-display">{r.category?.name || '-'}</td>
                    <td className="text-text-muted font-display">{STATUS_LABELS[r.status] || r.status}</td>
                    <td className="text-right font-mono font-medium tabular-nums"><span className={r.type === 'entrada' ? 'text-accent' : 'text-text-secondary'}>{formatCurrency(r.amount, r.currency)}</span></td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-text-muted font-display">Nenhum registro encontrado</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
