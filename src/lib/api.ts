// Helper para fazer requests autenticadas
export function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('caixa-ulli-token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function apiFetch(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  })
}

// Mapeia campos snake_case do Supabase para camelCase do frontend
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFinancialRecord(r: any) {
  return {
    id: r.id,
    type: r.type,
    paymentMethod: r.payment_method,
    amount: Number(r.amount),
    currency: r.currency,
    categoryId: r.category_id,
    transactionDate: r.transaction_date,
    dueDate: r.due_date,
    paymentDate: r.payment_date,
    status: r.status,
    description: r.description,
    notes: r.notes,
    reference: r.reference,
    saleId: r.sale_id,
    installmentNumber: r.installment_number,
    totalInstallments: r.total_installments,
    category: r.category ? { name: r.category.name } : null,
    sale: r.sale ? { client: r.sale.client } : null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapSale(s: any) {
  return {
    id: s.id,
    client: s.client,
    passengers: s.passengers,
    package: s.package,
    totalValue: Number(s.total_value),
    currency: s.currency,
    saleDate: s.sale_date,
    tourDate: s.tour_date,
    reservationPayment: Number(s.reservation_payment),
    remainingValue: Number(s.remaining_value),
    paymentMethod: s.payment_method,
    installments: s.installments,
    interestRate: Number(s.interest_rate),
    status: s.status,
    notes: s.notes,
    sellerId: s.seller_id,
    sellerName: s.seller?.name || null,
    costs: (s.costs || []).map((c: { id: string; description: string; amount: number }) => ({
      id: c.id,
      description: c.description,
      amount: Number(c.amount),
    })),
    financialRecords: (s.financial_records || []).map((r: { amount: number; status: string; type: string }) => ({
      amount: Number(r.amount),
      status: r.status,
      type: r.type,
    })),
  }
}
