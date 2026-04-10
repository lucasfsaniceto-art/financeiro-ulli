'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { apiFetch, mapFinancialRecord } from '@/lib/api'
import RecordFormModal from '@/components/RecordFormModal'
import { GaugeArc } from '@/components/DesertSVG'

interface FinancialRecord {
  id: string; type: string; paymentMethod: string; amount: number; currency: string
  transactionDate: string; dueDate: string | null; paymentDate: string | null
  status: string; description: string | null; categoryId: string | null
  category: { name: string } | null; sale: { client: string } | null
  installmentNumber: number | null; totalInstallments: number | null
}

export default function ContasReceberPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Record<string, string> | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: 'entrada' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiFetch(`/api/financial-records?${params}`)
      if (res.ok) { const raw = await res.json(); setRecords(raw.map(mapFinancialRecord)) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { loadRecords() }, [loadRecords])

  async function markAsReceived(id: string) {
    await apiFetch(`/api/financial-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'recebido', paymentDate: new Date().toISOString().split('T')[0] }),
    })
    loadRecords()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta conta a receber?')) return
    await apiFetch(`/api/financial-records/${id}`, { method: 'DELETE' })
    loadRecords()
  }

  const totalPending = records.filter(r => r.status === 'previsto' || r.status === 'pendente').reduce((s, r) => s + r.amount, 0)
  const totalReceived = records.filter(r => r.status === 'recebido').reduce((s, r) => s + r.amount, 0)
  const total = totalPending + totalReceived
  const receivedPercent = total > 0 ? (totalReceived / total) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-display text-text-primary">Contas a Receber</h1>
          <p className="text-text-muted text-body mt-1">Receitas e recebimentos</p>
        </div>
        <button onClick={() => { setEditRecord(null); setModalOpen(true) }} className="btn-accent self-start sm:self-auto">
          <Plus size={16} /> Nova Receita
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-surface p-6">
          <p className="text-label font-display text-text-muted uppercase tracking-wider">Total a Receber</p>
          <p className="metric-display text-status-warning mt-2 tabular-nums">{formatCurrency(totalPending)}</p>
        </div>
        <div className="card-surface p-6">
          <p className="text-label font-display text-text-muted uppercase tracking-wider">Total Recebido</p>
          <p className="metric-display text-accent mt-2 tabular-nums">{formatCurrency(totalReceived)}</p>
        </div>
        <div className="card-surface p-5 flex flex-col items-center justify-center">
          <GaugeArc percentage={receivedPercent} />
          <p className="text-small font-display text-text-muted mt-1">{receivedPercent.toFixed(0)}% recebido</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'previsto', 'pendente', 'recebido', 'cancelado'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn(
            'px-4 py-1.5 rounded-pill text-label font-display font-medium transition-all',
            statusFilter === s ? 'bg-accent-subtle text-accent' : 'text-text-muted border border-border hover:text-text-primary'
          )}>
            {s ? STATUS_LABELS[s] : 'Todos'}
          </button>
        ))}
      </div>

      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-warm">
              <thead><tr><th>Vencimento</th><th>Descricao</th><th>Cliente</th><th>Parcela</th><th>Status</th><th className="text-right">Valor</th><th className="text-center">Acoes</th></tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td className="text-text-muted font-mono tabular-nums">{r.dueDate ? formatDate(r.dueDate) : formatDate(r.transactionDate)}</td>
                    <td className="text-text-primary font-display">{r.description || '-'}</td>
                    <td className="text-text-muted font-display">{r.sale?.client || '-'}</td>
                    <td className="text-text-muted font-mono tabular-nums">{r.installmentNumber && r.totalInstallments ? `${r.installmentNumber}/${r.totalInstallments}` : '-'}</td>
                    <td><span className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</span></td>
                    <td className="text-right font-mono font-medium tabular-nums text-accent">{formatCurrency(r.amount, r.currency)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        {(r.status === 'previsto' || r.status === 'pendente') && (
                          <button onClick={() => markAsReceived(r.id)} className="text-text-muted hover:text-status-success transition-colors" title="Marcar como recebido"><CheckCircle size={15} /></button>
                        )}
                        <button onClick={() => {
                          setEditRecord({ id: r.id, type: r.type, paymentMethod: r.paymentMethod, amount: String(r.amount), currency: r.currency, categoryId: r.categoryId || '', transactionDate: r.transactionDate, dueDate: r.dueDate || '', paymentDate: r.paymentDate || '', status: r.status, description: r.description || '', notes: '', reference: '' })
                          setModalOpen(true)
                        }} className="text-text-muted hover:text-accent transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(r.id)} className="text-text-muted hover:text-status-error transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-text-muted font-display">Nenhuma conta a receber encontrada</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditRecord(null) }} onSave={loadRecords} record={editRecord} defaultType="entrada" />
    </div>
  )
}
