import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { createServerClient } from './supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'caixa-ulli-secret-key-change-in-production'

export interface UserPayload {
  id: string
  email: string
  name: string
  role: 'admin' | 'vendedor'
}

export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload
  } catch {
    return null
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  const cookie = request.cookies.get('token')
  return cookie?.value || null
}

export function getUserFromRequest(request: NextRequest): UserPayload | null {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}

export function requireAuth(request: NextRequest): UserPayload {
  const user = getUserFromRequest(request)
  if (!user) throw new Error('Nao autenticado')
  return user
}

export function requireAdmin(request: NextRequest): UserPayload {
  const user = requireAuth(request)
  if (user.role !== 'admin') throw new Error('Acesso negado')
  return user
}

export async function seedAdminUser() {
  const db = createServerClient()
  const { data: existing } = await db
    .from('users')
    .select('id')
    .eq('email', 'admin@caixaulli.com')
    .single()

  if (!existing) {
    await db.from('users').insert({
      email: 'admin@caixaulli.com',
      name: 'Administrador',
      password_hash: hashPassword('admin123'),
      role: 'admin',
    })
  }
}
