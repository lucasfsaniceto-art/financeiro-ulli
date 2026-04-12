# Scripts de importacao

## import-ledger.ts

Importa dados historicos da planilha DRE Ulli para a tabela `financial_records` do Supabase.

### Pre-requisitos

- Node.js 18+
- `.env.local` configurado com `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
- Arquivo `scripts/ledger-data.csv` exportado da planilha DRE

### Formato do CSV

O CSV deve ter 7 colunas separadas por `;`:

```
Data;Descricao;Categoria;Forma de Pagamento;Valor;Observacoes;Tipo
23/01/2026;Cliente Exemplo;Entrada;Pix;R$ 1.234,56;Pagamento parcela;Passeios
```

### Como rodar

```bash
# 1. Dry-run (valida e mostra relatorio, nao altera nada)
npx tsx scripts/import-ledger.ts --dry-run

# 2. Commit (insere no banco)
npx tsx scripts/import-ledger.ts --commit
```

### Rollback

Todos os registros importados sao marcados com `[import:dre-2025-2026]` no campo `notes`. Para reverter:

```sql
DELETE FROM financial_records WHERE notes LIKE '%[import:dre-2025-2026]%';
```
