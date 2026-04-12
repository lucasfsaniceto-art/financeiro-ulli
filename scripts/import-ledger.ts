/**
 * Import historical DRE ledger data into financial_records.
 *
 * Usage:
 *   npx tsx scripts/import-ledger.ts --dry-run
 *   npx tsx scripts/import-ledger.ts --commit
 *
 * Expects: scripts/ledger-data.csv (exported from the DRE Ulli spreadsheet)
 * CSV columns (;-separated, BR format):
 *   Data ; Descrição ; Categoria ; Forma de Pagamento ; Valor ; Observações ; Tipo
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const IMPORT_MARKER = '[import:dre-2025-2026]'
const CSV_PATH = path.resolve(__dirname, 'ledger-data.csv')
const DATE_RANGE = { start: '2025-09-01', end: '2026-04-30' }

// ---------------------------------------------------------------------------
// Env loader (reads .env.local or .env from project root)
// ---------------------------------------------------------------------------

function loadEnv() {
  const root = path.resolve(__dirname, '..')
  const candidates = ['.env.local', '.env']
  for (const name of candidates) {
    const p = path.join(root, name)
    if (!fs.existsSync(p)) continue
    const content = fs.readFileSync(p, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq)
      let val = trimmed.slice(eq + 1)
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
    return
  }
  throw new Error('No .env.local or .env found in project root')
}

// ---------------------------------------------------------------------------
// CSV parser (handles ; and , delimiters, quoted fields)
// ---------------------------------------------------------------------------

interface RawRow {
  data: string
  descricao: string
  categoria: string
  formaPagamento: string
  valor: string
  observacoes: string
  tipo: string
}

function parseCSV(content: string): RawRow[] {
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''))

  // Detect delimiter from header
  const header = lines[0] || ''
  const delimiter = header.includes(';') ? ';' : ','

  const rows: RawRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = splitCSVLine(line, delimiter)
    if (cols.length < 5) continue // skip malformed

    rows.push({
      data: (cols[0] || '').trim(),
      descricao: (cols[1] || '').trim(),
      categoria: (cols[2] || '').trim(),
      formaPagamento: (cols[3] || '').trim(),
      valor: (cols[4] || '').trim(),
      observacoes: (cols[5] || '').trim(),
      tipo: (cols[6] || '').trim(),
    })
  }
  return rows
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

interface NormalizedRecord {
  type: 'entrada' | 'saida'
  payment_method: string
  amount: number
  currency: string
  category_name: string
  category_type: 'entrada' | 'saida'
  transaction_date: string // YYYY-MM-DD
  status: string
  description: string
  notes: string
}

interface Correction {
  line: number
  field: string
  original: string
  corrected: string
  reason: string
}

interface Warning {
  line: number
  message: string
}

// --- Date normalization ---

function normalizeDate(raw: string, lineNum: number, corrections: Correction[]): string | null {
  // Expected: DD/MM/YYYY (with possible typos in year)
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{3,6})$/.exec(raw)
  if (!m) return null

  let day = parseInt(m[1], 10)
  let month = parseInt(m[2], 10)
  let yearStr = m[3]
  let year = parseInt(yearStr, 10)

  const originalDate = raw

  // Fix year typos — dataset range is 2025-2026
  if (yearStr.length !== 4 || year < 2000 || year > 2099) {
    let fixedYear: number | null = null
    if (yearStr.includes('2026')) {
      fixedYear = 2026
    } else if (yearStr.includes('2025')) {
      fixedYear = 2025
    } else if (yearStr.startsWith('202') && yearStr.length > 4) {
      // e.g. 20226 → 202 + last digit = 2026
      fixedYear = parseInt('202' + yearStr[yearStr.length - 1], 10)
    } else {
      const y = yearStr.match(/202\d/)
      if (y) fixedYear = parseInt(y[0], 10)
    }
    // Final fallback: infer from month (dataset is Sep/2025–Apr/2026)
    if (!fixedYear || fixedYear < 2024 || fixedYear > 2027) {
      fixedYear = month >= 5 ? 2025 : 2026
    }
    year = fixedYear
    corrections.push({
      line: lineNum,
      field: 'data',
      original: originalDate,
      corrected: `${pad(day)}/${pad(month)}/${year}`,
      reason: `ano ${yearStr}→${year}`,
    })
  }

  // Hardcoded date corrections (confirmed by user)
  // 05/01/2025 "Pagameto Patente" → 05/01/2026
  if (day === 5 && month === 1 && year === 2025) {
    year = 2026
    corrections.push({
      line: lineNum,
      field: 'data',
      original: originalDate,
      corrected: `05/01/2026`,
      reason: 'ano provável 2026 (cercada de linhas Jan/2026)',
    })
  }

  // 10/10/2026 → 10/01/2026 (outubro é outlier entre linhas de janeiro)
  if (day === 10 && month === 10 && year === 2026) {
    month = 1
    corrections.push({
      line: lineNum,
      field: 'data',
      original: originalDate,
      corrected: `10/01/2026`,
      reason: 'mês provável 01 (cercada de linhas 10/01/2026)',
    })
  }

  // Validate
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return `${year}-${pad(month)}-${pad(day)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

// --- Value normalization ---

function normalizeValue(
  raw: string,
  description: string,
  lineNum: number,
  corrections: Correction[],
  warnings: Warning[],
): number | null {
  // Strip "R$", spaces, then BR format: 1.234,56 → 1234.56
  let cleaned = raw
    .replace(/R\$\s*/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')     // remove thousand separator
    .replace(',', '.')      // decimal separator

  // Remove trailing dash or other non-numeric suffixes
  cleaned = cleaned.replace(/[^0-9.+-]/g, '')

  const value = parseFloat(cleaned)
  if (isNaN(value) || value <= 0) return null

  // Hardcoded correction: Kenzo Nosse Lourenço R$ 182.632,00 → R$ 18.263,20
  if (value > 180000 && value < 183000 && description.toLowerCase().includes('kenzo')) {
    corrections.push({
      line: lineNum,
      field: 'valor',
      original: raw,
      corrected: 'R$ 18.263,20',
      reason: 'valor corrigido conforme decisão do usuário (30% Rosana)',
    })
    return 18263.20
  }

  // Flag outliers
  if (value > 50000) {
    warnings.push({
      line: lineNum,
      message: `Valor alto: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — "${description}"`,
    })
  }

  return value
}

// --- Payment method normalization ---

function normalizePaymentMethod(
  raw: string,
  lineNum: number,
  corrections: Correction[],
): { method: string; extraNote: string | null } {
  const lower = raw.toLowerCase().trim()

  if (!lower) {
    return { method: 'Pix', extraNote: 'forma original: não informada' }
  }

  // Combined methods
  if (lower.includes('pix') && (lower.includes('wise') || lower.includes('pesos wise'))) {
    return { method: 'Pix', extraNote: `forma original combinada: ${raw}` }
  }

  if (lower === 'pix') return { method: 'Pix', extraNote: null }
  if (lower.includes('cartão') || lower.includes('cartao') || lower.includes('crédito') || lower.includes('credito')) {
    return { method: 'Cartao de Credito', extraNote: null }
  }
  if (lower.includes('wise') || lower.includes('pesos wise')) {
    return { method: 'Wise', extraNote: null }
  }
  if (lower.includes('espécie') || lower.includes('especie') || lower.includes('pesos em')) {
    return { method: 'Especie', extraNote: null }
  }
  if (lower.includes('transferência') || lower.includes('transferencia') || lower.includes('ted') || lower.includes('doc')) {
    return { method: 'Transferencia Bancaria', extraNote: null }
  }

  // Unknown — keep as Pix, note original
  return { method: 'Pix', extraNote: `forma original: ${raw}` }
}

// --- Type (Entrada/Saída) normalization ---

function normalizeType(
  categoria: string,
  tipo: string,
  descricao: string,
  observacoes: string,
  lineNum: number,
  warnings: Warning[],
): 'entrada' | 'saida' | null {
  const catLower = categoria.toLowerCase().trim()
  if (catLower === 'entrada') return 'entrada'
  if (catLower === 'saída' || catLower === 'saida') return 'saida'

  // Infer from tipo column
  const tipoLower = tipo.toLowerCase().trim()
  if (tipoLower === 'passeios' || tipoLower === 'traspasos') {
    // Traspasos can be entrada or saida, but if categoria is empty we can't tell
    // Default to entrada for passeios
    if (tipoLower === 'passeios') return 'entrada'
  }
  if (tipoLower === 'operação' || tipoLower === 'operacao' || tipoLower === 'salários' || tipoLower === 'salarios' || tipoLower === 'reembolso') {
    return 'saida'
  }

  warnings.push({
    line: lineNum,
    message: `Tipo indefinido — categoria="${categoria}", tipo="${tipo}", desc="${descricao.slice(0, 40)}"`,
  })
  return null
}

// --- Category mapping ---

const CATEGORY_MAP: Record<string, { name: string; type: 'entrada' | 'saida' }> = {
  'passeios': { name: 'Receita de Vendas', type: 'entrada' },
  'traspasos_entrada': { name: 'Traspasos', type: 'entrada' },
  'traspasos_saida': { name: 'Traspasos - Saida', type: 'saida' },
  'operação': { name: 'Custos Operacionais', type: 'saida' },
  'operacao': { name: 'Custos Operacionais', type: 'saida' },
  'salários': { name: 'Salarios e Beneficios', type: 'saida' },
  'salarios': { name: 'Salarios e Beneficios', type: 'saida' },
  'reembolso': { name: 'Reembolsos', type: 'saida' },
}

function resolveCategory(
  tipo: string,
  recordType: 'entrada' | 'saida',
  descricao: string,
): { name: string; type: 'entrada' | 'saida' } {
  const tipoLower = tipo.toLowerCase().trim()

  // Traspasos depends on record type
  if (tipoLower === 'traspasos') {
    return recordType === 'entrada'
      ? CATEGORY_MAP['traspasos_entrada']
      : CATEGORY_MAP['traspasos_saida']
  }

  // Passeios + saída = devolução/reembolso
  if (tipoLower === 'passeios' && recordType === 'saida') {
    return { name: 'Reembolsos', type: 'saida' }
  }

  const mapped = CATEGORY_MAP[tipoLower]
  if (mapped) return mapped

  // Infer from description
  const descLower = descricao.toLowerCase()
  if (recordType === 'saida') {
    if (descLower.includes('cooler')) return { name: 'Custos Operacionais', type: 'saida' }
    return { name: 'Despesas Administrativas', type: 'saida' }
  }

  return { name: 'Outras Receitas', type: 'entrada' }
}

// ---------------------------------------------------------------------------
// Dedupe key
// ---------------------------------------------------------------------------

function dedupeKey(date: string, type: string, amount: number, description: string): string {
  return `${date}|${type}|${amount.toFixed(2)}|${description.slice(0, 50).toLowerCase().trim()}`
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const mode = process.argv[2]
  if (mode !== '--dry-run' && mode !== '--commit') {
    console.error('Usage: npx tsx scripts/import-ledger.ts [--dry-run | --commit]')
    process.exit(1)
  }
  const isDryRun = mode === '--dry-run'

  // Load env
  loadEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
    process.exit(1)
  }

  const db = createClient(supabaseUrl, supabaseKey)

  // Read CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`)
    console.error('Export the DRE spreadsheet as CSV and save it as scripts/ledger-data.csv')
    process.exit(1)
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
  const rawRows = parseCSV(csvContent)
  console.log(`\n=== IMPORT LEDGER — ${isDryRun ? 'DRY RUN' : 'COMMIT'} ===`)
  console.log(`Linhas no CSV: ${rawRows.length}`)

  // Normalize all rows
  const corrections: Correction[] = []
  const warnings: Warning[] = []
  const normalized: NormalizedRecord[] = []
  let skippedCount = 0

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]
    const lineNum = i + 2 // +2 because header is line 1, rows start at 2

    // Date
    const date = normalizeDate(row.data, lineNum, corrections)
    if (!date) {
      warnings.push({ line: lineNum, message: `Data inválida: "${row.data}" — "${row.descricao.slice(0, 40)}"` })
      skippedCount++
      continue
    }

    // Value
    const amount = normalizeValue(row.valor, row.descricao, lineNum, corrections, warnings)
    if (amount === null) {
      warnings.push({ line: lineNum, message: `Valor inválido: "${row.valor}" — "${row.descricao.slice(0, 40)}"` })
      skippedCount++
      continue
    }

    // Type (entrada/saida)
    const type = normalizeType(row.categoria, row.tipo, row.descricao, row.observacoes, lineNum, warnings)
    if (!type) {
      skippedCount++
      continue
    }

    // Payment method
    const pm = normalizePaymentMethod(row.formaPagamento, lineNum, corrections)

    // Category
    const cat = resolveCategory(row.tipo, type, row.descricao)

    // Build notes
    const noteParts: string[] = []
    if (row.observacoes) noteParts.push(row.observacoes)
    if (pm.extraNote) noteParts.push(pm.extraNote)
    noteParts.push(IMPORT_MARKER)
    const notes = noteParts.join(' | ')

    normalized.push({
      type,
      payment_method: pm.method,
      amount,
      currency: 'BRL',
      category_name: cat.name,
      category_type: cat.type,
      transaction_date: date,
      status: type === 'entrada' ? 'recebido' : 'pago',
      description: row.descricao || '(sem descrição)',
      notes,
    })
  }

  // Print corrections
  if (corrections.length > 0) {
    console.log(`\nCorreções automáticas aplicadas (${corrections.length}):`)
    for (const c of corrections) {
      console.log(`  Linha ${c.line}: ${c.field} "${c.original}" → "${c.corrected}" (${c.reason})`)
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log(`\nAvisos (${warnings.length}):`)
    for (const w of warnings) {
      console.log(`  Linha ${w.line}: ${w.message}`)
    }
  }

  if (skippedCount > 0) {
    console.log(`\nLinhas ignoradas (dados inválidos): ${skippedCount}`)
  }

  // --- Resolve categories ---
  // Collect unique category names needed
  const neededCategories = new Map<string, 'entrada' | 'saida'>()
  for (const rec of normalized) {
    neededCategories.set(rec.category_name, rec.category_type)
  }

  // Fetch existing categories
  const { data: existingCats, error: catFetchErr } = await db
    .from('categories')
    .select('id, name, type')
  if (catFetchErr) {
    console.error('Erro ao buscar categorias:', catFetchErr)
    process.exit(1)
  }

  const catMap = new Map<string, string>() // name → id
  for (const c of existingCats || []) {
    catMap.set(c.name, c.id)
  }

  // Identify categories to create
  const catsToCreate: { name: string; type: string }[] = []
  for (const [name, type] of neededCategories) {
    if (!catMap.has(name)) {
      catsToCreate.push({ name, type })
    }
  }

  if (catsToCreate.length > 0) {
    console.log(`\nCategorias novas a criar (${catsToCreate.length}):`)
    for (const c of catsToCreate) {
      console.log(`  - ${c.name} (${c.type})`)
    }
  }

  // --- Dedupe against existing records ---
  const { data: existingRecords, error: recFetchErr } = await db
    .from('financial_records')
    .select('transaction_date, type, amount, description')
    .gte('transaction_date', DATE_RANGE.start)
    .lte('transaction_date', DATE_RANGE.end)
  if (recFetchErr) {
    console.error('Erro ao buscar registros existentes:', recFetchErr)
    process.exit(1)
  }

  const existingKeys = new Set<string>()
  for (const r of existingRecords || []) {
    existingKeys.add(dedupeKey(r.transaction_date, r.type, parseFloat(r.amount), r.description || ''))
  }

  const toInsert: NormalizedRecord[] = []
  let dupeCount = 0
  for (const rec of normalized) {
    const key = dedupeKey(rec.transaction_date, rec.type, rec.amount, rec.description)
    if (existingKeys.has(key)) {
      dupeCount++
    } else {
      toInsert.push(rec)
    }
  }

  console.log(`\nNormalizadas: ${normalized.length}`)
  console.log(`Duplicatas no banco (puladas): ${dupeCount}`)
  console.log(`A inserir: ${toInsert.length}`)

  // --- Summary by type/category ---
  const summary = new Map<string, { count: number; total: number }>()
  for (const rec of toInsert) {
    const key = `${rec.type === 'entrada' ? 'Entrada' : 'Saída'} / ${rec.category_name}`
    const entry = summary.get(key) || { count: 0, total: 0 }
    entry.count++
    entry.total += rec.amount
    summary.set(key, entry)
  }

  console.log('\nTotais por tipo/categoria:')
  const sortedKeys = [...summary.keys()].sort()
  for (const key of sortedKeys) {
    const { count, total } = summary.get(key)!
    console.log(`  ${key}: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${count} linhas)`)
  }

  // Grand totals
  let totalEntrada = 0
  let totalSaida = 0
  for (const rec of toInsert) {
    if (rec.type === 'entrada') totalEntrada += rec.amount
    else totalSaida += rec.amount
  }
  console.log(`\n  TOTAL Entradas: R$ ${totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  TOTAL Saídas:   R$ ${totalSaida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  SALDO:          R$ ${(totalEntrada - totalSaida).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)

  if (isDryRun) {
    console.log(`\n=== FIM DO DRY-RUN — nenhuma alteração feita ===`)
    console.log(`Rode com --commit para persistir.`)
    return
  }

  // =========================================================================
  // COMMIT MODE
  // =========================================================================

  // 1. Create missing categories
  if (catsToCreate.length > 0) {
    const { data: newCats, error: catInsErr } = await db
      .from('categories')
      .insert(catsToCreate)
      .select('id, name')
    if (catInsErr) {
      console.error('Erro ao criar categorias:', catInsErr)
      process.exit(1)
    }
    for (const c of newCats || []) {
      catMap.set(c.name, c.id)
    }
    console.log(`\nCategorias criadas: ${newCats?.length || 0}`)
  }

  // 2. Build insert payload
  const payload = toInsert.map(rec => ({
    type: rec.type,
    payment_method: rec.payment_method,
    amount: rec.amount,
    currency: rec.currency,
    category_id: catMap.get(rec.category_name) || null,
    transaction_date: rec.transaction_date,
    due_date: null,
    payment_date: rec.transaction_date,
    status: rec.status,
    description: rec.description,
    notes: rec.notes,
    reference: null,
    sale_id: null,
  }))

  // 3. Insert in batches of 100
  const BATCH_SIZE = 100
  let insertedTotal = 0
  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const batch = payload.slice(i, i + BATCH_SIZE)
    const { error: insErr } = await db.from('financial_records').insert(batch)
    if (insErr) {
      console.error(`Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}:`, insErr)
      console.error(`${insertedTotal} registros já inseridos antes do erro.`)
      console.error(`Rollback: DELETE FROM financial_records WHERE notes LIKE '%${IMPORT_MARKER}%'`)
      process.exit(1)
    }
    insertedTotal += batch.length
    console.log(`  Inseridos: ${insertedTotal}/${payload.length}`)
  }

  // 4. Verify
  const { data: verify } = await db
    .from('financial_records')
    .select('type, amount')
    .like('notes', `%${IMPORT_MARKER}%`)

  const verifyEntrada = (verify || []).filter(r => r.type === 'entrada')
  const verifySaida = (verify || []).filter(r => r.type === 'saida')
  const vSumE = verifyEntrada.reduce((s, r) => s + parseFloat(r.amount), 0)
  const vSumS = verifySaida.reduce((s, r) => s + parseFloat(r.amount), 0)

  console.log(`\n=== IMPORT CONCLUÍDO ===`)
  console.log(`Registros inseridos: ${verify?.length || 0}`)
  console.log(`  Entradas: ${verifyEntrada.length} — R$ ${vSumE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`  Saídas:   ${verifySaida.length} — R$ ${vSumS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
  console.log(`\nRollback: DELETE FROM financial_records WHERE notes LIKE '%${IMPORT_MARKER}%'`)
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
