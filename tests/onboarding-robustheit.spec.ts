import { test, expect } from '@playwright/test'

/**
 * Regressionstests zum Testuser-Fehler vom 08.06.2026.
 *
 * Ursache war eine falsche Sprachdeklaration: <html lang="en"> bei deutschem
 * Inhalt liess Chrome die Seite automatisch uebersetzen. Der Uebersetzer tauscht
 * Textknoten im DOM aus, React fand sie beim naechsten Render nicht wieder und
 * warf "NotFoundError: Failed to execute 'removeChild' on 'Node'". Der React-Baum
 * montierte neu — zurueck auf Schritt 1, alle Eingaben verloren.
 */

const STORAGE_KEY = 'ziele_goal_profile'

test('html lang ist deutsch — sonst uebersetzt Chrome und React stuerzt ab', async ({ page }) => {
  await page.goto('/onboarding')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
})

test('Onboarding mit 5 Lebensbereichen laeuft ohne Fehler bis zur Zusammenfassung', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(`${e.name}: ${e.message}`))

  await page.goto('/onboarding')
  await page.getByRole('button', { name: /Überspringen|Weiter/ }).click()

  // alle vier Standardbereiche plus einen eigenen (zwei sind vorausgewaehlt)
  for (const name of ['Finanzen', 'Beziehungen & Familie']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await page.getByPlaceholder(/Eigener Bereich/).fill('Freunde')
  await page.getByRole('button', { name: 'Hinzufügen' }).click()
  await page.getByRole('button', { name: /Weiter/ }).click()

  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(5)
  for (let i = 0; i < 5; i++) {
    await tabs.nth(i).click()
    await page.locator('[role=tabpanel]:visible textarea').first().fill(`Jahresziel ${i + 1}`)
  }

  await page.getByRole('button', { name: /Weiter/ }).click()
  await expect(page.getByRole('heading', { name: 'Zusammenfassung' })).toBeVisible()
  expect(errors).toEqual([])
})

test('Speichern funktioniert auch wenn Supabase nicht erreichbar ist', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`${e.name}: ${e.message}`))
  await page.route('**/*supabase*/**', (route) => route.abort('failed'))

  await page.goto('/onboarding')
  await page.getByRole('button', { name: /Überspringen|Weiter/ }).click()
  await page.getByRole('button', { name: /Weiter/ }).click()

  const tabs = page.getByRole('tab')
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click()
    await page.locator('[role=tabpanel]:visible textarea').first().fill(`Jahresziel ${i + 1}`)
  }
  await page.getByRole('button', { name: /Weiter/ }).click()
  await page.getByRole('button', { name: /Ziele speichern/ }).click()

  // Der lokale Sicherungs-Schreibvorgang muss den Ausfall auffangen
  await page.waitForURL('**/goals')
  const stored = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)
  expect(stored).toBeTruthy()
  expect(errors).toEqual([])
})

test('Farbklassen aller Lebensbereiche werden von Tailwind erzeugt', async ({ page }) => {
  await page.goto('/onboarding')
  await page.getByRole('button', { name: /Überspringen|Weiter/ }).click()

  // "Beziehungen & Familie" nutzt rose — die Klasse existierte frueher nur in
  // src/lib/types.ts, das Tailwind nicht gescannt hat, und blieb daher farblos.
  const button = page.getByRole('button', { name: /Beziehungen & Familie/ })
  await button.click()
  await expect(button).toHaveClass(/bg-rose-50/)

  // Klasse gesetzt reicht nicht — sie muss auch im CSS-Bundle existieren
  await expect
    .poll(() => button.evaluate((el) => getComputedStyle(el).backgroundColor))
    .not.toBe('rgb(255, 255, 255)')
})
