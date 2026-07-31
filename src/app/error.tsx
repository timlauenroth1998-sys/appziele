'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Route-level error boundary. Without this, any render exception leaves the user
 * on a blank screen with no way back — see the Chrome auto-translate crash that
 * reset the onboarding wizard to step 1 and discarded everything entered.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unerwarteter Fehler:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4">😕</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Da ist etwas schiefgelaufen
        </h1>
        <p className="text-gray-500 mb-2">
          Der Fehler liegt bei uns, nicht bei dir. Deine zuletzt gespeicherten Ziele
          sind sicher.
        </p>
        <p className="text-sm text-gray-400 mb-8">
          Falls das wiederholt passiert: Eine aktive Browser-Übersetzung oder eine
          Erweiterung kann die Seite stören. Ein privates Fenster hilft oft.
        </p>

        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Nochmal versuchen</Button>
          <Button variant="outline" onClick={() => (window.location.href = '/goals')}>
            Zu meinen Zielen
          </Button>
        </div>

        {error.digest && (
          <p className="text-xs text-gray-300 mt-8">Fehlercode: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
