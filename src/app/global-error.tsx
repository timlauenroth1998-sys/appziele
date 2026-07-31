'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary for errors thrown in the root layout itself. It replaces
 * the whole document, so it must render its own <html> and <body> and cannot use
 * app components or Tailwind-dependent styling.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Kritischer Fehler:', error)
  }, [error])

  return (
    <html lang="de">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          margin: 0,
          padding: '1.5rem',
          textAlign: 'center',
          color: '#111827',
        }}
      >
        <div style={{ maxWidth: '28rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Die App konnte nicht geladen werden
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            Bitte lade die Seite neu. Deine gespeicherten Ziele bleiben erhalten.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#111827',
              color: '#fff',
              border: 0,
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Neu laden
          </button>
        </div>
      </body>
    </html>
  )
}
