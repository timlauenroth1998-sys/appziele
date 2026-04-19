'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserAuthButton } from '@/components/UserAuthButton'
import { useAuth } from '@/hooks/useAuth'
import { useCoachRole } from '@/hooks/useCoachRole'
import { useLibrarySearch } from '@/hooks/useLibrarySearch'

export default function CoachLibraryPage() {
  const router = useRouter()
  const { user, isLoaded: authLoaded } = useAuth()
  const { isCoach, isLoaded: roleLoaded } = useCoachRole()
  const { results, isSearching, error, hasSearched, search } = useLibrarySearch()
  const [query, setQuery] = useState('')

  const isLoading = !authLoaded || !roleLoaded

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) void search(query)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-full" />
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-center px-6">
        <div>
          <p className="text-gray-500 mb-4">Bitte melde dich an.</p>
          <Button onClick={() => router.push('/auth?from=/coach/library')}>Zum Login →</Button>
        </div>
      </div>
    )
  }

  if (!isCoach) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
          <button type="button" onClick={() => router.push('/goals')} className="text-sm text-gray-400 hover:text-gray-700">
            ← Meine Ziele
          </button>
          <UserAuthButton />
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-sm text-gray-500">Kein Coach-Zugang.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <button type="button" onClick={() => router.push('/coach')} className="text-sm text-gray-400 hover:text-gray-700">
          ← Meine Klienten
        </button>
        <UserAuthButton />
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Coaching-Bibliothek</h1>
          <p className="text-sm text-gray-500">
            Durchsuche die Bibliothek nach relevanten Inhalten für deine Klienten.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="z.B. Zielsetzung, Motivation, Resilienz…"
            className="flex-1"
            disabled={isSearching}
          />
          <Button type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? 'Suche…' : 'Suchen'}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSearching && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-gray-700">Keine Treffer für deine Suche.</p>
            <p className="text-xs text-gray-400 mt-1">Versuche andere Suchbegriffe.</p>
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">{results.length} Treffer gefunden</p>
            {results.map((result) => (
              <div key={result.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 truncate">{result.document_name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {Math.round(result.similarity * 100)}% Relevanz
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">{result.content}</p>
              </div>
            ))}
          </div>
        )}

        {!hasSearched && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <div className="text-3xl mb-3">📚</div>
            <p className="text-sm font-medium text-gray-700">Gib einen Suchbegriff ein.</p>
            <p className="text-xs text-gray-400 mt-1">Die KI-Suche findet semantisch ähnliche Inhalte aus der Bibliothek.</p>
          </div>
        )}
      </main>
    </div>
  )
}
