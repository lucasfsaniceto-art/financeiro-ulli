'use client'

import { useEffect, useState } from 'react'
import { Save, Plus, Pencil, Trash2, UserPlus, Shield, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SystemSetting { id: string; key: string; value: string; description: string | null }
interface PaymentMethodConfig { id: string; name: string; active: boolean; default_rate: number }
interface Category { id: string; name: string; type: string; active: boolean }
interface UserData { id: string; email: string; name: string; role: 'admin' | 'vendedor'; active: boolean; created_at: string }

export default function ConfiguracoesPage() {
  const { isAdmin } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('geral')
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [catForm, setCatForm] = useState({ name: '', type: 'entrada' })
  const [editingCat, setEditingCat] = useState<string | null>(null)
  const [pmForm, setPmForm] = useState({ name: '', defaultRate: '0' })
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'vendedor' as const })
  const [showUserForm, setShowUserForm] = useState(false)

  useEffect(() => { if (!isAdmin) { router.push('/'); return }; loadAll() }, [isAdmin, router])

  async function loadAll() {
    setLoading(true)
    try {
      const [settingsRes, categoriesRes, usersRes] = await Promise.all([fetch('/api/settings'), fetch('/api/categories'), fetch('/api/users')])
      if (settingsRes.ok) { const data = await settingsRes.json(); setSettings(data.settings || []); setPaymentMethods(data.paymentMethods || []) }
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  function showMessage(msg: string) { setMessage(msg); setTimeout(() => setMessage(''), 3000) }
  function updateSetting(key: string, value: string) { setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s)) }

  async function saveSettings() {
    setSaving(true)
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: settings.map(s => ({ key: s.key, value: s.value, description: s.description })) }) })
    if (res.ok) showMessage('Configuracoes salvas!')
    setSaving(false)
  }

  async function handleAddCategory() {
    if (!catForm.name) return
    if (editingCat) { await fetch(`/api/categories/${editingCat}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) }); setEditingCat(null) }
    else { await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) }) }
    setCatForm({ name: '', type: 'entrada' })
    const res = await fetch('/api/categories'); if (res.ok) setCategories(await res.json())
    showMessage('Categoria salva!')
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm('Excluir esta categoria?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    const res = await fetch('/api/categories'); if (res.ok) setCategories(await res.json())
  }

  async function handleAddPaymentMethod() {
    if (!pmForm.name) return
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethod: { name: pmForm.name, active: true, defaultRate: parseFloat(pmForm.defaultRate) } }) })
    setPmForm({ name: '', defaultRate: '0' })
    const res = await fetch('/api/settings'); if (res.ok) { const data = await res.json(); setPaymentMethods(data.paymentMethods || []) }
    showMessage('Metodo adicionado!')
  }

  async function togglePaymentMethod(pm: PaymentMethodConfig) {
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentMethod: { id: pm.id, name: pm.name, active: !pm.active, defaultRate: pm.default_rate } }) })
    const res = await fetch('/api/settings'); if (res.ok) { const data = await res.json(); setPaymentMethods(data.paymentMethods || []) }
  }

  async function handleAddUser() {
    if (!userForm.name || !userForm.email || !userForm.password) return
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) })
    if (res.ok) { setUserForm({ name: '', email: '', password: '', role: 'vendedor' }); setShowUserForm(false); const usersRes = await fetch('/api/users'); if (usersRes.ok) setUsers(await usersRes.json()); showMessage('Usuario criado!') }
    else { const data = await res.json(); showMessage(data.error || 'Erro ao criar usuario') }
  }

  async function toggleUserActive(user: UserData) { await fetch(`/api/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !user.active }) }); const res = await fetch('/api/users'); if (res.ok) setUsers(await res.json()) }
  async function changeUserRole(user: UserData, role: string) { await fetch(`/api/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) }); const res = await fetch('/api/users'); if (res.ok) setUsers(await res.json()) }

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" /></div>

  const tabs = [{ id: 'geral', label: 'Geral' }, { id: 'categorias', label: 'Categorias' }, { id: 'pagamentos', label: 'Metodos de Pagamento' }, { id: 'usuarios', label: 'Usuarios' }]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-heading font-display text-text-primary">Configuracoes</h1>
        <p className="text-text-muted text-body mt-1">Gerencie o sistema</p>
      </div>

      {message && <div className="bg-status-success/[0.08] border border-status-success/15 rounded-input p-3.5 text-sm text-status-success font-display animate-slide-up">{message}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-hover p-1 rounded-card overflow-x-auto scrollbar-thin">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn(
            'px-3 py-2 md:px-4 md:py-2.5 text-small md:text-label font-display rounded-button transition-all flex-1 whitespace-nowrap min-w-fit',
            activeTab === tab.id ? 'bg-surface-card text-text-primary font-medium shadow-card border border-border' : 'text-text-muted hover:text-text-primary'
          )}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'geral' && (
        <div className="card-surface p-6 space-y-6">
          <h2 className="text-subheading font-display text-text-primary">Configuracoes Gerais</h2>
          {settings.map(s => (
            <div key={s.key} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-start md:items-center">
              <div><p className="text-sm font-display font-medium text-text-secondary">{s.description || s.key}</p><p className="text-small font-display text-text-muted mt-0.5">{s.key}</p></div>
              <input type="text" value={s.value} onChange={e => updateSetting(s.key, e.target.value)} className="input-warm md:col-span-2" />
            </div>
          ))}
          <div className="flex justify-end"><button onClick={saveSettings} disabled={saving} className="btn-accent disabled:opacity-50"><Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}</button></div>
        </div>
      )}

      {activeTab === 'categorias' && (
        <div className="card-surface p-6 space-y-5">
          <h2 className="text-subheading font-display text-text-primary">Categorias</h2>
          <div className="flex gap-3">
            <input type="text" placeholder="Nome da categoria" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className="input-warm flex-1" />
            <select value={catForm.type} onChange={e => setCatForm({ ...catForm, type: e.target.value })} className="select-warm w-40"><option value="entrada">Entrada</option><option value="saida">Saida</option></select>
            <button onClick={handleAddCategory} className="btn-outline"><Plus size={16} /> {editingCat ? 'Salvar' : 'Adicionar'}</button>
            {editingCat && <button onClick={() => { setEditingCat(null); setCatForm({ name: '', type: 'entrada' }) }} className="btn-ghost">Cancelar</button>}
          </div>
          <div className="space-y-1">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between py-2.5 px-3 hover:bg-surface-hover rounded-button transition-colors">
                <div className="flex items-center gap-3">
                  <span className={cn('badge', cat.type === 'entrada' ? 'bg-accent-subtle text-accent' : 'bg-status-error/[0.12] text-status-error')}>
                    {cat.type === 'entrada' ? 'Entrada' : 'Saida'}
                  </span>
                  <span className="text-sm font-display text-text-primary">{cat.name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingCat(cat.id); setCatForm({ name: cat.name, type: cat.type }) }} className="text-text-muted hover:text-accent transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-text-muted hover:text-status-error transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pagamentos' && (
        <div className="card-surface p-6 space-y-5">
          <h2 className="text-subheading font-display text-text-primary">Metodos de Pagamento</h2>
          <div className="flex gap-3">
            <input type="text" placeholder="Nome do metodo" value={pmForm.name} onChange={e => setPmForm({ ...pmForm, name: e.target.value })} className="input-warm flex-1" />
            <input type="number" step="0.01" placeholder="Taxa (%)" value={pmForm.defaultRate} onChange={e => setPmForm({ ...pmForm, defaultRate: e.target.value })} className="input-warm w-32 font-mono" />
            <button onClick={handleAddPaymentMethod} className="btn-outline"><Plus size={16} /> Adicionar</button>
          </div>
          <div className="space-y-1">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="flex items-center justify-between py-3 px-3 hover:bg-surface-hover rounded-button transition-colors">
                <div><span className="text-sm font-display text-text-primary font-medium">{pm.name}</span><span className="text-small font-display text-text-muted ml-2">Taxa: {pm.default_rate}%</span></div>
                <button onClick={() => togglePaymentMethod(pm)} className={cn('badge', pm.active ? 'bg-status-success/[0.12] text-status-success' : 'bg-surface-hover text-text-muted')}>{pm.active ? 'Ativo' : 'Inativo'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="card-surface p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-subheading font-display text-text-primary">Usuarios</h2>
            <button onClick={() => setShowUserForm(!showUserForm)} className="btn-accent"><UserPlus size={16} /> Novo Usuario</button>
          </div>
          {showUserForm && (
            <div className="bg-surface-hover rounded-card p-4 space-y-3 animate-slide-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Nome" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="input-warm" />
                <input type="email" placeholder="Email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="input-warm" />
                <input type="password" placeholder="Senha" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="input-warm" />
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'vendedor' })} className="select-warm"><option value="vendedor">Vendedor</option><option value="admin">Administrador</option></select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowUserForm(false)} className="btn-ghost">Cancelar</button>
                <button onClick={handleAddUser} className="btn-outline">Criar Usuario</button>
              </div>
            </div>
          )}
          <div className="space-y-1">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-3 px-3 hover:bg-surface-hover rounded-button transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', u.role === 'admin' ? 'bg-accent-subtle' : 'bg-status-success/[0.12]')}>
                    {u.role === 'admin' ? <Shield size={14} className="text-accent" /> : <ShoppingCart size={14} className="text-status-success" />}
                  </div>
                  <div>
                    <p className="text-sm font-display font-medium text-text-primary">{u.name}</p>
                    <p className="text-small font-display text-text-muted">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select value={u.role} onChange={e => changeUserRole(u, e.target.value)} className="select-warm text-small !py-1 !px-2 !rounded-button"><option value="admin">Admin</option><option value="vendedor">Vendedor</option></select>
                  <button onClick={() => toggleUserActive(u)} className={cn('badge', u.active ? 'bg-status-success/[0.12] text-status-success' : 'bg-status-error/[0.12] text-status-error')}>{u.active ? 'Ativo' : 'Inativo'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
