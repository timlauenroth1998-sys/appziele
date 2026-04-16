'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  open: boolean
  onClose: () => void
  onInvite: (email: string) => Promise<void>
}

export function InviteClientDialog({ open, onClose, onInvite }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function reset() {
    setEmail('')
    setError('')
    setSuccess('')
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Bitte gib eine E-Mail-Adresse ein.')
      return
    }
    // Lightweight format check — server does the real validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.')
      return
    }

    setLoading(true)
    try {
      await onInvite(trimmed)
      setSuccess(`Einladung gesendet an ${trimmed}`)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Einladung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Klient einladen</DialogTitle>
          <DialogDescription>
            Der Klient erhält eine E-Mail mit einem Link zum Akzeptieren der Einladung.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">E-Mail-Adresse</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="klient@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              disabled={loading}
              required
            />
          </div>

          {error && (
            <Alert variant="destructive" className="text-sm py-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-sm py-2">
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Schließen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Wird gesendet…' : 'Einladung senden'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
