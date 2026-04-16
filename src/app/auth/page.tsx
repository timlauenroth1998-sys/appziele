'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useMigration } from '@/hooks/useMigration'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapAuthError(message: string): string {
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Diese E-Mail ist bereits registriert. Bitte melde dich an.'
  }
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return 'E-Mail oder Passwort falsch.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Bitte bestätige zuerst deine E-Mail-Adresse.'
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Zu viele Versuche. Bitte warte kurz und probiere es erneut.'
  }
  return message
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner component (reads searchParams)
// ─────────────────────────────────────────────────────────────────────────────

function AuthPageInner() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('from') ?? '/goals'
  const { migrate } = useMigration()

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [view, setView] = useState<'tabs' | 'forgot-password' | 'forgot-sent' | 'email-confirm'>('tabs')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register state
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordError, setRegPasswordError] = useState('')
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  // ── Login ──────────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) {
        setLoginError(mapAuthError(error.message))
        return
      }
      if (data.user) {
        await migrate(data.user.id)
      }
      window.location.href = redirectTo
    } finally {
      setLoginLoading(false)
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────

  function validatePassword(pw: string) {
    if (pw.length > 0 && pw.length < 8) {
      setRegPasswordError('Passwort muss mindestens 8 Zeichen lang sein.')
    } else {
      setRegPasswordError('')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (regPassword.length < 8) {
      setRegPasswordError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }
    setRegError('')
    setRegLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      })
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          setRegError('Diese E-Mail ist bereits registriert.')
          setTab('login')
          setLoginEmail(regEmail)
          return
        }
        setRegError(mapAuthError(error.message))
        return
      }
      // If session is immediately available (e-mail confirmation disabled)
      if (data.session?.user) {
        await migrate(data.session.user.id)
        window.location.href = redirectTo
        return
      }
      // Email confirmation required
      setView('email-confirm')
    } finally {
      setRegLoading(false)
    }
  }

  // ── Forgot password ────────────────────────────────────────────────────────

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setForgotError((body as { error?: string }).error ?? 'Ein Fehler ist aufgetreten.')
        return
      }
      setView('forgot-sent')
    } finally {
      setForgotLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === 'forgot-sent') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>E-Mail gesendet</CardTitle>
            <CardDescription>
              Wenn diese E-Mail-Adresse bei uns registriert ist, hast du einen Reset-Link erhalten.
              Überprüfe auch deinen Spam-Ordner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => setView('tabs')}>
              Zurück zum Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'email-confirm') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>Bitte bestätige deine E-Mail</CardTitle>
            <CardDescription>
              Wir haben eine Bestätigungsmail an <strong>{regEmail}</strong> gesendet.
              Klicke auf den Link darin, um dein Konto zu aktivieren.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => setView('tabs')}>
              Zurück zum Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Passwort zurücksetzen</CardTitle>
            <CardDescription>
              Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="forgot-email">E-Mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="deine@email.de"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {forgotError && (
                <Alert variant="destructive" className="text-sm py-2">{forgotError}</Alert>
              )}
              <Button type="submit" className="w-full" disabled={forgotLoading}>
                {forgotLoading ? 'Wird gesendet…' : 'Reset-Link senden'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm text-gray-500"
                onClick={() => setView('tabs')}
              >
                ← Zurück zum Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Ziele App</h1>
          <p className="text-sm text-gray-500 mt-1">Melde dich an oder erstelle ein Konto</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">Anmelden</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Registrieren</TabsTrigger>
          </TabsList>

          {/* ── Login tab ── */}
          <TabsContent value="login">
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="login-email">E-Mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="deine@email.de"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Passwort</Label>
                      <button
                        type="button"
                        className="text-xs text-indigo-600 hover:underline"
                        onClick={() => {
                          setForgotEmail(loginEmail)
                          setView('forgot-password')
                        }}
                      >
                        Passwort vergessen?
                      </button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  {loginError && (
                    <Alert variant="destructive" className="text-sm py-2">{loginError}</Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loginLoading}>
                    {loginLoading ? 'Anmelden…' : 'Anmelden'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Register tab ── */}
          <TabsContent value="register">
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="reg-email">E-Mail</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="deine@email.de"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reg-password">Passwort</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Mindestens 8 Zeichen"
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value)
                        validatePassword(e.target.value)
                      }}
                      required
                    />
                    {regPasswordError && (
                      <p className="text-xs text-red-500">{regPasswordError}</p>
                    )}
                  </div>
                  {regError && (
                    <Alert variant="destructive" className="text-sm py-2">{regError}</Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={regLoading}>
                    {regLoading ? 'Konto wird erstellt…' : 'Konto erstellen'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-gray-400">
          Du kannst die App auch ohne Konto nutzen.{' '}
          <a href="/goals" className="underline hover:text-gray-600">
            Weiter ohne Login
          </a>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page export (wraps with Suspense for useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  )
}
