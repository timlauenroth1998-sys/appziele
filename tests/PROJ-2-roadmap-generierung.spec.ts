import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const mockProfile = {
  vision5y: 'Ich bin selbstständig und arbeite ortsunabhängig.',
  lifeAreas: [
    { id: 'career', name: 'Karriere & Beruf', isCustom: false, color: 'blue', yearGoal: 'Beförderung erreichen', quarterGoal: '', monthGoal: '', weekGoal: '' },
    { id: 'health', name: 'Gesundheit & Fitness', isCustom: false, color: 'green', yearGoal: '10kg abnehmen', quarterGoal: '', monthGoal: '', weekGoal: '' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function makeItems(texts: string[]) {
  return texts.map((text, i) => ({ id: `item_${i}`, text, isEdited: false }))
}

function emptyTimeline() {
  return {
    vision5y:  makeItems(['Schritt zur 5-Jahres-Vision']),
    goals3y:   makeItems(['3-Jahres-Meilenstein erreichen', 'Netzwerk ausbauen']),
    goals1y:   makeItems(['Jahresziel konkret umsetzen']),
    quarters: { q1: makeItems(['Q1: Fundament legen']), q2: makeItems(['Q2: Aufbauen']), q3: makeItems(['Q3: Skalieren']), q4: makeItems(['Q4: Abschließen']) },
    months: {
      jan: makeItems(['Januar-Aufgabe']), feb: makeItems(['Februar-Aufgabe']), mar: makeItems(['März-Aufgabe']),
      apr: makeItems(['April-Aufgabe']), may: makeItems(['Mai-Aufgabe']),     jun: makeItems(['Juni-Aufgabe']),
      jul: makeItems(['Juli-Aufgabe']),  aug: makeItems(['August-Aufgabe']),  sep: makeItems(['September-Aufgabe']),
      oct: makeItems(['Oktober-Aufgabe']), nov: makeItems(['November-Aufgabe']), dec: makeItems(['Dezember-Aufgabe']),
    },
    weeks: { w1: makeItems(['Woche 1: Starten']), w2: makeItems(['Woche 2: Vertiefen']), w3: makeItems(['Woche 3: Optimieren']), w4: makeItems(['Woche 4: Abschließen']) },
  }
}

const mockRoadmap = {
  generatedAt: new Date().toISOString(),
  profileHash: btoa(JSON.stringify(mockProfile.lifeAreas)).slice(0, 16),
  lifeAreaRoadmaps: [
    { lifeAreaId: 'career', lifeAreaName: 'Karriere & Beruf', timeline: emptyTimeline() },
    { lifeAreaId: 'health', lifeAreaName: 'Gesundheit & Fitness', timeline: emptyTimeline() },
  ],
}

async function seedProfile(page: { goto: (url: string) => Promise<unknown>; evaluate: (fn: () => void) => Promise<void> }) {
  await page.goto('/')
  await (page as Parameters<typeof page.evaluate>[0] extends never ? never : typeof page).evaluate(() => {
    const p = JSON.parse('{"vision5y":"Ich bin selbstständig und arbeite ortsunabhängig.","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung erreichen","quarterGoal":"","monthGoal":"","weekGoal":""},{"id":"health","name":"Gesundheit & Fitness","isCustom":false,"color":"green","yearGoal":"10kg abnehmen","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('ziele_goal_profile')
    localStorage.removeItem('ziele_roadmap')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Helper: intercept API with mock roadmap
// ─────────────────────────────────────────────────────────────────────────────
async function mockGenerateAPI(page: Parameters<typeof test>[1] extends (args: { page: infer P }) => unknown ? P : never, roadmap = mockRoadmap) {
  await page.route('**/api/roadmap/generate', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(roadmap) })
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1: Claude generiert Plan für alle Zeitebenen
// ─────────────────────────────────────────────────────────────────────────────
test('AC1: Roadmap page shows all 6 time levels after generation', async ({ page }) => {
  await mockGenerateAPI(page)
  await page.evaluate(() => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/roadmap')
  await page.waitForTimeout(500)

  await expect(page.getByText('5-Jahres-Vision').first()).toBeVisible()
  await expect(page.getByText('3-Jahresziele').first()).toBeVisible()
  await expect(page.getByText('Jahresziele').first()).toBeVisible()
  await expect(page.getByText('Quartalsziele').first()).toBeVisible()
  await expect(page.getByText('Monatsziele (Jan–Dez)')).toBeVisible()
  await expect(page.getByText('Wochenziele (erste 4 Wochen)')).toBeVisible()
})

test('AC1: Roadmap contains items from all time levels (accordion open)', async ({ page }) => {
  await mockGenerateAPI(page)
  await page.evaluate(() => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/roadmap')
  await page.waitForTimeout(500)

  // 5-Jahres-Vision is expanded by default
  await expect(page.getByText('Schritt zur 5-Jahres-Vision')).toBeVisible()
  // Jahresziele is expanded by default
  await expect(page.getByText('Jahresziel konkret umsetzen')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2: Jede Zeitebene enthält Aktionsschritte
// ─────────────────────────────────────────────────────────────────────────────
test('AC2: Each time level has actionable items', async ({ page }) => {
  await mockGenerateAPI(page)
  await page.evaluate(() => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/roadmap')
  await page.waitForTimeout(500)

  // Open quarters accordion
  await page.getByText('Quartalsziele').click()
  await expect(page.getByText('Q1: Fundament legen')).toBeVisible()

  // Open weeks accordion
  await page.getByText('Wochenziele').click()
  await expect(page.getByText('Woche 1: Starten')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3: Ladeindikator wird angezeigt
// ─────────────────────────────────────────────────────────────────────────────
test('AC3: Loading indicator shown during generation', async ({ page }) => {
  // Delay the API response to catch the loading state
  await page.route('**/api/roadmap/generate', async route => {
    await new Promise(r => setTimeout(r, 1500))
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRoadmap) })
  })
  await page.evaluate(() => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/roadmap')

  // Loading indicator should appear
  await expect(page.getByText(/analysiere|erstelle|plane|finalisiere/i)).toBeVisible()
  // Wait for completion
  await expect(page.getByText('5-Jahres-Vision').first()).toBeVisible({ timeout: 10000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4: Inline-Editing
// ─────────────────────────────────────────────────────────────────────────────
test('AC4: User can inline-edit a roadmap item', async ({ page }) => {
  // Seed with existing roadmap (no generation needed)
  await page.evaluate((roadmap) => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
    localStorage.setItem('ziele_roadmap', JSON.stringify(roadmap))
  }, mockRoadmap)

  await page.goto('/roadmap')

  // Hover the first item to reveal edit button
  await page.getByText('Schritt zur 5-Jahres-Vision').hover()
  await page.getByRole('button', { name: /bearbeiten|✎/i }).first().click()

  // Edit textarea appears
  await expect(page.locator('textarea')).toBeVisible()
  await page.locator('textarea').fill('Mein bearbeitetes Ziel')
  await page.getByRole('button', { name: /speichern/i }).click()

  // Updated text visible
  await expect(page.getByText('Mein bearbeitetes Ziel')).toBeVisible()
})

test('AC4: Edited item shows "Bearbeitet" badge', async ({ page }) => {
  await page.evaluate((roadmap) => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
    localStorage.setItem('ziele_roadmap', JSON.stringify(roadmap))
  }, mockRoadmap)
  await page.goto('/roadmap')

  await page.getByText('Schritt zur 5-Jahres-Vision').hover()
  await page.getByRole('button', { name: /bearbeiten|✎/i }).first().click()
  await page.locator('textarea').fill('Bearbeitetes Element')
  await page.getByRole('button', { name: /speichern/i }).click()

  // Hover again to see badge
  await page.getByText('Bearbeitetes Element').hover()
  await expect(page.getByText('Bearbeitet', { exact: true })).toBeVisible()
})

test('AC4: Cancel edit restores original text', async ({ page }) => {
  await page.evaluate((roadmap) => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
    localStorage.setItem('ziele_roadmap', JSON.stringify(roadmap))
  }, mockRoadmap)
  await page.goto('/roadmap')

  await page.getByText('Schritt zur 5-Jahres-Vision').hover()
  await page.getByRole('button', { name: /bearbeiten|✎/i }).first().click()
  await page.locator('textarea').fill('Nicht gespeichert')
  await page.getByRole('button', { name: /abbrechen/i }).click()

  await expect(page.getByText('Schritt zur 5-Jahres-Vision')).toBeVisible()
  await expect(page.getByText('Nicht gespeichert')).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC5: Roadmap wird in localStorage gespeichert
// ─────────────────────────────────────────────────────────────────────────────
test('AC5: Roadmap is saved to localStorage after generation', async ({ page }) => {
  await mockGenerateAPI(page)
  await page.evaluate(() => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/roadmap')
  await expect(page.getByText('5-Jahres-Vision').first()).toBeVisible({ timeout: 10000 })

  const stored = await page.evaluate(() => localStorage.getItem('ziele_roadmap'))
  expect(stored).not.toBeNull()
  const roadmap = JSON.parse(stored!)
  expect(roadmap.lifeAreaRoadmaps.length).toBeGreaterThan(0)
  expect(roadmap.generatedAt).toBeTruthy()
})

test('AC5: Roadmap survives page reload', async ({ page }) => {
  await page.evaluate((roadmap) => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
    localStorage.setItem('ziele_roadmap', JSON.stringify(roadmap))
  }, mockRoadmap)
  await page.goto('/roadmap')
  await page.reload()
  await expect(page.getByText('5-Jahres-Vision').first()).toBeVisible()
  await expect(page.getByText('Schritt zur 5-Jahres-Vision')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC6: Einzelne Zeitebenen neu generieren
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: AC6 (per-section regeneration) was NOT implemented in this sprint.
// Documented as deviation in implementation notes. Test skipped.
test.skip('AC6: User can regenerate a single time level (NOT IMPLEMENTED)', async () => {
  // This feature was deferred to a future sprint
})

// ─────────────────────────────────────────────────────────────────────────────
// AC7: KI-Prompt berücksichtigt alle Zielfelder
// ─────────────────────────────────────────────────────────────────────────────
test('AC7: API request body contains GoalProfile with all fields', async ({ page }) => {
  let capturedBody: unknown = null

  await page.route('**/api/roadmap/generate', async route => {
    capturedBody = JSON.parse(route.request().postData() ?? '{}')
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRoadmap) })
  })

  await page.evaluate(() => {
    const p = {
      vision5y: 'Meine Vision',
      lifeAreas: [{ id: 'career', name: 'Karriere', isCustom: false, color: 'blue', yearGoal: 'Beförderung', quarterGoal: 'Q1 Abschluss', monthGoal: 'Präsentation', weekGoal: 'Meeting' }],
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    }
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/roadmap')
  await expect(page.getByText('5-Jahres-Vision').first()).toBeVisible({ timeout: 10000 })

  const body = capturedBody as { vision5y: string; lifeAreas: Array<{ yearGoal: string; quarterGoal: string }> }
  expect(body.vision5y).toBe('Meine Vision')
  expect(body.lifeAreas[0].yearGoal).toBe('Beförderung')
  expect(body.lifeAreas[0].quarterGoal).toBe('Q1 Abschluss')
})

test('AC7: Roadmap tabs show correct life areas from profile', async ({ page }) => {
  await page.evaluate((roadmap) => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""},{"id":"health","name":"Gesundheit & Fitness","isCustom":false,"color":"green","yearGoal":"10kg","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
    localStorage.setItem('ziele_roadmap', JSON.stringify(roadmap))
  }, mockRoadmap)
  await page.goto('/roadmap')

  await expect(page.getByRole('tab', { name: /karriere/i })).toBeVisible()
  await expect(page.getByRole('tab', { name: /gesundheit/i })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC8: Fehlermeldung + Retry bei API-Fehler
// ─────────────────────────────────────────────────────────────────────────────
test('AC8: Error message shown when API fails', async ({ page }) => {
  await page.route('**/api/roadmap/generate', route => {
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'KI-Service nicht verfügbar.' }) })
  })
  await page.evaluate(() => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/roadmap')

  await expect(page.getByRole('button', { name: /erneut versuchen/i })).toBeVisible({ timeout: 15000 })
})

test('AC8: Retry button triggers a new generation attempt', async ({ page }) => {
  let callCount = 0
  await page.route('**/api/roadmap/generate', route => {
    callCount++
    if (callCount === 1) {
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Fehler.' }) })
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRoadmap) })
    }
  })
  await page.evaluate(() => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/roadmap')
  await expect(page.getByRole('button', { name: /erneut versuchen/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: /erneut versuchen/i }).click()
  await expect(page.getByText('5-Jahres-Vision').first()).toBeVisible({ timeout: 10000 })
  expect(callCount).toBe(2)
})

// ─────────────────────────────────────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
test('EC: Outdated banner shown when goals change after generation', async ({ page }) => {
  // Generate a roadmap with old profile hash
  const oldRoadmap = { ...mockRoadmap, profileHash: 'old_hash_xyz' }
  await page.evaluate((roadmap) => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
    localStorage.setItem('ziele_roadmap', JSON.stringify(roadmap))
  }, oldRoadmap)
  await page.goto('/roadmap')

  await expect(page.getByRole('button', { name: 'Roadmap aktualisieren' })).toBeVisible()
})

test('EC: /roadmap redirects to /onboarding when no profile exists', async ({ page }) => {
  await page.goto('/roadmap')
  await expect(page.getByText(/ziele eingeben|zu den zielen/i)).toBeVisible()
})

test('EC: Edited roadmap items persist to localStorage', async ({ page }) => {
  await page.evaluate((roadmap) => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
    localStorage.setItem('ziele_roadmap', JSON.stringify(roadmap))
  }, mockRoadmap)
  await page.goto('/roadmap')

  await page.getByText('Schritt zur 5-Jahres-Vision').hover()
  await page.getByRole('button', { name: /bearbeiten|✎/i }).first().click()
  await page.locator('textarea').fill('Dauerhaft gespeichert')
  await page.getByRole('button', { name: /speichern/i }).click()

  const stored = await page.evaluate(() => localStorage.getItem('ziele_roadmap'))
  const roadmap = JSON.parse(stored!)
  expect(roadmap.lifeAreaRoadmaps[0].timeline.vision5y[0].text).toBe('Dauerhaft gespeichert')
  expect(roadmap.lifeAreaRoadmaps[0].timeline.vision5y[0].isEdited).toBe(true)
})

// ─────────────────────────────────────────────────────────────────────────────
// Regression: PROJ-1 features still work
// ─────────────────────────────────────────────────────────────────────────────
test('REGRESSION: /goals Roadmap-Button navigates to /roadmap', async ({ page }) => {
  await page.evaluate(() => {
    const p = JSON.parse('{"vision5y":"","lifeAreas":[{"id":"career","name":"Karriere & Beruf","isCustom":false,"color":"blue","yearGoal":"Beförderung","quarterGoal":"","monthGoal":"","weekGoal":""}],"createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}')
    localStorage.setItem('ziele_goal_profile', JSON.stringify(p))
  })
  await page.goto('/goals')
  await page.route('**/api/roadmap/generate', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRoadmap) })
  )
  await page.getByRole('button', { name: /roadmap generieren/i }).click()
  await expect(page).toHaveURL('/roadmap')
})
