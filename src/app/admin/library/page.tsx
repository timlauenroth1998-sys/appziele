'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAuthButton } from '@/components/UserAuthButton'
import { useAuth } from '@/hooks/useAuth'
import { useCoachRole } from '@/hooks/useCoachRole'

interface Document {
  id: string
  name: string
  size_bytes: number
  chunk_count: number
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LibraryPage() {
  const router = useRouter()
  const { user, session, isLoaded: authLoaded } = useAuth()
  const { isAdmin, isLoaded: roleLoaded } = useCoachRole()

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const authHeaders = () => ({
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  })

  async function loadDocuments() {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch('/api/library/documents', { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoaded && roleLoaded) {
      if (!user) { router.replace('/auth?from=/admin/library'); return }
      if (!isAdmin) { router.replace('/admin'); return }
      loadDocuments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, roleLoaded, user, isAdmin])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    setSuccess('')
    setUploadProgress(10)

    const formData = new FormData()
    formData.append('file', file)

    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 8, 88))
    }, 1500)

    try {
      const res = await fetch('/api/library/upload', { method: 'POST', headers: authHeaders(), body: formData })
      clearInterval(progressInterval)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setUploadProgress(100)
      setSuccess(`"${data.name}" hochgeladen — ${data.chunkCount} Abschnitte indexiert.`)
      await loadDocuments()
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" wirklich löschen?`)) return
    setError('')
    try {
      const res = await fetch('/api/library/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    }
  }

  if (!authLoaded || !roleLoaded) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-2xl mx-auto">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </nav>
        <div className="max-w-2xl mx-auto px-6 py-12 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 bg-white px-6 py-4 flex items-center justify-between max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/admin')}
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Admin
        </button>
        <UserAuthButton />
      </nav>
      <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Coaching-Bibliothek</h1>
        <p className="text-sm text-gray-500">
          PDFs hochladen — die Inhalte fließen automatisch in jede Roadmap-Generierung ein.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-6 hover:border-blue-300 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-3xl mb-3">📚</div>
        <p className="text-sm font-medium text-gray-700 mb-1">PDF hier ablegen oder klicken</p>
        <p className="text-xs text-gray-400">Max. 20 MB · nur PDF-Dateien</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-4 space-y-2">
          <p className="text-sm text-gray-600">Dokument wird verarbeitet und indexiert…</p>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* Messages */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">✓ {success}</AlertDescription>
        </Alert>
      )}

      {/* Document list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {documents.length} {documents.length === 1 ? 'Dokument' : 'Dokumente'} in der Bibliothek
        </h2>

        {loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Lade Dokumente…</div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-gray-400 py-8 text-center border border-gray-100 rounded-xl">
            Noch keine Dokumente hochgeladen.
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xl mt-0.5">📄</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatBytes(doc.size_bytes)} · {doc.chunk_count} Abschnitte ·{' '}
                    {new Date(doc.created_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                  Indexiert
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(doc.id, doc.name)}
                >
                  Löschen
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}
