export type LifeAreaId = 'career' | 'health' | 'finance' | 'relationships' | string

export interface LifeAreaGoal {
  id: LifeAreaId
  name: string
  isCustom: boolean
  color: LifeAreaColor
  yearGoal: string
  quarterGoal: string
  monthGoal: string
  weekGoal: string
}

export interface GoalProfile {
  vision5y: string
  lifeAreas: LifeAreaGoal[]
  createdAt: string
  updatedAt: string
}

export type LifeAreaColor = 'blue' | 'green' | 'amber' | 'rose' | 'purple' | 'teal' | 'orange' | 'indigo'

export const LIFE_AREA_DEFAULTS: Omit<LifeAreaGoal, 'yearGoal' | 'quarterGoal' | 'monthGoal' | 'weekGoal'>[] = [
  { id: 'career', name: 'Karriere & Beruf', isCustom: false, color: 'blue' },
  { id: 'health', name: 'Gesundheit & Fitness', isCustom: false, color: 'green' },
  { id: 'finance', name: 'Finanzen', isCustom: false, color: 'amber' },
  { id: 'relationships', name: 'Beziehungen & Familie', isCustom: false, color: 'rose' },
]

export const LIFE_AREA_COLOR_MAP: Record<LifeAreaColor, { bg: string; text: string; border: string; dot: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
}

export const CUSTOM_AREA_COLORS: LifeAreaColor[] = ['purple', 'teal', 'orange', 'indigo']

// ─── Roadmap types ────────────────────────────────────────────────────────────

export interface RoadmapItem {
  id: string
  text: string
  isEdited: boolean
  editedAt?: string
}

export interface RoadmapTimeline {
  vision5y: RoadmapItem[]
  goals3y: RoadmapItem[]
  goals1y: RoadmapItem[]
  quarters: { q1: RoadmapItem[]; q2: RoadmapItem[]; q3: RoadmapItem[]; q4: RoadmapItem[] }
  months: {
    jan: RoadmapItem[]; feb: RoadmapItem[]; mar: RoadmapItem[]
    apr: RoadmapItem[]; may: RoadmapItem[]; jun: RoadmapItem[]
    jul: RoadmapItem[]; aug: RoadmapItem[]; sep: RoadmapItem[]
    oct: RoadmapItem[]; nov: RoadmapItem[]; dec: RoadmapItem[]
  }
  weeks: { w1: RoadmapItem[]; w2: RoadmapItem[]; w3: RoadmapItem[]; w4: RoadmapItem[] }
}

export interface LifeAreaRoadmap {
  lifeAreaId: string
  lifeAreaName: string
  timeline: RoadmapTimeline
}

export interface Roadmap {
  generatedAt: string
  profileHash: string
  lifeAreaRoadmaps: LifeAreaRoadmap[]
}

export type GenerationStatus = 'idle' | 'generating' | 'done' | 'error'

// ─── Coach / Client relationship types (PROJ-6) ──────────────────────────────

export type CoachRelationStatus = 'pending' | 'active' | 'declined'

export interface CoachClient {
  coachId: string
  clientId: string
  clientEmail: string | null
  status: CoachRelationStatus
  invitedEmail: string | null
  createdAt: string
  updatedAt: string
}

export interface PendingInvite {
  coachId: string
  clientId: string
  coachEmail: string | null
  invitedEmail: string | null
  status: CoachRelationStatus
  createdAt: string
}

export interface RoadmapComment {
  id: string
  coachId: string
  clientId: string
  itemId: string
  comment: string
  createdAt: string
}
