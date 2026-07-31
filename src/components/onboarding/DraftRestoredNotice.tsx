'use client'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  /** ISO-Zeitstempel der letzten Änderung am Entwurf. */
  updatedAt: string
  onDiscard: () => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  if (isToday) {
    return `heute um ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  }

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `gestern um ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  }

  return `am ${date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}`
}

export function DraftRestoredNotice({ updatedAt, onDiscard }: Props) {
  const when = formatDate(updatedAt)

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 mb-6"
    >
      <span className="text-sm text-green-800">
        Wir haben deinen Stand gesichert{when && ` – zuletzt bearbeitet ${when}`}.
      </span>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-sm text-green-700 underline underline-offset-2 ml-auto"
          >
            Neu beginnen
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gesicherten Stand verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle bisher eingegebenen Ziele gehen dabei verloren. Du startest wieder
              bei Schritt 1.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={onDiscard}>Verwerfen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
