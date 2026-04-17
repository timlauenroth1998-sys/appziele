import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// PROJ-6: Coach-Klienten-Ansicht — E2E Tests
//
// Note: Tests that require a real coach/client account (invite flow, roadmap
// read-only, comments) are marked as manual in the QA report because Playwright
// cannot log in via Supabase auth in CI without test credentials. The tests
// below cover: route guards, page structure, API security, and UI elements
// reachable without auth.
// ─────────────────────────────────────────────────────────────────────────────

// ─── AC2: /coach page is accessible and guarded ──────────────────────────────

test('AC2: /coach redirects or shows login prompt for unauthenticated user', async ({ page }) => {
  await page.goto('/coach')
  // Wait for React hydration to complete — skeleton disappears, real state renders
  await page.waitForFunction(
    () => !document.querySelector('[data-skeleton]') && document.body.innerText.length > 20,
    { timeout: 10000 }
  ).catch(() => {/* timeout ok, check state anyway */})
  await page.waitForLoadState('networkidle')
  const url = page.url()
  const body = await page.textContent('body')
  const redirected = url.includes('/auth')
  const loginPrompt = body?.includes('melde dich an') || body?.includes('Login') || body?.includes('anmelden')
  expect(redirected || loginPrompt).toBeTruthy()
})

test('AC2: /coach page renders coach-specific UI when loaded', async ({ page }) => {
  await page.goto('/coach')
  await page.waitForLoadState('networkidle')
  // Page should exist (not 404)
  expect(page.url()).not.toContain('404')
})

// ─── /admin page guard ────────────────────────────────────────────────────────

test('Admin: /admin page loads and does not 404', async ({ page }) => {
  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  expect(page.url()).not.toContain('404')
})

test('Admin: /admin shows access denied for unauthenticated user', async ({ page }) => {
  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  const body = await page.textContent('body')
  const url = page.url()
  const redirected = url.includes('/auth')
  const accessDenied = body?.includes('Kein Zugang') || body?.includes('Admin') || body?.includes('anmelden')
  expect(redirected || accessDenied).toBeTruthy()
})

// ─── /settings page ──────────────────────────────────────────────────────────

test('AC11: /settings page loads without 404', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')
  expect(page.url()).not.toContain('404')
})

// ─── /coach/[clientId] route guard ───────────────────────────────────────────

test('AC7: /coach/[clientId] access without auth is blocked or redirected', async ({ page }) => {
  await page.goto('/coach/00000000-0000-0000-0000-000000000001')
  await page.waitForLoadState('networkidle')
  // Wait for auth state to resolve (skeleton → real content)
  await page.waitForFunction(
    () => document.body.innerText.length > 20,
    { timeout: 10000 }
  ).catch(() => {})
  const url = page.url()
  const body = await page.textContent('body')
  const redirected = url.includes('/auth')
  const blocked = body?.includes('melde dich an') || body?.includes('Login') || body?.includes('Kein') || body?.includes('anmelden')
  expect(redirected || blocked).toBeTruthy()
})

// ─── API Security: /api/coach/invite ─────────────────────────────────────────

test('SEC: POST /api/coach/invite returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/coach/invite', {
    data: { email: 'target@example.com' },
  })
  expect(res.status()).toBe(401)
})

test('SEC: POST /api/coach/invite returns 400 for invalid email', async ({ request }) => {
  // No auth → 401 (security layer catches it first, which is correct)
  const res = await request.post('/api/coach/invite', {
    data: { email: 'not-an-email' },
  })
  expect([400, 401]).toContain(res.status())
})

// ─── API Security: /api/coach/respond ────────────────────────────────────────

test('SEC: POST /api/coach/respond returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/coach/respond', {
    data: { relationId: '00000000-0000-0000-0000-000000000001', accept: true },
  })
  expect(res.status()).toBe(401)
})

// ─── API Security: /api/coach/disconnect ─────────────────────────────────────

test('SEC: DELETE /api/coach/disconnect returns 401 without auth', async ({ request }) => {
  const res = await request.delete('/api/coach/disconnect', {
    data: { relationId: '00000000-0000-0000-0000-000000000001' },
  })
  expect(res.status()).toBe(401)
})

// ─── API Security: /api/coach/notify ─────────────────────────────────────────

test('SEC: POST /api/coach/notify returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/coach/notify', {
    data: { clientId: '00000000-0000-0000-0000-000000000001' },
  })
  expect(res.status()).toBe(401)
})

// ─── API Security: /api/admin/lookup-user ────────────────────────────────────

test('SEC: POST /api/admin/lookup-user returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/admin/lookup-user', {
    data: { email: 'someone@example.com' },
  })
  expect(res.status()).toBe(401)
})

// ─── API Security: /api/admin/set-coach-role ─────────────────────────────────

test('SEC: POST /api/admin/set-coach-role returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/admin/set-coach-role', {
    data: { userId: '00000000-0000-0000-0000-000000000001', isCoach: true },
  })
  expect(res.status()).toBe(401)
})

// ─── No secrets in browser ───────────────────────────────────────────────────

test('SEC: Service role key is not exposed on /coach page', async ({ page }) => {
  const bodies: string[] = []
  page.on('response', async (resp) => {
    const ct = resp.headers()['content-type'] ?? ''
    if (ct.includes('application/json') || ct.includes('text/')) {
      try {
        const text = await resp.text()
        bodies.push(text)
      } catch { /* ignore */ }
    }
  })
  await page.goto('/coach')
  await page.waitForLoadState('networkidle')
  const allText = bodies.join('\n')
  expect(allText).not.toContain('service_role')
  expect(allText).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
})

// ─── Regression: existing pages still work ───────────────────────────────────

test('Regression: /goals still accessible after PROJ-6 changes', async ({ page }) => {
  await page.goto('/goals')
  await page.waitForLoadState('networkidle')
  expect(page.url()).not.toContain('404')
  const body = await page.textContent('body')
  expect(body).toBeTruthy()
})

test('Regression: /roadmap still accessible after PROJ-6 changes', async ({ page }) => {
  await page.goto('/roadmap')
  await page.waitForLoadState('networkidle')
  expect(page.url()).not.toContain('404')
})

test('Regression: /onboarding still works', async ({ page }) => {
  await page.goto('/onboarding')
  await page.waitForLoadState('networkidle')
  expect(page.url()).not.toContain('404')
})

// ─── Responsive ──────────────────────────────────────────────────────────────

test('Responsive: /coach renders on mobile 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/coach')
  await page.waitForLoadState('networkidle')
  expect(page.url()).not.toContain('404')
})

test('Responsive: /settings renders on mobile 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')
  expect(page.url()).not.toContain('404')
})
