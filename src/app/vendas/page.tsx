'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Eye, X, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate, PAYMENT_METHODS, CURRENCIES, cn } from '@/lib/utils'
import { apiFetch, mapSale } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface SaleCost {
  id: string
  description: string
  amount: number
}

interface Sale {
  id: string
  client: string
  passengers: number
  package: string
  totalValue: number
  currency: string
  saleDate: string
  tourDate: string
  reservationPayment: number
  remainingValue: number
  paymentMethod: string
  installments: number
  interestRate: number
  status: string
  notes: string | null
  sellerName: string | null
  costs: SaleCost[]
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
      if (res.ok) {
        const raw = await res.json()
        setSales(raw.map(mapSale))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await apiFetch('/api/sales', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowForm(false)
        setForm({ client: '', passengers: '1', package: '', totalValue: '', currency: 'BRL', saleDate: new Date().toISOString().split('T')[0], tourDate: '', reservationPayment: '0', paymentMethod: 'Pix', installments: '1', interestRate: '0', notes: '' })
        loadSales()
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta venda e todas as movimentacoes relacionadas?')) return
    await fetch(`/api/sales/${id}`, { method: 'DELETE' })
    loadSales()
  }

  async function handleAddCost(saleId: string) {
    if (!costForm.description || !costForm.amount) return
    try {
      await fetch(`/api/sales/${saleId}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costForm),
      })
      setCostForm({ description: '', amount: '' })
      loadSales()
      const res = await fetch(`/api/sales/${saleId}`)
      if (res.ok) {
        const raw = await res.json()
        setSelectedSale(mapSale(raw))
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/sales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    loadSales()
  }

  function getProfit(sale: Sale) {
    const totalCosts = sale.costs.reduce((sum, c) => sum + c.amount, 0)
    return sale.totalValue - totalCosts
  }

  const remaining = parseFloat(form.totalValue || '0') - parseFloat(form.reservationPayment || '0')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isAdmin ? 'Vendas' : 'Minhas Vendas'}</h1>
          <p className="text-gray-500">Gestao de vendas e pacotes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-[#E61C5D] text-white rounded-lg text-sm hover:bg-[#C2185B]">
          <Plus size={16} /> Nova Venda
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Nova Venda</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input type="text" required value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passageiros</label>
                <input type="number" min="1" required value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pacote</label>
                <input type="text" required value={form.package} onChange={(e) => setForm({ ...form, package: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nome do pacote/roteiro" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total</label>
                <input type="number" step="0.01" required value={form.totalValue} onChange={(e) => setForm({ ...form, totalValue: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Venda</label>
                <input type="date" required value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data do Tour</label>
                <input type="date" required value={form.tourDate} onChange={(e) => setForm({ ...form, tourDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sinal (Reserva)</label>
                <input type="number" step="0.01" value={form.reservationPayment} onChange={(e) => setForm({ ...form, reservationPayment: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de Pagamento</label>
                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parcelas</label>
                <input type="number" min="1" max="24" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Juros (%)</label>
                <input type="number" step="0.01" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {remaining > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                Valor restante: <strong>{formatCurrency(remaining, form.currency)}</strong>
                {parseInt(form.installments) > 1 && (
                  <span> em {form.installments}x de <strong>{formatCurrency(remaining / parseInt(form.installments), form.currency)}</strong></span>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-[#E61C5D] text-white rounded-lg text-sm hover:bg-[#C2185B]">Salvar Venda</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFC233] mx-auto" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-500">Cliente</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Pacote</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Data Tour</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Pax</th>
                {isAdmin && <th className="text-left p-4 text-sm font-medium text-gray-500">Vendedor</th>}
                <th className="text-right p-4 text-sm font-medium text-gray-500">Valor</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">Lucro</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-center p-4 text-sm font-medium text-gray-500">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const profit = getProfit(s)
                return (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-800 font-medium">{s.client}</td>
                    <td className="p-4 text-sm text-gray-600">{s.package}</td>
                    <td className="p-4 text-sm text-gray-600">{formatDate(s.tourDate)}</td>
                    <td className="p-4 text-sm text-gray-600">{s.passengers}</td>
                    {isAdmin && <td className="p-4 text-sm text-gray-600">{s.sellerName || '-'}</td>}
                    <td className="p-4 text-sm text-right font-medium">{formatCurrency(s.totalValue, s.currency)}</td>
                    <td className="p-4 text-sm text-right font-medium">
                      <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(profit, s.currency)}</span>
                    </td>
                    <td className="p-4">
                      <select value={s.status} onChange={(e) => handleStatusChange(s.id, e.target.value)} className={cn('px-2 py-1 rounded text-xs font-medium border-0',
                        s.status === 'ativo' ? 'bg-green-100 text-green-700' :
                        s.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      )}>
                        <option value="ativo">Ativo</option>
                        <option value="concluido">Concluido</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setSelectedSale(s)} className="text-gray-400 hover:text-blue-600"><Eye size={16} /></button>
                        <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {sales.length === 0 && (
                <tr><td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-gray-400">Nenhuma venda encontrada</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Detalhes da Venda</h2>
              <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Cliente</p><p className="font-medium">{selectedSale.client}</p></div>
                <div><p className="text-sm text-gray-500">Pacote</p><p className="font-medium">{selectedSale.package}</p></div>
                <div><p className="text-sm text-gray-500">Valor Total</p><p className="font-medium">{formatCurrency(selectedSale.totalValue, selectedSale.currency)}</p></div>
                <div><p className="text-sm text-gray-500">Lucro</p><p className={cn('font-medium', getProfit(selectedSale) >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(getProfit(selectedSale), selectedSale.currency)}</p></div>
                <div><p className="text-sm text-gray-500">Sinal</p><p className="font-medium">{formatCurrency(selectedSale.reservationPayment, selectedSale.currency)}</p></div>
                <div><p className="text-sm text-gray-500">Pagamento</p><p className="font-medium">{selectedSale.paymentMethod} - {selectedSale.installments}x</p></div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold flex items-center gap-2 mb-3"><DollarSign size={16} /> Custos da Venda</h3>
                {selectedSale.costs.length > 0 ? (
                  <ul className="space-y-2">
                    {selectedSale.costs.map((c) => (
                      <li key={c.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                        <span>{c.description}</span>
                        <span className="font-medium text-red-600">{formatCurrency(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">Nenhum custo registrado</p>
                )}

                <div className="mt-3 flex gap-2">
                  <input type="text" placeholder="Descricao do custo" value={costForm.description} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" step="0.01" placeholder="Valor" value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} className="w-32 border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={() => handleAddCost(selectedSale.id)} className="px-3 py-2 bg-[#0E1A2B] text-white rounded-lg text-sm hover:bg-[#1a2d47]">Adicionar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
