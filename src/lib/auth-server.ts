import { NextRequest } from 'next/server'
import { createClient, User } from '@supabase/supabase-js'

/**
 * Get the authenticated user for an API route.
 * Expects an `Authorization: Bearer <access_token>` header (Supabase access token).
 *
 * Returns `null` if the request is not authenticated. Route handlers should
 * respond with 401 in that case.
 */
export async function getUserFromRequest(req: NextRequest): Promise<User | null> {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) return null
  const token = match[1].trim()
  if (!token) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  // Use the anon client to verify the JWT and return the user.
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}
