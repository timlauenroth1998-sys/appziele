'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGoalStorage } from '@/hooks/useGoalStorage'

const FEATURES = [
  {
    icon: '🎯',
    title: 'Ziele eingeben',
    description: 'Definiere deine Visionen und Ziele pro Lebensbereich',
  },
  {
    icon: '🗺️',
    title: 'Roadmap erhalten',
    description: 'KI erstellt automatisch deinen 5-Jahres- bis Wochenplan',
  },
  {
    icon: '📅',
    title: 'In den Kalender',
    description: 'Exportiere alles in Apple, Google oder Outlook Kalender',
  },
]

const LIFE_AREAS = ['Karriere & Beruf', 'Gesundheit & Fitness', 'Finanzen', 'Beziehungen & Familie']

export default function HomePage() {
  const router = useRouter()
  const { profile, isLoaded } = useGoalStorage()

  useEffect(() => {
    if (isLoaded && profile && profile.lifeAreas.length > 0) {
      router.replace('/goals')
    }
  }, [isLoaded, profile, router])

  if (!isLoaded) return null

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="font-semibold text-gray-900 text-lg">Ziele App</span>
        <Button variant="ghost" size="sm" onClick={() => router.push('/onboarding')}>
          Anmelden
        </Button>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-6 text-sm font-normal">
          Vom Ziel zur Umsetzung – in Minuten
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
          Deine Ziele.
          <br />
          <span className="text-gray-500">Dein konkreter Fahrplan.</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10">
          Gib deine Ziele ein und erhalte sofort einen strukturierten Plan –
          aufgeteilt in 5-Jahres-Vision, Jahres-, Quartals-, Monats- und Wochenziele.
          Direkt in deinen Kalender exportierbar.
        </p>
        <Button size="lg" className="px-8 py-6 text-base" onClick={() => router.push('/onboarding')}>
          Jetzt kostenlos starten →
        </Button>
        <p className="text-sm text-gray-400 mt-4">Kein Account erforderlich</p>
      </section>

      {/* Life area chips */}
      <section className="max-w-5xl mx-auto px-6 pb-16 flex flex-wrap gap-2 justify-center">
        {LIFE_AREAS.map((area) => (
          <Badge key={area} variant="outline" className="text-sm font-normal px-3 py-1">
            {area}
          </Badge>
        ))}
        <Badge variant="outline" className="text-sm font-normal px-3 py-1 text-gray-400">
          + Eigene Bereiche
        </Badge>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-6 bg-gray-50">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="border-t border-gray-100 py-16 text-center px-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Bereit, deinen Plan zu erstellen?
        </h2>
        <Button size="lg" onClick={() => router.push('/onboarding')} className="px-8">
          Fahrplan erstellen
        </Button>
      </section>
    </div>
  )
}
