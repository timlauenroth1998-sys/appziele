'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type ViewState = 'loading' | 'form' | 'success' | 'error'

export default function ResetPasswordPage() {
  const [view, setView] = useState<ViewState>('loading')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Supabase processes the recovery token from the URL hash automatically.
    // We wait for onAuthStateChange to confirm we have a recovery session.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('form')
      } else if (event === 'SIGNED_IN') {
        // Might fire before PASSWORD_RECOVERY on some flows — check session
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) setView('form')
        })
      }
    })

    // Also check if a session is already present (page reload case)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setView('form')
      } else {
        // No token found — show error after a short delay
        setTimeout(() => {
          setView((prev) => (prev === 'loading' ? 'error' : prev))
        }, 2000)
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  function validatePassword(pw: string) {
    if (pw.length > 0 && pw.length < 8) {
      setPasswordError('Passwort muss mindestens 8 Zeichen lang sein.')
    } else {
      setPasswordError('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setPasswordError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        return
      }
      setView('success')
    } finally {
      setLoading(false)
    }
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-sm text-gray-500">Wird geladen…</p>
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Link ungültig</CardTitle>
            <CardDescription>
              Dieser Reset-Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/auth'}>
              Zurück zum Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Passwort gesetzt</CardTitle>
            <CardDescription>
              Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt anmelden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = '/goals'}>
              Weiter zu meinen Zielen
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Neues Passwort festlegen</CardTitle>
          <CardDescription>Wähle ein neues Passwort für dein Konto.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mindestens 8 Zeichen"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  validatePassword(e.target.value)
                }}
                required
                autoFocus
              />
              {passwordError && (
                <p className="text-xs text-red-500">{passwordError}</p>
              )}
            </div>
            {error && (
              <Alert variant="destructive" className="text-sm py-2">{error}</Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
