import { Resend } from 'resend'

/**
 * Lazily-instantiated Resend client. Throws a clear error if env vars are
 * missing so that callers can surface a 500 without leaking keys.
 */
let _client: Resend | null = null

export function getResendClient(): Resend {
  if (_client) return _client
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.')
  }
  _client = new Resend(apiKey)
  return _client
}

export function getFromEmail(): string {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured.')
  }
  return from
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
