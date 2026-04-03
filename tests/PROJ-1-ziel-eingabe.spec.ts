import { test, expect } from '@playwright/test'

// Helper: clear localStorage before each test
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1: Nutzer kann Lebensbereiche auswählen (Vorgaben vorhanden)
// ─────────────────────────────────────────────────────────────────────────────
test('AC1: Predefined life areas are shown and selectable on step 2', async ({ page }) => {
  await page.goto('/onboarding')
  // Navigate to step 2
  await page.getByRole('button', { name: /weiter|überspringen/i }).click()

  await expect(page.getByText('Karriere & Beruf')).toBeVisible()
  await expect(page.getByText('Gesundheit & Fitness')).toBeVisible()
  await expect(page.getByText('Finanzen')).toBeVisible()
  await expect(page.getByText('Beziehungen & Familie')).toBeVisible()
})

test('AC1: User can toggle predefined life areas on/off', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /weiter|überspringen/i }).click()

  // Finanzen is not selected by default – click to activate
  await page.getByText('Finanzen').click()
  // Should now show active styling (area is toggled)
  // Click again to deactivate (only if > 1 selected)
  await page.getByText('Finanzen').click()
  // Should still work without errors (min 1 enforced client-side)
  await expect(page.getByText('Finanzen')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2: Nutzer kann eigene Lebensbereiche hinzufügen
// ─────────────────────────────────────────────────────────────────────────────
test('AC2: User can add a custom life area', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /weiter|überspringen/i }).click()

  await page.getByPlaceholder(/eigener bereich/i).fill('Spiritualität')
  await page.getByRole('button', { name: /hinzufügen/i }).click()

  await expect(page.getByText('Spiritualität')).toBeVisible()
})

test('AC2: Custom area appears in goal input tabs on step 3', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /weiter|überspringen/i }).click()

  await page.getByPlaceholder(/eigener bereich/i).fill('Sport & Bewegung')
  await page.getByRole('button', { name: /hinzufügen/i }).click()
  await page.getByRole('button', { name: /weiter/i }).click()

  await expect(page.getByText('Sport & Bewegung')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3: Alle 4 Ziel-Felder ausfüllbar (Jahresziel Pflicht, Rest optional)
// ─────────────────────────────────────────────────────────────────────────────
test('AC3: All 4 goal fields are present on step 3', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /weiter|überspringen/i }).click()
  await page.getByRole('button', { name: /weiter/i }).click()

  // Use first() to avoid strict-mode errors when multiple tabs have the same labels
  await expect(page.getByText('Jahresziel').first()).toBeVisible()
  await expect(page.getByText('Quartalsziel').first()).toBeVisible()
  await expect(page.getByText('Monatsziel').first()).toBeVisible()
  await expect(page.getByText('Wochenziel').first()).toBeVisible()
})

test('AC3: User can fill in all 4 goal fields', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /weiter|überspringen/i }).click()
  await page.getByRole('button', { name: /weiter/i }).click()

  const textareas = page.locator('textarea')
  await textareas.first().fill('Beförderung erreichen')
  await textareas.nth(1).fill('Projekt abschließen')
  await textareas.nth(2).fill('Präsentation vorbereiten')
  await textareas.nth(3).fill('Meeting vorbereiten')

  await expect(textareas.first()).toHaveValue('Beförderung erreichen')
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4: 5-Jahres-Vision eingeben (step 1)
// ─────────────────────────────────────────────────────────────────────────────
test('AC4: User can enter 5-year vision on step 1', async ({ page }) => {
  await page.goto('/onboarding')

  const textarea = page.locator('textarea')
  await textarea.fill('In 5 Jahren bin ich selbstständig und arbeite von überall.')
  await expect(textarea).toHaveValue('In 5 Jahren bin ich selbstständig und arbeite von überall.')
})

test('AC4: Step 1 can be skipped without filling the vision', async ({ page }) => {
  await page.goto('/onboarding')
  // Button says "Überspringen" when vision is empty
  await expect(page.getByRole('button', { name: /überspringen/i })).toBeVisible()
  await page.getByRole('button', { name: /überspringen/i }).click()
  // Should be on step 2
  await expect(page.getByText('Lebensbereiche')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC5: Pflichtfeld-Validierung – Jahresziel erforderlich
// ─────────────────────────────────────────────────────────────────────────────
test('AC5: Cannot proceed from step 3 without filling Jahresziel', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /weiter|überspringen/i }).click()
  await page.getByRole('button', { name: /weiter/i }).click()

  // Don't fill Jahresziel – click Weiter
  await page.getByRole('button', { name: /weiter/i }).click()

  // Error message should appear
  await expect(page.getByText(/jahresziel ist erforderlich/i)).toBeVisible()
})

test('AC5: Error clears when user fills in Jahresziel and proceeds', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /weiter|überspringen/i }).click()
  await page.getByRole('button', { name: /weiter/i }).click()

  // Trigger error
  await page.getByRole('button', { name: /weiter/i }).click()
  await expect(page.getByText(/jahresziel ist erforderlich/i)).toBeVisible()

  // Fill and proceed
  await page.locator('textarea').first().fill('Mein Jahresziel')
  // also fill second life area if present
  const tabs = page.locator('[role="tab"]')
  const tabCount = await tabs.count()
  for (let i = 1; i < tabCount; i++) {
    await tabs.nth(i).click()
    await page.locator('textarea').first().fill('Weiteres Jahresziel')
  }
  await page.getByRole('button', { name: /weiter/i }).click()

  // Should advance to step 4
  await expect(page.getByText(/zusammenfassung/i)).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC6: Daten werden in localStorage gespeichert
// ─────────────────────────────────────────────────────────────────────────────
test('AC6: Profile is saved to localStorage after finishing onboarding', async ({ page }) => {
  await page.goto('/onboarding')
  // Step 1: skip vision
  await page.getByRole('button', { name: /überspringen/i }).click()
  // Step 2: proceed with defaults
  await page.getByRole('button', { name: /weiter/i }).click()
  // Step 3: fill Jahresziele for both default areas
  const tabs = page.locator('[role="tab"]')
  const tabCount = await tabs.count()
  for (let i = 0; i < tabCount; i++) {
    await tabs.nth(i).click()
    await page.locator('textarea').first().fill(`Jahresziel ${i + 1}`)
  }
  await page.getByRole('button', { name: /weiter/i }).click()
  // Step 4: save
  await page.getByRole('button', { name: /speichern/i }).click()

  // Should redirect to /goals
  await expect(page).toHaveURL('/goals')

  // Check localStorage
  const stored = await page.evaluate(() => localStorage.getItem('ziele_goal_profile'))
  expect(stored).not.toBeNull()
  const profile = JSON.parse(stored!)
  expect(profile.lifeAreas.length).toBeGreaterThan(0)
})

test('AC6: Data survives page reload (localStorage restoration)', async ({ page }) => {
  // Save a profile first
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /überspringen/i }).click()
  await page.getByRole('button', { name: /weiter/i }).click()
  const tabs = page.locator('[role="tab"]')
  const tabCount = await tabs.count()
  for (let i = 0; i < tabCount; i++) {
    await tabs.nth(i).click()
    await page.locator('textarea').first().fill(`Jahresziel ${i + 1}`)
  }
  await page.getByRole('button', { name: /weiter/i }).click()
  await page.getByRole('button', { name: /speichern/i }).click()
  await expect(page).toHaveURL('/goals')

  // Reload
  await page.reload()
  // Should still be on /goals (not redirected to onboarding)
  await expect(page).toHaveURL('/goals')
  // Data should still be visible
  await expect(page.getByText('Meine Ziele')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC7: Formular in < 3 Minuten ausfüllbar (UX check – all steps accessible)
// ─────────────────────────────────────────────────────────────────────────────
test('AC7: All 4 wizard steps are reachable and show correct content', async ({ page }) => {
  await page.goto('/onboarding')
  // Step 1
  await expect(page.getByText('Schritt 1 von 4')).toBeVisible()
  await expect(page.getByText(/große Vision/i)).toBeVisible()

  await page.getByRole('button', { name: /überspringen/i }).click()
  // Step 2
  await expect(page.getByText('Schritt 2 von 4')).toBeVisible()
  await expect(page.getByText(/lebensbereiche/i)).toBeVisible()

  await page.getByRole('button', { name: /weiter/i }).click()
  // Step 3
  await expect(page.getByText('Schritt 3 von 4')).toBeVisible()
  const tabs = page.locator('[role="tab"]')
  const tabCount = await tabs.count()
  for (let i = 0; i < tabCount; i++) {
    await tabs.nth(i).click()
    await page.locator('textarea').first().fill('Test Jahresziel')
  }
  await page.getByRole('button', { name: /weiter/i }).click()
  // Step 4
  await expect(page.getByText('Schritt 4 von 4')).toBeVisible()
  await expect(page.getByText(/zusammenfassung/i)).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// AC8: Zusammenfassung auf Schritt 4
// ─────────────────────────────────────────────────────────────────────────────
test('AC8: Step 4 shows summary with entered goal data', async ({ page }) => {
  await page.goto('/onboarding')
  await page.locator('textarea').fill('Meine große 5-Jahres-Vision')
  await page.getByRole('button', { name: /weiter/i }).click()
  await page.getByRole('button', { name: /weiter/i }).click()

  const tabs = page.locator('[role="tab"]')
  const tabCount = await tabs.count()
  for (let i = 0; i < tabCount; i++) {
    await tabs.nth(i).click()
    await page.locator('textarea').first().fill('Führungsposition erreichen')
  }
  await page.getByRole('button', { name: /weiter/i }).click()

  // Summary should show the vision and goal (first() handles multiple life areas showing same goal)
  await expect(page.getByText('Meine große 5-Jahres-Vision')).toBeVisible()
  await expect(page.getByText('Führungsposition erreichen').first()).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Edge Case: Max 8 life areas
// ─────────────────────────────────────────────────────────────────────────────
test('EC: Cannot add more than 8 life areas', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /überspringen/i }).click()

  // Activate all 4 defaults
  for (const name of ['Finanzen', 'Beziehungen & Familie']) {
    await page.getByText(name).click()
  }

  // Add 4 custom areas to reach 8
  for (let i = 1; i <= 4; i++) {
    await page.getByPlaceholder(/eigener bereich/i).fill(`Bereich ${i}`)
    await page.getByRole('button', { name: /hinzufügen/i }).click()
  }

  // Max reached – add input should be hidden
  await expect(page.getByText(/maximum von 8/i)).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Edge Case: Back navigation clears errors
// ─────────────────────────────────────────────────────────────────────────────
test('EC: Going back from step 3 clears validation errors', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /überspringen/i }).click()
  await page.getByRole('button', { name: /weiter/i }).click()

  // Trigger error
  await page.getByRole('button', { name: /weiter/i }).click()
  await expect(page.getByText(/jahresziel ist erforderlich/i)).toBeVisible()

  // Go back
  await page.getByRole('button', { name: /zurück/i }).click()
  // Go forward again
  await page.getByRole('button', { name: /weiter/i }).click()

  // Error should be gone (not carried over)
  await expect(page.getByText(/jahresziel ist erforderlich/i)).not.toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Landing page redirects existing users to /goals
// ─────────────────────────────────────────────────────────────────────────────
test('Landing page redirects to /goals if profile exists in localStorage', async ({ page }) => {
  // Seed localStorage
  await page.goto('/')
  await page.evaluate(() => {
    const profile = {
      vision5y: 'Test Vision',
      lifeAreas: [{ id: 'career', name: 'Karriere', isCustom: false, color: 'blue', yearGoal: 'Ziel', quarterGoal: '', monthGoal: '', weekGoal: '' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem('ziele_goal_profile', JSON.stringify(profile))
  })
  await page.reload()
  await expect(page).toHaveURL('/goals')
})

// ─────────────────────────────────────────────────────────────────────────────
// /goals page: auto-save and life area management
// ─────────────────────────────────────────────────────────────────────────────
test('Goals page shows Jahresziel, Quartalsziel, Monatsziel, Wochenziel fields', async ({ page }) => {
  // Seed with a profile
  await page.goto('/')
  await page.evaluate(() => {
    const profile = {
      vision5y: '',
      lifeAreas: [{ id: 'career', name: 'Karriere & Beruf', isCustom: false, color: 'blue', yearGoal: 'Test', quarterGoal: '', monthGoal: '', weekGoal: '' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem('ziele_goal_profile', JSON.stringify(profile))
  })
  await page.goto('/goals')

  await expect(page.getByText('Jahresziel')).toBeVisible()
  await expect(page.getByText('Quartalsziel')).toBeVisible()
  await expect(page.getByText('Monatsziel')).toBeVisible()
  await expect(page.getByText('Wochenziel')).toBeVisible()
})

test('Goals page auto-saves changes to localStorage', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    const profile = {
      vision5y: '',
      lifeAreas: [{ id: 'career', name: 'Karriere & Beruf', isCustom: false, color: 'blue', yearGoal: 'Alt', quarterGoal: '', monthGoal: '', weekGoal: '' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem('ziele_goal_profile', JSON.stringify(profile))
  })
  await page.goto('/goals')

  // The first textarea on /goals is vision5y; yearGoal is the second textarea (inside the Card)
  // Use label to target the yearGoal field specifically
  const yearGoalLabel = page.getByText('Jahresziel').first()
  const yearGoalTextarea = page.locator('textarea').nth(1) // vision5y is nth(0)
  await yearGoalTextarea.fill('Neu gespeichertes Jahresziel')

  // Trigger blur to ensure onChange fires
  await yearGoalLabel.click()

  // Check localStorage was updated
  await page.waitForTimeout(300)
  const stored = await page.evaluate(() => localStorage.getItem('ziele_goal_profile'))
  const parsed = JSON.parse(stored!)
  expect(parsed.lifeAreas[0].yearGoal).toBe('Neu gespeichertes Jahresziel')
})
