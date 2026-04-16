import { test, expect, Page } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function clearAllStorage(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

// Seed a minimal goal profile to ensure /goals renders the full page (not the empty state)
async function seedProfile(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    const profile = {
      vision5y: 'Test-Vision',
      lifeAreas: [
        {
          id: 'career',
          name: 'Karriere & Beruf',
          isCustom: false,
          color: 'blue',
          yearGoal: 'Test-Jahresziel',
          quarterGoal: '',
          monthGoal: '',
          weekGoal: '',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    localStorage.setItem('ziele_goal_profile', JSON.stringify(profile))
  })
}

// Block ALL outgoing network calls to Supabase so the page never speaks to the backend.
// We only want to test UI / validation flows — not real auth.
async function blockSupabase(page: Page) {
  await page.route(/supabase\.co/, (route) => route.abort())
}

test.beforeEach(async ({ page }) => {
  await clearAllStorage(page)
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1: App ist vollständig ohne Login nutzbar
// ═════════════════════════════════════════════════════════════════════════════

test.describe('AC1: Guest usage (without login)', () => {
  test('AC1: /goals is reachable without login', async ({ page }) => {
    await page.goto('/goals')
    // Page loads without redirect
    await expect(page).toHaveURL(/\/goals$/)
  })

  test('AC1: /roadmap is reachable without login', async ({ page }) => {
    await page.goto('/roadmap')
    await expect(page).toHaveURL(/\/roadmap$/)
  })

  test('AC1: Onboarding flow works without login', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/onboarding$/)
  })

  test('AC1: Root path redirects to /goals or /onboarding (not /auth)', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/\/auth$/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2: "Anmelden"-Button in Nav-Bar auf /goals und /roadmap (nur wenn nicht eingeloggt)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('AC2: "Anmelden" button visible when not logged in', () => {
  test('AC2: Anmelden button appears on /goals page', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/goals')
    await expect(page.getByRole('button', { name: /^Anmelden$/ })).toBeVisible()
  })

  test('AC2: Anmelden button appears on /roadmap page', async ({ page }) => {
    await page.goto('/roadmap')
    await expect(page.getByRole('button', { name: /^Anmelden$/ })).toBeVisible()
  })

  test('AC2: Anmelden button navigates to /auth', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/goals')
    await page.getByRole('button', { name: /^Anmelden$/ }).click()
    await expect(page).toHaveURL(/\/auth/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3: /auth page with Login + Register tabs
// ═════════════════════════════════════════════════════════════════════════════

test.describe('AC3: /auth page with Tabs', () => {
  test('AC3: /auth page is publicly accessible', async ({ page }) => {
    await page.goto('/auth')
    await expect(page).toHaveURL(/\/auth$/)
  })

  test('AC3: Login and Register tabs are visible', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByRole('tab', { name: /Anmelden/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Registrieren/i })).toBeVisible()
  })

  test('AC3: Login tab is active by default', async ({ page }) => {
    await page.goto('/auth')
    // Login form should be visible — has 'Passwort vergessen?' link
    await expect(page.getByRole('button', { name: /Passwort vergessen/i })).toBeVisible()
  })

  test('AC3: Clicking Register tab switches form', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('tab', { name: /Registrieren/i }).click()
    // Register-only text is the "Mindestens 8 Zeichen" placeholder
    await expect(page.getByPlaceholder(/Mindestens 8 Zeichen/i)).toBeVisible()
  })

  test('AC3: "Weiter ohne Login" link exists and leads to /goals', async ({ page }) => {
    await page.goto('/auth')
    const link = page.getByRole('link', { name: /Weiter ohne Login/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/goals')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4: Registration form validation
// ═════════════════════════════════════════════════════════════════════════════

test.describe('AC4: Registration form validation', () => {
  test('AC4: Email field requires type=email', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('tab', { name: /Registrieren/i }).click()
    const emailInput = page.locator('#reg-email')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('AC4: Password field requires type=password', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('tab', { name: /Registrieren/i }).click()
    const pwInput = page.locator('#reg-password')
    await expect(pwInput).toHaveAttribute('type', 'password')
    await expect(pwInput).toHaveAttribute('required', '')
  })

  test('AC4: Inline validation rejects password shorter than 8 chars', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('tab', { name: /Registrieren/i }).click()
    await page.locator('#reg-password').fill('short')
    await expect(page.getByText(/mindestens 8 Zeichen/i)).toBeVisible()
  })

  test('AC4: Inline error disappears when password is 8+ chars', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('tab', { name: /Registrieren/i }).click()
    await page.locator('#reg-password').fill('short')
    await expect(page.getByText(/mindestens 8 Zeichen/i)).toBeVisible()
    await page.locator('#reg-password').fill('longenough')
    await expect(page.getByText(/mindestens 8 Zeichen/i)).not.toBeVisible()
  })

  test('AC4: Submit blocked when password too short', async ({ page }) => {
    await blockSupabase(page)
    await page.goto('/auth')
    await page.getByRole('tab', { name: /Registrieren/i }).click()
    await page.locator('#reg-email').fill('test@example.com')
    await page.locator('#reg-password').fill('short')
    await page.getByRole('button', { name: /Konto erstellen/i }).click()
    // Still on /auth, form did not submit to Supabase
    await expect(page).toHaveURL(/\/auth/)
    await expect(page.getByText(/mindestens 8 Zeichen/i)).toBeVisible()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5: Login form validation + error mapping
// ═════════════════════════════════════════════════════════════════════════════

test.describe('AC5: Login form', () => {
  test('AC5: Login email field has required + type=email', async ({ page }) => {
    await page.goto('/auth')
    const emailInput = page.locator('#login-email')
    await expect(emailInput).toHaveAttribute('type', 'email')
    await expect(emailInput).toHaveAttribute('required', '')
  })

  test('AC5: Login with invalid credentials shows German error', async ({ page }) => {
    await page.goto('/auth')
    // The form will send a real (mis)login to Supabase — if backend reachable this
    // should fail with "E-Mail oder Passwort falsch."
    await page.locator('#login-email').fill('definitely-not-a-real-user@example.com')
    await page.locator('#login-password').fill('wrongpassword123')
    await page.getByRole('button', { name: /^Anmelden$/ }).click()
    // Either "E-Mail oder Passwort falsch" (expected) or rate-limit message
    await expect(
      page.getByText(/Passwort falsch|zu viele|rate limit/i)
    ).toBeVisible({ timeout: 15_000 })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6: Forgot Password flow
// ═════════════════════════════════════════════════════════════════════════════

test.describe('AC6: Forgot password flow', () => {
  test('AC6: Clicking "Passwort vergessen" opens forgot-password form', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('button', { name: /Passwort vergessen/i }).click()
    await expect(page.getByText(/Passwort zurücksetzen/i)).toBeVisible()
    await expect(page.locator('#forgot-email')).toBeVisible()
  })

  test('AC6: Login email carries over to forgot-password form', async ({ page }) => {
    await page.goto('/auth')
    await page.locator('#login-email').fill('carryover@example.com')
    await page.getByRole('button', { name: /Passwort vergessen/i }).click()
    await expect(page.locator('#forgot-email')).toHaveValue('carryover@example.com')
  })

  test('AC6: Back button returns to login tabs', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('button', { name: /Passwort vergessen/i }).click()
    await page.getByRole('button', { name: /Zurück zum Login/i }).click()
    await expect(page.getByRole('tab', { name: /Anmelden/i })).toBeVisible()
  })

  test('AC6: Submit with any email shows generic success (no enumeration)', async ({ page }) => {
    // Intercept the API call — we verify the UI shows the generic message
    await page.route('**/api/auth/reset-password', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    )
    await page.goto('/auth')
    await page.getByRole('button', { name: /Passwort vergessen/i }).click()
    await page.locator('#forgot-email').fill('anyemail@example.com')
    await page.getByRole('button', { name: /Reset-Link senden/i }).click()
    await expect(page.getByText(/E-Mail gesendet/i)).toBeVisible()
    // The success message never confirms the email exists
    await expect(page.getByText(/Wenn diese E-Mail-Adresse bei uns registriert ist/i)).toBeVisible()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC7: Password reset page
// ═════════════════════════════════════════════════════════════════════════════

test.describe('AC7: /auth/reset page', () => {
  test('AC7: Reset page shows "Link ungültig" when no token present', async ({ page }) => {
    await page.goto('/auth/reset')
    // After 2 seconds without a session → error state
    await expect(page.getByText(/Link ungültig/i)).toBeVisible({ timeout: 5_000 })
  })

  test('AC7: "Zurück zum Login" from error state navigates to /auth', async ({ page }) => {
    await page.goto('/auth/reset')
    await expect(page.getByText(/Link ungültig/i)).toBeVisible({ timeout: 5_000 })
    await page.getByRole('button', { name: /Zurück zum Login/i }).click()
    await expect(page).toHaveURL(/\/auth/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC8: LocalStorage migration behavior (non-logged-in path only)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('AC8: LocalStorage primary storage when logged out', () => {
  test('AC8: Goal profile saved to localStorage when not logged in', async ({ page }) => {
    await seedProfile(page)
    await page.reload()
    const stored = await page.evaluate(() => localStorage.getItem('ziele_goal_profile'))
    expect(stored).not.toBeNull()
  })

  test('AC8: Profile survives page reload (localStorage persistence)', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/goals')
    await page.reload()
    // Profile is still in localStorage
    const raw = await page.evaluate(() => localStorage.getItem('ziele_goal_profile'))
    expect(raw).toContain('Test-Vision')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Security: XSS, enumeration, token leaks
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Security audit', () => {
  test('SEC: XSS payload in login email is not executed', async ({ page }) => {
    const xssPayload = '<img src=x onerror="window.__xss=true">"><script>window.__xss=true</script>'
    await page.goto('/auth')
    await page.locator('#login-email').fill(xssPayload)
    await page.locator('#login-password').fill('somepassword')
    // Don't submit — just ensure the payload in DOM is escaped
    const inputValue = await page.locator('#login-email').inputValue()
    expect(inputValue).toBe(xssPayload)
    const xssFlag = await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)
    expect(xssFlag).toBeUndefined()
  })

  test('SEC: XSS payload in register email is not executed', async ({ page }) => {
    const xssPayload = '<script>window.__xss2=true</script>'
    await page.goto('/auth')
    await page.getByRole('tab', { name: /Registrieren/i }).click()
    await page.locator('#reg-email').fill(xssPayload)
    await page.locator('#reg-password').fill('longpassword')
    const xssFlag = await page.evaluate(() => (window as unknown as { __xss2?: boolean }).__xss2)
    expect(xssFlag).toBeUndefined()
  })

  test('SEC: Password reset API does not reveal whether email is registered', async ({ page }) => {
    // Intercept fetch to /api/auth/reset-password — then directly call it from the page
    await page.goto('/auth')

    // Call the endpoint twice with (likely) different emails; response must be identical
    const responses = await page.evaluate(async () => {
      const a = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent-fake-1@example.com' }),
      })
      const b = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent-fake-2@example.com' }),
      })
      return {
        statusA: a.status,
        statusB: b.status,
        bodyA: await a.json(),
        bodyB: await b.json(),
      }
    })

    expect(responses.statusA).toBe(responses.statusB)
    expect(JSON.stringify(responses.bodyA)).toBe(JSON.stringify(responses.bodyB))
  })

  test('SEC: Password reset API rejects invalid email format', async ({ page }) => {
    await page.goto('/auth')
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email' }),
      })
      return { status: r.status, body: await r.json() }
    })
    expect(result.status).toBe(400)
    expect(result.body.error).toBeTruthy()
  })

  test('SEC: Password reset API rejects malformed JSON', async ({ page }) => {
    await page.goto('/auth')
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {{{',
      })
      return { status: r.status, body: await r.json() }
    })
    expect(result.status).toBe(400)
  })

  test('SEC: Password reset API rejects missing email field', async ({ page }) => {
    await page.goto('/auth')
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      return { status: r.status }
    })
    expect(result.status).toBe(400)
  })

  test('SEC: Password input is of type=password (masked)', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'password')
    await page.getByRole('tab', { name: /Registrieren/i }).click()
    await expect(page.locator('#reg-password')).toHaveAttribute('type', 'password')
  })

  test('SEC: Service role key is not exposed to the browser', async ({ page }) => {
    await page.goto('/auth')
    // Check the full HTML does not contain the service-role JWT marker "service_role"
    const html = await page.content()
    expect(html).not.toContain('service_role')
    // Also check window for any service role key leak
    const leak = await page.evaluate(() => {
      const entries = Object.entries(window as unknown as Record<string, unknown>)
      return entries.some(([, v]) => typeof v === 'string' && v.includes('service_role'))
    })
    expect(leak).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Responsive design
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Responsive design', () => {
  test('Responsive: /auth renders on mobile 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/auth')
    await expect(page.getByRole('tab', { name: /Anmelden/i })).toBeVisible()
    await expect(page.locator('#login-email')).toBeVisible()
  })

  test('Responsive: /auth renders on tablet 768px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/auth')
    await expect(page.getByRole('tab', { name: /Anmelden/i })).toBeVisible()
  })

  test('Responsive: /auth renders on desktop 1440px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/auth')
    await expect(page.getByRole('tab', { name: /Anmelden/i })).toBeVisible()
  })

  test('Responsive: UserAuthButton visible on mobile /goals', async ({ page }) => {
    await seedProfile(page)
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/goals')
    await expect(page.getByRole('button', { name: /^Anmelden$/ })).toBeVisible()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Regression: existing features still work (PROJ-1..4)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('Regression (existing features)', () => {
  test('Regression: /onboarding still works without any auth', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/onboarding$/)
    // Step 1 of onboarding visible
    await expect(page.getByRole('button', { name: /weiter|überspringen/i }).first()).toBeVisible()
  })

  test('Regression: /goals shows empty-state button when no profile', async ({ page }) => {
    await page.goto('/goals')
    await expect(page.getByRole('button', { name: /Jetzt starten/i })).toBeVisible()
  })

  test('Regression: /roadmap still accessible', async ({ page }) => {
    await page.goto('/roadmap')
    await expect(page).toHaveURL(/\/roadmap$/)
  })
})
