export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'

export async function POST() {
  try {
    const db = createServerClient()

    // Seed categories
    const categories = [
      { name: 'Receita de Vendas', type: 'entrada' },
      { name: 'Receita de Servicos', type: 'entrada' },
      { name: 'Outras Receitas', type: 'entrada' },
      { name: 'Custos Operacionais', type: 'saida' },
      { name: 'Despesas Administrativas', type: 'saida' },
      { name: 'Marketing e Publicidade', type: 'saida' },
      { name: 'Salarios e Beneficios', type: 'saida' },
      { name: 'Impostos e Taxas', type: 'saida' },
      { name: 'Aluguel e Infraestrutura', type: 'saida' },
      { name: 'Viagens e Deslocamentos', type: 'saida' },
      { name: 'Fornecedores', type: 'saida' },
    ]

    for (const cat of categories) {
      const { data: existing } = await db
        .from('categories')
        .select('id')
        .eq('name', cat.name)
        .single()
      if (!existing) {
        await db.from('categories').insert(cat)
      }
    }

    // Seed payment methods
    const paymentMethods = [
      { name: 'Pix', default_rate: 0 },
      { name: 'Cartao de Credito', default_rate: 3.5 },
      { name: 'Wise', default_rate: 1.5 },
      { name: 'Especie', default_rate: 0 },
      { name: 'Transferencia Bancaria', default_rate: 0 },
    ]

    for (const pm of paymentMethods) {
      const { data: existing } = await db
        .from('payment_method_config')
        .select('id')
        .eq('name', pm.name)
        .single()
      if (!existing) {
        await db.from('payment_method_config').insert(pm)
      }
    }

    // Seed system settings
    const settings = [
      { key: 'currency', value: 'BRL', description: 'Moeda padrao do sistema' },
      { key: 'breakeven', value: '230000', description: 'Meta de break-even mensal' },
      { key: 'lowBalanceAlert', value: '5000', description: 'Alerta de saldo baixo' },
    ]

    for (const s of settings) {
      await db.from('system_settings').upsert(s, { onConflict: 'key' })
    }

    // Seed admin user
    const { data: adminExists } = await db
      .from('users')
      .select('id')
      .eq('email', 'admin@caixaulli.com')
      .single()

    if (!adminExists) {
      await db.from('users').insert({
        email: 'admin@caixaulli.com',
        name: 'Administrador',
        password_hash: hashPassword('admin123'),
        role: 'admin',
      })
    }

    return NextResponse.json({ success: true, message: 'Dados iniciais criados com sucesso' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao popular dados iniciais' }, { status: 500 })
  }
}
