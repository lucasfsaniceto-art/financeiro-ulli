import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency: string = 'BRL'): string {
  const locales: Record<string, string> = {
    BRL: 'pt-BR',
    USD: 'en-US',
    CLP: 'es-CL',
  }
  return new Intl.NumberFormat(locales[currency] || 'pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'CLP' ? 0 : 2,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(value)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function calculateInstallmentValue(
  total: number,
  installments: number,
  interestRate: number
): number {
  if (interestRate === 0) return total / installments
  const monthlyRate = interestRate / 100
  return (total * monthlyRate * Math.pow(1 + monthlyRate, installments)) /
    (Math.pow(1 + monthlyRate, installments) - 1)
}

export const STATUS_LABELS: Record<string, string> = {
  previsto: 'Previsto',
  pendente: 'Pendente',
  pago: 'Pago',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
  estornado: 'Estornado',
}

export const STATUS_COLORS: Record<string, string> = {
  previsto: 'badge-accent',
  pendente: 'badge-warning',
  pago: 'badge-success',
  recebido: 'badge-success',
  cancelado: 'badge-error',
  estornado: 'badge-neutral',
}

export const PAYMENT_METHODS = [
  'Pix',
  'Cartao de Credito',
  'Wise',
  'Especie',
  'Transferencia Bancaria',
]

export const CURRENCIES = ['BRL', 'CLP', 'USD']
