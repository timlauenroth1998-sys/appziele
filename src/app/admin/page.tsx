'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAuthButton } from '@/components/UserAuthButton'
import { useAuth } from '@/hooks/useAuth'
import { useCoachRole } from '@/hooks/useCoachRole'

interface LookupResult {
  userId: string
  email: string
  role: 'user' | 'coach' | 'admin'
}

export default function AdminPage() {
  const router = useRouter()
  const { user, session, isLoaded: authLoaded } = useAuth()
  const { isAdmin, isLoaded: roleLoaded } = useCoachRole()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [result, setResult] = useState<LookupResult | null>(null)
  const [acting, setActing] = useState(false)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setResult(null)

    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.')
      return
    }
    if (!session) {
      setError('Nicht authentifiziert.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/lookup-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: trimmed }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Nutzer konnte nicht gefunden werden.')
        return
      }
      setResult(body as LookupResult)
    } catch {
      setError('Nutzer-Suche fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(target: LookupResult, grant: boolean) {
    if (!session) return
    setActing(true)
    setError(null)
    setInfo(null)
    try {
      const res = await fetch('/api/admin/set-coach-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: target.userId, isCoach: grant }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Rolle konnte nicht aktualisiert werden.')
        return
      }
      setInfo(
        grant
          ? `${target.email} hat jetzt die Coach-Rolle.`
          : `${target.email} ist kein Coach mehr.`
      )
      setResult({ ...target, role: grant ? 'coach' : 'user' })
    } catch {
      setError('Rolle konnte nicht aktualisiert werden.')
    } finally {
      setActing(false)
    }
  }

  const isLoading = !authLoaded || !roleLoaded

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => router.push('/goals')}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            ← Meine Ziele
          </button>
          <UserAuthButton />
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 space-y-2">
            <div className="text-3xl">🔒</div>
            <h1 className="text-xl font-semibold text-gray-900">Kein Admin-Zugang</h1>
            <p className="text-sm text-gray-500">
              Diese Seite ist nur für Administratoren sichtbar.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/goals')}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Meine Ziele
        </button>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/library')}
            className="text-gray-500 hover:text-gray-700"
          >
            Bibliothek
          </Button>
          <UserAuthButton />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Administration</h1>
          <p className="text-sm text-gray-500">Verwalte Rollen und globale Einstellungen.</p>
        </div>

        {/* Coach-Verwaltung */}
        <Card>
          <CardHeader>
            <CardTitle>Coach-Verwaltung</CardTitle>
            <CardDescription>
              Suche einen Nutzer per E-Mail und vergebe oder entziehe die Coach-Rolle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleLookup} className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="admin-email" className="text-sm">Nutzer-E-Mail</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="nutzer@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Suche…' : 'Suchen'}
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" className="text-sm py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {info && (
              <Alert className="text-sm py-2 border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">{info}</AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="rounded-xl border border-gray-100 bg-white p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{result.email}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        result.role === 'admin'
                          ? 'text-red-700 border-red-200 bg-red-50 text-xs'
                          : result.role === 'coach'
                          ? 'text-indigo-700 border-indigo-200 bg-indigo-50 text-xs'
                          : 'text-gray-600 border-gray-200 bg-gray-50 text-xs'
                      }
                    >
                      {result.role === 'admin'
                        ? 'Administrator'
                        : result.role === 'coach'
                        ? 'Coach'
                        : 'Nutzer'}
                    </Badge>
                    <p className="text-xs text-gray-400 truncate">ID: {result.userId.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {result.role === 'admin' ? (
                    <p className="text-xs text-gray-400 italic">
                      Admin-Rollen können hier nicht geändert werden.
                    </p>
                  ) : result.role === 'coach' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleRoleChange(result, false)}
                      disabled={acting}
                    >
                      {acting ? 'Wird entzogen…' : 'Coach-Rolle entziehen'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => handleRoleChange(result, true)}
                      disabled={acting}
                    >
                      {acting ? 'Wird vergeben…' : 'Coach-Rolle vergeben'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bibliothek-Karte */}
        <Card>
          <CardHeader>
            <CardTitle>Coaching-Bibliothek</CardTitle>
            <CardDescription>
              Verwalte PDFs, die in jede Roadmap-Generierung einfließen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/admin/library')}>
              Zur Bibliothek →
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
