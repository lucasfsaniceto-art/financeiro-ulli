export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const db = createServerClient()
    const { data: settings, error: sErr } = await db.from('system_settings').select('*')
    const { data: paymentMethods, error: pErr } = await db
      .from('payment_method_config')
      .select('*')
      .order('name', { ascending: true })

    if (sErr) throw sErr
    if (pErr) throw pErr

    return NextResponse.json({ settings, paymentMethods })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar configuracoes' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const db = createServerClient()

    if (body.settings) {
      for (const setting of body.settings) {
        await db.from('system_settings').upsert(
          { key: setting.key, value: setting.value, description: setting.description },
          { onConflict: 'key' }
        )
      }
    }

    if (body.paymentMethod) {
      const pm = body.paymentMethod
      if (pm.id) {
        await db.from('payment_method_config').update({
          name: pm.name,
          active: pm.active,
          default_rate: pm.defaultRate || 0,
        }).eq('id', pm.id)
      } else {
        await db.from('payment_method_config').insert({
          name: pm.name,
          active: pm.active ?? true,
          default_rate: pm.defaultRate || 0,
        })
      }
    }

    const { data: settings } = await db.from('system_settings').select('*')
    const { data: paymentMethods } = await db
      .from('payment_method_config')
      .select('*')
      .order('name', { ascending: true })

    return NextResponse.json({ settings, paymentMethods })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao salvar configuracoes' }, { status: 500 })
  }
}
