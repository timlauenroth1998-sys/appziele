'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserAuthButton } from '@/components/UserAuthButton'
import { InviteClientDialog } from '@/components/coach/InviteClientDialog'
import { useAuth } from '@/hooks/useAuth'
import { useCoachRole } from '@/hooks/useCoachRole'
import { useCoachClients } from '@/hooks/useCoachClients'

export default function CoachPage() {
  const router = useRouter()
  const { user, isLoaded: authLoaded } = useAuth()
  const { isCoach, isLoaded: roleLoaded } = useCoachRole()
  const { clients, pending, isLoaded: clientsLoaded, error, invite, disconnect } = useCoachClients()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState<{ id: string; label: string } | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  const isLoading = !authLoaded || !roleLoaded || (isCoach && !clientsLoaded)

  async function handleDisconnectConfirm() {
    if (!confirmDisconnect) return
    setDisconnecting(true)
    setDisconnectError(null)
    try {
      await disconnect(confirmDisconnect.id)
      setConfirmDisconnect(null)
    } catch (err) {
      setDisconnectError(err instanceof Error ? err.message : 'Verbindung konnte nicht getrennt werden.')
    } finally {
      setDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </nav>
        <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    )
  }

  // Not logged in
  if (!user) {
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
        <div className="flex items-center justify-center text-center px-6 mt-32">
          <div>
            <p className="text-gray-500 mb-4">Bitte melde dich an, um den Coach-Bereich zu nutzen.</p>
            <Button onClick={() => router.push('/auth?from=/coach')}>Zum Login →</Button>
          </div>
        </div>
      </div>
    )
  }

  // Logged in but not a coach
  if (!isCoach) {
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
        <main className="max-w-3xl mx-auto px-6 py-16">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center space-y-3">
            <div className="text-3xl">🔒</div>
            <h1 className="text-xl font-semibold text-gray-900">Kein Coach-Zugang</h1>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Du hast aktuell keine Coach-Berechtigung. Damit du Klienten einladen und begleiten
              kannst, muss dir ein Administrator die Coach-Rolle freischalten.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
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
            className="text-gray-500 hover:text-gray-700"
            onClick={() => router.push('/coach/library')}
          >
            Bibliothek
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => router.push('/settings')}
          >
            Einstellungen
          </Button>
          <UserAuthButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Meine Klienten</h1>
            <p className="text-sm text-gray-500">
              Lade Klienten ein und begleite sie mit Feedback zu ihrer Roadmap.
            </p>
          </div>
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            + Klient einladen
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Active clients */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Aktive Klienten ({clients.length})
            </h2>
          </div>

          {clients.length === 0 && pending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <div className="text-3xl mb-3">👥</div>
              <p className="text-sm font-medium text-gray-700">
                Noch keine Klienten.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Lade deinen ersten Klienten ein, um loszulegen.
              </p>
              <Button
                className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setInviteOpen(true)}
              >
                + Ersten Klienten einladen
              </Button>
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
              Keine aktiven Klienten — schau unten bei den ausstehenden Einladungen.
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={`${client.coachId}-${client.clientId}`}
                  className="rounded-xl border border-gray-100 bg-white px-4 py-3 flex items-center justify-between gap-3 flex-wrap hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {(client.clientEmail ?? '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {client.clientEmail ?? client.clientId.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Verbunden seit{' '}
                        {new Date(client.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge className="text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                      Aktiv
                    </Badge>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/coach/${client.clientId}`)}
                    >
                      Roadmap ansehen →
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() =>
                        setConfirmDisconnect({
                          id: client.clientId,
                          label: client.clientEmail ?? 'diesen Klienten',
                        })
                      }
                    >
                      Trennen
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending invites */}
        {pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Ausstehende Einladungen ({pending.length})
            </h2>
            <div className="space-y-2">
              {pending.map((invite) => (
                <div
                  key={`${invite.coachId}-${invite.clientId}`}
                  className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {(invite.invitedEmail ?? '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invite.invitedEmail ?? 'Unbekannt'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Eingeladen am{' '}
                        {new Date(invite.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
                      Ausstehend
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() =>
                      setConfirmDisconnect({
                        id: invite.clientId,
                        label: invite.invitedEmail ?? 'diese Einladung',
                      })
                    }
                  >
                    Zurückziehen
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Invite dialog */}
      <InviteClientDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={invite}
      />

      {/* Disconnect confirmation */}
      <AlertDialog
        open={!!confirmDisconnect}
        onOpenChange={(v) => (v ? null : setConfirmDisconnect(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verbindung wirklich trennen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Verbindung zu <strong>{confirmDisconnect?.label}</strong> wird sofort getrennt.
              Du kannst die Person jederzeit erneut einladen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {disconnectError && (
            <Alert variant="destructive" className="text-sm py-2">
              <AlertDescription>{disconnectError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDisconnectConfirm()
              }}
              disabled={disconnecting}
              className="bg-red-600 hover:bg-red-700"
            >
              {disconnecting ? 'Wird getrennt…' : 'Verbindung trennen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
