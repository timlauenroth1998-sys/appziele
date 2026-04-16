'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useCoachComments } from '@/hooks/useCoachComments'

interface Props {
  open: boolean
  onClose: () => void
  itemId: string | null
  clientId: string | null
  /** If true (default), coach can write/edit/delete. If false, read-only view for the client. */
  canEdit?: boolean
  itemText?: string
}

const MAX_LEN = 500

export function CommentDialog({
  open,
  onClose,
  itemId,
  clientId,
  canEdit = true,
  itemText,
}: Props) {
  const { comments, isLoaded, addComment, deleteComment } = useCoachComments(
    open ? itemId : null,
    open ? clientId : null
  )
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setDraft('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  async function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setError('Kommentar darf nicht leer sein.')
      return
    }
    if (trimmed.length > MAX_LEN) {
      setError(`Kommentar darf maximal ${MAX_LEN} Zeichen lang sein.`)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await addComment(trimmed)
      setDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kommentar konnte nicht gespeichert werden.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteComment(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kommentar konnte nicht gelöscht werden.')
    }
  }

  const remaining = MAX_LEN - draft.length

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{canEdit ? 'Kommentar hinzufügen' : 'Kommentar des Coaches'}</DialogTitle>
          <DialogDescription>
            {canEdit
              ? 'Dein Kommentar ist nur für den Klienten und dich sichtbar.'
              : 'Dein Coach hat dir hier ein Feedback hinterlassen.'}
          </DialogDescription>
        </DialogHeader>

        {itemText && (
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Roadmap-Item</p>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
              {itemText.replace(/→.*$/, '').trim()}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {comments.length} {comments.length === 1 ? 'Kommentar' : 'Kommentare'}
          </p>

          {!isLoaded ? (
            <p className="text-sm text-gray-400">Lade Kommentare…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Noch keine Kommentare.</p>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700 bg-white">
                      Coach
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {c.comment}
                  </p>
                  {canEdit && (
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Löschen
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="space-y-1.5">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
              placeholder="Schreibe hier deinen Kommentar für den Klienten…"
              className="min-h-[100px] text-sm"
              maxLength={MAX_LEN}
              disabled={submitting}
            />
            <p className={`text-xs text-right ${remaining < 50 ? 'text-amber-600' : 'text-gray-400'}`}>
              {remaining} Zeichen übrig
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="text-sm py-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Schließen
          </Button>
          {canEdit && (
            <Button type="button" onClick={handleSave} disabled={submitting || !draft.trim()}>
              {submitting ? 'Wird gespeichert…' : 'Speichern'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
