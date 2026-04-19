'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserAuthButton } from '@/components/UserAuthButton'
import { useAuth } from '@/hooks/useAuth'
import { useSharedDocuments, SharedDoc } from '@/hooks/useSharedDocuments'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const router = useRouter()
  const { user, isLoaded: authLoaded } = useAuth()
  const { docs, isLoaded, error, fetchContent } = useSharedDocuments()

  const [openDoc, setOpenDoc] = useState<{ name: string; text: string } | null>(null)
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function handleOpen(doc: SharedDoc) {
    if (!doc.document) return
    setLoadingDocId(doc.documentId)
    setLoadError(null)
    const content = await fetchContent(doc.documentId)
    setLoadingDocId(null)
    if (!content) {
      setLoadError('Dokument konnte nicht geladen werden.')
      return
    }
    setOpenDoc(content)
  }

  if (!authLoaded || !isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </nav>
        <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-center px-6">
        <div>
          <p className="text-gray-500 mb-4">Bitte melde dich an, um deine Dokumente zu sehen.</p>
          <Button onClick={() => router.push('/auth?from=/documents')}>Zum Login →</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-3xl mx-auto">
        <button type="button" onClick={() => router.push('/goals')} className="text-sm text-gray-400 hover:text-gray-700">
          ← Meine Ziele
        </button>
        <UserAuthButton />
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Meine Dokumente</h1>
          <p className="text-sm text-gray-500">
            Dokumente, die dein Coach mit dir geteilt hat.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loadError && (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <div className="text-3xl mb-3">📄</div>
            <p className="text-sm font-medium text-gray-700">Noch keine Dokumente geteilt.</p>
            <p className="text-xs text-gray-400 mt-1">Dein Coach kann Dokumente aus der Bibliothek mit dir teilen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.documentId}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl mt-0.5 shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.document?.name ?? 'Unbekanntes Dokument'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {doc.document ? formatBytes(doc.document.size_bytes) : ''}
                      {doc.document && ' · '}
                      Geteilt am {new Date(doc.sharedAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                    Von Coach
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleOpen(doc)}
                    disabled={loadingDocId === doc.documentId}
                  >
                    {loadingDocId === doc.documentId ? 'Lädt…' : 'Lesen'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!openDoc} onOpenChange={(open) => { if (!open) setOpenDoc(null) }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate">{openDoc?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {openDoc?.text}
            </p>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
