import { test, expect } from '@playwright/test'

const DRAFT_KEY = 'ziele_onboarding_draft'
const PROFILE_KEY = 'ziele_goal_profile'

async function fillVisionAndAdvance(page: import('@playwright/test').Page, vision: string) {
  await page.goto('/onboarding')
  await page.locator('textarea').first().fill(vision)
  await page.getByRole('button', { name: /Weiter/ }).click()
}

test('AC: Reload mitten im Wizard stellt Eingaben und Schritt wieder her', async ({ page }) => {
  const vision = 'In 5 Jahren führe ich mein eigenes Coaching-Unternehmen.'
  await fillVisionAndAdvance(page, vision)
  await page.getByRole('button', { name: /Weiter/ }).click() // -> Schritt 3

  await page.locator('[role=tabpanel]:visible textarea').first().fill('Drei Retainer-Kunden')
  await page.waitForTimeout(800) // verzoegertes Sichern abwarten

  await page.reload()

  await expect(page.getByText('Schritt 3 von 4')).toBeVisible()
  await expect(page.locator('[role=tabpanel]:visible textarea').first()).toHaveValue(
    'Drei Retainer-Kunden'
  )
  await expect(page.getByRole('status')).toContainText('Wir haben deinen Stand gesichert')

  await page.getByRole('button', { name: /Zurück/ }).click()
  await page.getByRole('button', { name: /Zurück/ }).click()
  await expect(page.locator('textarea').first()).toHaveValue(vision)
})

test('AC: Ohne Entwurf startet der Wizard leer und ohne Hinweis', async ({ page }) => {
  await page.goto('/onboarding')
  await expect(page.getByText('Schritt 1 von 4')).toBeVisible()
  await expect(page.locator('textarea').first()).toHaveValue('')
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('AC: "Neu beginnen" verwirft den Entwurf nach Rückfrage', async ({ page }) => {
  await fillVisionAndAdvance(page, 'Eine Vision, die gleich verworfen wird')
  await page.waitForTimeout(800)
  await page.reload()

  await expect(page.getByRole('status')).toBeVisible()
  await page.getByRole('button', { name: 'Neu beginnen' }).click()
  await page.getByRole('button', { name: 'Verwerfen' }).click()

  await expect(page.getByText('Schritt 1 von 4')).toBeVisible()
  await expect(page.locator('textarea').first()).toHaveValue('')
  expect(await page.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull()
})

test('AC: Abgelaufener Entwurf (älter als 30 Tage) wird ignoriert', async ({ page }) => {
  await page.goto('/onboarding')
  await page.evaluate(
    ({ key, iso }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          step: 3,
          vision5y: 'Uralter Entwurf',
          lifeAreas: [],
          updatedAt: iso,
        })
      )
    },
    { key: DRAFT_KEY, iso: new Date(Date.now() - 31 * 864e5).toISOString() }
  )

  await page.goto('/onboarding')
  await expect(page.getByText('Schritt 1 von 4')).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('AC: Beschädigter Entwurf führt nicht zum Absturz', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`${e.name}: ${e.message}`))

  await page.goto('/onboarding')
  await page.evaluate((k) => localStorage.setItem(k, '{ kaputt'), DRAFT_KEY)
  await page.goto('/onboarding')

  await expect(page.getByText('Schritt 1 von 4')).toBeVisible()
  expect(errors).toEqual([])
})

test('AC: Warnung erscheint, wenn bereits ein Zielprofil existiert', async ({ page }) => {
  await page.goto('/onboarding')
  await page.evaluate(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          vision5y: 'Bestehende Vision',
          lifeAreas: [
            {
              id: 'career',
              name: 'Karriere & Beruf',
              isCustom: false,
              color: 'blue',
              yearGoal: 'Bestehendes Ziel',
              quarterGoal: '',
              monthGoal: '',
              weekGoal: '',
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      )
    },
    { key: PROFILE_KEY }
  )

  await page.goto('/onboarding')
  // Next.js rendert einen eigenen unsichtbaren role=alert fuer Routenansagen,
  // deshalb ueber den Text eingrenzen statt ueber die Rolle allein.
  const warning = page.getByRole('alert').filter({ hasText: 'Du hast bereits Ziele definiert' })
  await expect(warning).toBeVisible()

  await warning.getByRole('button', { name: /Trotzdem neu starten/ }).click()
  await expect(warning).toHaveCount(0)
})

test('AC: Entwurf wird nach erfolgreichem Abschluss gelöscht', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /Überspringen|Weiter/ }).click()
  await page.getByRole('button', { name: /Weiter/ }).click()

  const tabs = page.getByRole('tab')
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click()
    await page.locator('[role=tabpanel]:visible textarea').first().fill(`Ziel ${i + 1}`)
  }
  await page.getByRole('button', { name: /Weiter/ }).click()
  await page.getByRole('button', { name: /Ziele speichern/ }).click()

  await page.waitForURL('**/goals')
  expect(await page.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull()
  expect(await page.evaluate((k) => localStorage.getItem(k), PROFILE_KEY)).toBeTruthy()
})
