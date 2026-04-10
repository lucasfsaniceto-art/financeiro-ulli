'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Eye, X, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate, PAYMENT_METHODS, CURRENCIES, cn } from '@/lib/utils'
import { apiFetch, mapSale } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

interface SaleCost { id: string; description: string; amount: number }

interface Sale {
  id: string; client: string; passengers: number; package: string; totalValue: number
  currency: string; saleDate: string; tourDate: string; reservationPayment: number
  remainingValue: number; paymentMethod: string; installments: number; interestRate: number
  status: string; notes: string | null; sellerName: string | null; costs: SaleCost[]
  financialRecords: Array<{ amount: number; status: string; type: string }>
}

export default function VendasPage() {
  const { isAdmin } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [costForm, setCostForm] = useState({ description: '', amount: '' })

  const [form, setForm] = useState({
    client: '', passengers: '1', package: '', totalValue: '', currency: 'BRL',
    saleDate: new Date().toISOString().split('T')[0], tourDate: '', reservationPayment: '0',
    paymentMethod: 'Pix', installments: '1', interestRate: '0', notes: '',
  })

  useEffect(() => { loadSales() }, [])

  async function loadSales() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/sales')
      if (res.ok) { const raw = await res.json(); setSales(raw.map(mapSale)) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await apiFetch('/api/sales', { method: 'POST', body: JSON.stringify(form) })
    if (res.ok) {
      setShowForm(false)
      setForm({ client: '', passengers: '1', package: '', totalValue: '', currency: 'BRL', saleDate: new Date().toISOString().split('T')[0], tourDate: '', reservationPayment: '0', paymentMethod: 'Pix', installments: '1', interestRate: '0', notes: '' })
      loadSales()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta venda e todas as movimentacoes relacionadas?')) return
    await apiFetch(`/api/sales/${id}`, { method: 'DELETE' })
    loadSales()
  }

  async function handleAddCost(saleId: string) {
    if (!costForm.description || !costForm.amount) return
    await apiFetch(`/api/sales/${saleId}/costs`, { method: 'POST', body: JSON.stringify(costForm) })
    setCostForm({ description: '', amount: '' })
    loadSales()
    const res = await apiFetch(`/api/sales/${saleId}`)
    if (res.ok) { const raw = await res.json(); setSelectedSale(mapSale(raw)) }
  }

  async function handleStatusChange(id: string, status: string) {
    await apiFetch(`/api/sales/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
    loadSales()
  }

  function getProfit(sale: Sale) { return sale.totalValue - sale.costs.reduce((s, c) => s + c.amount, 0) }

  const remaining = parseFloat(form.totalValue || '0') - parseFloat(form.reservationPayment || '0')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-display text-text-primary">{isAdmin ? 'Vendas' : 'Minhas Vendas'}</h1>
          <p className="text-text-muted text-body mt-1">Gestao de vendas e pacotes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-accent self-start sm:self-auto">
          <Plus size={16} /> Nova Venda
        </button>
      </div>

      {showForm && (
        <div className="card-surface p-6 animate-slide-up">
          <h2 className="text-subheading font-display text-text-primary mb-5">Nova Venda</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-label text-text-muted mb-2 font-display">Cliente</label><input type="text" required value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} className="input-warm" /></div>
              <div><label className="block text-label text-text-muted mb-2 font-display">Passageiros</label><input type="number" min="1" required value={form.passengers} onChange={e => setForm({ ...form, passengers: e.target.value })} className="input-warm" /></div>
              <div><label className="block text-label text-text-muted mb-2 font-display">Pacote</label><input type="text" required value={form.package} onChange={e => setForm({ ...form, package: e.target.value })} className="input-warm" placeholder="Nome do pacote/roteiro" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-label text-text-muted mb-2 font-display">Valor Total</label><input type="number" step="0.01" required value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} className="input-warm font-mono" /></div>
              <div><label className="block text-label text-text-muted mb-2 font-display">Moeda</label><select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="select-warm">{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="block text-label text-text-muted mb-2 font-display">Data da Venda</label><input type="date" required value={form.saleDate} onChange={e => setForm({ ...form, saleDate: e.target.value })} className="input-warm" /></div>
              <div><label className="block text-label text-text-muted mb-2 font-display">Data do Tour</label><input type="date" required value={form.tourDate} onChange={e => setForm({ ...form, tourDate: e.target.value })} className="input-warm" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-label text-text-muted mb-2 font-display">Sinal (Reserva)</label><input type="number" step="0.01" value={form.reservationPayment} onChange={e => setForm({ ...form, reservationPayment: e.target.value })} className="input-warm font-mono" /></div>
              <div><label className="block text-label text-text-muted mb-2 font-display">Metodo de Pagamento</label><select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })} className="select-warm">{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="block text-label text-text-muted mb-2 font-display">Parcelas</label><input type="number" min="1" max="24" value={form.installments} onChange={e => setForm({ ...form, installments: e.target.value })} className="input-warm" /></div>
              <div><label className="block text-label text-text-muted mb-2 font-display">Taxa de Juros (%)</label><input type="number" step="0.01" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} className="input-warm" /></div>
            </div>
            {remaining > 0 && (
              <div className="bg-status-warning/[0.08] border border-status-warning/15 rounded-input p-3.5 text-sm font-display text-status-warning">
                Valor restante: <strong className="font-mono">{formatCurrency(remaining, form.currency)}</strong>
                {parseInt(form.installments) > 1 && <span> em {form.installments}x de <strong className="font-mono">{formatCurrency(remaining / parseInt(form.installments), form.currency)}</strong></span>}
              </div>
            )}
            <div><label className="block text-label text-text-muted mb-2 font-display">Observacoes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-warm resize-none" rows={2} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
              <button type="submit" className="btn-accent">Salvar Venda</button>
            </div>
          </form>
        </div>
      )}

      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-warm">
              <thead><tr><th>Cliente</th><th>Pacote</th><th>Data Tour</th><th>Pax</th>{isAdmin && <th>Vendedor</th>}<th className="text-right">Valor</th><th className="text-right">Lucro</th><th>Status</th><th className="text-center">Acoes</th></tr></thead>
              <tbody>
                {sales.map(s => {
                  const profit = getProfit(s)
                  return (
                    <tr key={s.id}>
                      <td className="text-text-primary font-display font-medium">{s.client}</td>
                      <td className="text-text-secondary font-display">{s.package}</td>
                      <td className="text-text-muted font-mono tabular-nums">{formatDate(s.tourDate)}</td>
                      <td className="text-text-muted font-mono tabular-nums">{s.passengers}</td>
                      {isAdmin && <td className="text-text-muted font-display">{s.sellerName || '-'}</td>}
                      <td className="text-right font-mono font-medium tabular-nums text-text-primary">{formatCurrency(s.totalValue, s.currency)}</td>
                      <td className="text-right font-mono font-medium tabular-nums"><span className={profit >= 0 ? 'text-status-success' : 'text-status-error'}>{formatCurrency(profit, s.currency)}</span></td>
                      <td>
                        <select value={s.status} onChange={e => handleStatusChange(s.id, e.target.value)} className={cn(
                          'px-2.5 py-1 rounded-pill text-small font-display font-medium border-0 cursor-pointer',
                          s.status === 'ativo' ? 'bg-status-success/[0.12] text-status-success' :
                          s.status === 'cancelado' ? 'bg-status-error/[0.12] text-status-error' :
                          'bg-accent-subtle text-accent'
                        )}>
                          <option value="ativo">Ativo</option><option value="concluido">Concluido</option><option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setSelectedSale(s)} className="text-text-muted hover:text-accent transition-colors"><Eye size={15} /></button>
                          <button onClick={() => handleDelete(s.id)} className="text-text-muted hover:text-status-error transition-colors"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {sales.length === 0 && <tr><td colSpan={isAdmin ? 9 : 8} className="p-12 text-center text-text-muted font-display">Nenhuma venda encontrada</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      <AnimatePresence>
        {selectedSale && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSale(null)} />
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="card-elevated w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto scrollbar-thin relative z-10 border border-border rounded-t-card sm:rounded-card">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-subheading font-display text-text-primary">Detalhes da Venda</h2>
                <button onClick={() => setSelectedSale(null)} className="text-text-muted hover:text-text-primary transition-colors"><X size={20} /></button>
              </div>
              <div className="p-4 md:p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><p className="text-small text-text-muted font-display uppercase tracking-wider">Cliente</p><p className="text-text-primary font-display font-medium mt-1">{selectedSale.client}</p></div>
                  <div><p className="text-small text-text-muted font-display uppercase tracking-wider">Pacote</p><p className="text-text-primary font-display font-medium mt-1">{selectedSale.package}</p></div>
                  <div><p className="text-small text-text-muted font-display uppercase tracking-wider">Valor Total</p><p className="text-text-primary font-mono font-medium mt-1 tabular-nums">{formatCurrency(selectedSale.totalValue, selectedSale.currency)}</p></div>
                  <div><p className="text-small text-text-muted font-display uppercase tracking-wider">Lucro</p><p className={cn('font-mono font-medium mt-1 tabular-nums', getProfit(selectedSale) >= 0 ? 'text-status-success' : 'text-status-error')}>{formatCurrency(getProfit(selectedSale), selectedSale.currency)}</p></div>
                  <div><p className="text-small text-text-muted font-display uppercase tracking-wider">Sinal</p><p className="text-text-primary font-mono font-medium mt-1 tabular-nums">{formatCurrency(selectedSale.reservationPayment, selectedSale.currency)}</p></div>
                  <div><p className="text-small text-text-muted font-display uppercase tracking-wider">Pagamento</p><p className="text-text-primary font-display font-medium mt-1">{selectedSale.paymentMethod} - {selectedSale.installments}x</p></div>
                </div>
                <div className="border-t border-border pt-5">
                  <h3 className="font-display font-semibold text-text-primary flex items-center gap-2 mb-4"><DollarSign size={16} className="text-accent" /> Custos da Venda</h3>
                  {selectedSale.costs.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedSale.costs.map(c => (
                        <li key={c.id} className="flex justify-between text-sm bg-surface-hover p-3 rounded-input">
                          <span className="text-text-secondary font-display">{c.description}</span>
                          <span className="font-mono font-medium text-text-secondary tabular-nums">{formatCurrency(c.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-text-muted font-display">Nenhum custo registrado</p>}
                  <div className="mt-4 flex gap-2">
                    <input type="text" placeholder="Descricao do custo" value={costForm.description} onChange={e => setCostForm({ ...costForm, description: e.target.value })} className="input-warm flex-1" />
                    <input type="number" step="0.01" placeholder="Valor" value={costForm.amount} onChange={e => setCostForm({ ...costForm, amount: e.target.value })} className="input-warm w-32 font-mono" />
                    <button onClick={() => handleAddCost(selectedSale.id)} className="btn-outline">Adicionar</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
