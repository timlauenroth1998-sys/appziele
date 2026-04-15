'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Roadmap, LIFE_AREA_COLOR_MAP, LifeAreaColor } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  roadmap: Roadmap
  areaColors: Record<string, string>
}

const LEVEL_OPTIONS = [
  { key: 'weeks',   label: 'Wochenziele',   desc: 'Montag jeder Woche' },
  { key: 'months',  label: 'Monatsziele',   desc: '1. des jeweiligen Monats' },
  { key: 'quarters',label: 'Quartalsziele', desc: '1. des jeweiligen Quartals' },
  { key: 'goals1y', label: 'Jahresziele',   desc: '1. Januar' },
]

const CALENDAR_GUIDES = [
  { name: 'Apple Kalender', steps: 'Datei → Importieren → .ics auswählen' },
  { name: 'Google Kalender', steps: 'Einstellungen → Kalender importieren → .ics auswählen' },
  { name: 'Outlook', steps: 'Datei → Öffnen & Exportieren → Importieren/Exportieren → iCalendar importieren' },
]

export function CalendarExportDialog({ open, onClose, roadmap, areaColors }: Props) {
  const [selectedLevels, setSelectedLevels] = useState<string[]>(['weeks', 'months', 'quarters'])
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    roadmap.lifeAreaRoadmaps.map(l => l.lifeAreaId)
  )
  const [loading, setLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const toggleLevel = (key: string) => {
    setSelectedLevels(prev =>
      prev.includes(key) ? prev.filter(l => l !== key) : [...prev, key]
    )
  }

  const toggleArea = (id: string) => {
    setSelectedAreas(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const handleExport = async () => {
    if (!selectedLevels.length || !selectedAreas.length) return
    setLoading(true)
    try {
      const res = await fetch('/api/export/ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmap,
          levels: selectedLevels,
          areaIds: selectedAreas,
          year: new Date().getFullYear(),
        }),
      })
      if (!res.ok) throw new Error('Export fehlgeschlagen')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ziele-roadmap.ics'
      a.click()
      URL.revokeObjectURL(url)
      setShowGuide(true)
    } catch {
      alert('Export fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const estimatedEvents = roadmap.lifeAreaRoadmaps
    .filter(l => selectedAreas.includes(l.lifeAreaId))
    .reduce((sum, lar) => {
      let n = 0
      if (selectedLevels.includes('weeks'))    n += Object.values(lar.timeline.weeks).flat().length
      if (selectedLevels.includes('months'))   n += Object.values(lar.timeline.months).flat().length
      if (selectedLevels.includes('quarters')) n += Object.values(lar.timeline.quarters).flat().length
      if (selectedLevels.includes('goals1y'))  n += lar.timeline.goals1y.length
      return sum + n
    }, 0)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); setShowGuide(false) } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📅 Kalender exportieren</DialogTitle>
          <DialogDescription>
            Exportiere deine Roadmap als .ics-Datei für Apple Kalender, Google Kalender oder Outlook.
          </DialogDescription>
        </DialogHeader>

        {!showGuide ? (
          <div className="space-y-5">
            {/* Level selection */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Zeitebenen</p>
              <div className="space-y-2">
                {LEVEL_OPTIONS.map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedLevels.includes(key)}
                      onChange={() => toggleLevel(key)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="flex-1">
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      <span className="text-xs text-gray-400 ml-2">{desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Area selection */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Lebensbereiche</p>
              <div className="flex flex-wrap gap-2">
                {roadmap.lifeAreaRoadmaps.map(lar => {
                  const color = areaColors[lar.lifeAreaId] as LifeAreaColor ?? 'blue'
                  const colorMap = LIFE_AREA_COLOR_MAP[color] ?? LIFE_AREA_COLOR_MAP.blue
                  const active = selectedAreas.includes(lar.lifeAreaId)
                  return (
                    <button
                      key={lar.lifeAreaId}
                      type="button"
                      onClick={() => toggleArea(lar.lifeAreaId)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                        active
                          ? `${colorMap.bg} ${colorMap.text} border-current`
                          : 'bg-white text-gray-400 border-gray-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? colorMap.dot : 'bg-gray-300'}`} />
                      {lar.lifeAreaName}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600">
              {estimatedEvents === 0
                ? 'Bitte wähle mindestens eine Zeitebene und einen Lebensbereich.'
                : `Ca. ${Math.min(estimatedEvents, 100)} Kalendereinträge werden exportiert.`}
              {estimatedEvents > 100 && (
                <p className="text-amber-600 mt-1 text-xs">Max. 100 Einträge — bitte Auswahl einschränken.</p>
              )}
            </div>

            <Button
              onClick={handleExport}
              disabled={loading || !selectedLevels.length || !selectedAreas.length}
              className="w-full"
            >
              {loading ? 'Wird erstellt…' : '⬇ .ics herunterladen'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium">
              ✓ Datei heruntergeladen! Jetzt in deinen Kalender importieren:
            </div>
            <div className="space-y-3">
              {CALENDAR_GUIDES.map(({ name, steps }) => (
                <div key={name} className="rounded-lg border border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{name}</p>
                  <p className="text-xs text-gray-500">{steps}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowGuide(false)}>
              Nochmal exportieren
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
