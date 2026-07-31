'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  onDismiss: () => void
}

/**
 * Ohne diesen Hinweis ueberschreibt ein erneuter Wizard-Durchlauf ein bereits
 * gespeichertes Zielprofil ungefragt — ein stiller Datenverlust-Pfad.
 */
export function ExistingProfileWarning({ onDismiss }: Props) {
  const router = useRouter()

  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6"
    >
      <p className="text-sm font-medium text-amber-900 mb-1">
        Du hast bereits Ziele definiert
      </p>
      <p className="text-sm text-amber-800 mb-3">
        Wenn du das Onboarding hier neu durchläufst, werden deine bestehenden Ziele
        am Ende ersetzt.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => router.push('/goals')}>
          Bestehende Ziele bearbeiten
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Trotzdem neu starten
        </Button>
      </div>
    </div>
  )
}
