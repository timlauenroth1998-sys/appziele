'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { usePendingInvites } from '@/hooks/usePendingInvites'

export function PendingInviteBanner() {
  const { invites, isLoaded, respond } = usePendingInvites()
  const [busyCoachId, setBusyCoachId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isLoaded || invites.length === 0) return null

  async function handleRespond(coachId: string, action: 'accept' | 'decline') {
    setBusyCoachId(coachId)
    setError(null)
    try {
      await respond(coachId, action)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen.')
    } finally {
      setBusyCoachId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-4 space-y-2">
      {error && (
        <Alert variant="destructive" className="text-sm py-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {invites.map((invite) => {
        const label = invite.invitedEmail ?? 'Ein Coach'
        const isBusy = busyCoachId === invite.coachId
        return (
          <div
            key={invite.coachId}
            className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-900">
                Einladung als Klient erhalten
              </p>
              <p className="text-xs text-indigo-700 mt-0.5 truncate">
                Dein Coach <span className="font-semibold">{label}</span> möchte dich einladen. Du kannst jederzeit pro Lebensbereich entscheiden, was er sehen darf.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                onClick={() => handleRespond(invite.coachId, 'decline')}
                disabled={isBusy}
              >
                Ablehnen
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => handleRespond(invite.coachId, 'accept')}
                disabled={isBusy}
              >
                {isBusy ? 'Wird gespeichert…' : 'Akzeptieren'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
