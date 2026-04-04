'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, cn } from '@/lib/utils'
import { mapFinancialRecord } from '@/lib/api'
import RecordFormModal from '@/components/RecordFormModal'
import { EmptyDesert } from '@/components/DesertSVG'

interface Category { id: string; name: string; type: string }

interface FinancialRecord {
  id: string; type: string; paymentMethod: string; amount: number; currency: string
  transactionDate: string; dueDate: string | null; paymentDate: string | null
  status: string; description: string | null; notes: string | null; reference: string | null
  categoryId: string | null; category: { name: string } | null; sale: { client: string } | null
}

export default function MovimentacoesPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<Record<string, string> | null>(null)
  const [filters, setFilters] = useState({ type: '', status: '', categoryId: '', startDate: '', endDate: '' })
  const [showFilters, setShowFilters] = useState(false)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.type) params.set('type', filters.type)
      if (filters.status) params.set('status', filters.status)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      const res = await fetch(`/api/financial-records?${params}`)
      if (res.ok) { const raw = await res.json(); setRecords(raw.map(mapFinancialRecord)) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [filters])

  useEffect(() => {
    loadRecords()
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(console.error)
  }, [loadRecords])

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta movimentacao?')) return
    await fetch(`/api/financial-records/${id}`, { method: 'DELETE' })
    loadRecords()
  }

  function handleEdit(record: FinancialRecord) {
    setEditRecord({
      id: record.id, type: record.type, paymentMethod: record.paymentMethod, amount: String(record.amount),
      currency: record.currency, categoryId: record.categoryId || '', transactionDate: record.transactionDate,
      dueDate: record.dueDate || '', paymentDate: record.paymentDate || '', status: record.status,
      description: record.description || '', notes: record.notes || '', reference: record.reference || '',
    })
    setModalOpen(true)
  }

  // Group by date for timeline feed
  const grouped: Record<string, FinancialRecord[]> = {}
  for (const r of records) {
    const dateKey = r.transactionDate?.split('T')[0] || 'unknown'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(r)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-heading font-display text-text-primary">Movimentacoes</h1>
          <p className="text-text-muted text-body mt-1">Todas as entradas e saidas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-outline">
            <Filter size={16} /> <span className="hidden sm:inline">Filtros</span>
          </button>
          <button onClick={() => { setEditRecord(null); setModalOpen(true) }} className="btn-accent">
            <Plus size={16} /> <span className="hidden sm:inline">Nova</span> <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card-surface p-4 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="select-warm">
              <option value="">Todos os tipos</option><option value="entrada">Entrada</option><option value="saida">Saida</option>
            </select>
            <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="select-warm">
              <option value="">Todos os status</option><option value="previsto">Previsto</option><option value="pendente">Pendente</option>
              <option value="pago">Pago</option><option value="recebido">Recebido</option><option value="cancelado">Cancelado</option><option value="estornado">Estornado</option>
            </select>
            <select value={filters.categoryId} onChange={e => setFilters({ ...filters, categoryId: e.target.value })} className="select-warm">
              <option value="">Todas as categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="input-warm" />
            <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="input-warm" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="card-surface flex flex-col items-center justify-center py-16 gap-4">
          <EmptyDesert className="w-[200px] h-[120px] text-text-primary" />
          <p className="text-sm font-display text-text-muted">Nenhuma movimentacao encontrada</p>
          <button onClick={() => { setEditRecord(null); setModalOpen(true) }} className="btn-accent text-sm">
            <Plus size={16} /> Nova movimentacao
          </button>
        </div>
      ) : (
        /* Timeline Feed */
        <div className="relative">
          <div className="timeline-line" />
          {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([dateKey, items]) => (
            <div key={dateKey} className="mb-6">
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3 pl-[24px] relative">
                <div className="absolute left-[32px] w-5 h-5 rounded-full bg-surface-page border-2 border-border flex items-center justify-center z-10">
                  <span className="text-[8px] font-mono font-bold text-text-muted">{new Date(dateKey + 'T12:00:00').getDate()}</span>
                </div>
                <span className="ml-8 text-label font-display font-bold text-text-primary">
                  {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>

              {/* Transactions */}
              {items.map(r => (
                <div key={r.id} className="flex items-start gap-2 md:gap-4 pl-1 md:pl-[28px] relative mb-3">
                  <div className="absolute left-[8px] md:left-[34px] top-4 hidden md:block">
                    {r.type === 'entrada' ? <div className="timeline-node-income" /> : <div className="timeline-node-expense" />}
                  </div>
                  <div className="flex-1 md:ml-6 card-surface p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between group gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {r.type === 'entrada' ? (
                          <ArrowUpRight size={14} className="text-accent flex-shrink-0" />
                        ) : (
                          <ArrowDownRight size={14} className="text-text-muted flex-shrink-0" />
                        )}
                        <p className="text-sm font-display font-medium text-text-primary truncate">{r.description || 'Sem descricao'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1.5 ml-[22px]">
                        <span className="text-small font-display text-text-muted">{r.category?.name || '-'}</span>
                        <span className="text-small font-display text-text-muted">{r.paymentMethod}</span>
                        <span className={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status] || r.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-[22px] sm:ml-0">
                      <span className={cn('font-mono font-semibold tabular-nums text-sm', r.type === 'entrada' ? 'text-accent' : 'text-text-secondary')}>
                        {formatCurrency(r.amount, r.currency)}
                      </span>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(r)} className="text-text-muted hover:text-accent transition-colors p-1"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(r.id)} className="text-text-muted hover:text-status-error transition-colors p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <RecordFormModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditRecord(null) }} onSave={loadRecords} record={editRecord} />
    </div>
  )
}
