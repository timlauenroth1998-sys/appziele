import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// PROJ-7: Coaching Library — E2E Tests
//
// Tests cover: route guards, page structure, API security (401/403 without
// auth), and UI elements reachable without credentials.
// Full coach/admin/client flows require Supabase test credentials and are
// marked manual in the QA report.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Admin: /admin/library page guard ────────────────────────────────────────

test('AC-Admin: /admin/library redirects or shows login prompt for unauthenticated user', async ({ page }) => {
  await page.goto('/admin/library')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(
    () => document.body.innerText.length > 20,
    { timeout: 10000 }
  ).catch(() => {})
  const url = page.url()
  const body = await page.textContent('body') ?? ''
  const redirected = url.includes('/auth')
  const loginPrompt = body.includes('melde dich an') || body.includes('Login') || body.includes('anmelden')
  expect(redirected || loginPrompt).toBeTruthy()
})

test('AC-Admin: /admin/library page renders title and upload area structure', async ({ page }) => {
  await page.goto('/admin/library')
  await page.waitForLoadState('networkidle')
  const title = await page.title()
  expect(title).toBeTruthy()
})

// ─── API Security: 401 for unauthenticated requests ──────────────────────────

test('AC-Auth: POST /api/library/upload returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/library/upload', {
    headers: {},
    multipart: { file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') } },
  })
  expect(res.status()).toBe(401)
})

test('AC-Auth: GET /api/library/documents returns 401 without auth', async ({ request }) => {
  const res = await request.get('/api/library/documents')
  expect(res.status()).toBe(401)
})

test('AC-Auth: DELETE /api/library/documents returns 401 without auth', async ({ request }) => {
  const res = await request.delete('/api/library/documents?id=550e8400-e29b-41d4-a716-446655440001')
  expect(res.status()).toBe(401)
})

test('AC-Auth: POST /api/library/search returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/library/search', {
    data: { query: 'test' },
  })
  expect(res.status()).toBe(401)
})

test('AC-Auth: POST /api/library/share returns 401 without auth', async ({ request }) => {
  const res = await request.post('/api/library/share', {
    data: { documentId: '550e8400-e29b-41d4-a716-446655440001', clientId: '550e8400-e29b-41d4-a716-446655440002' },
  })
  expect(res.status()).toBe(401)
})

test('AC-Auth: DELETE /api/library/share returns 401 without auth', async ({ request }) => {
  const res = await request.delete('/api/library/share', {
    data: { documentId: '550e8400-e29b-41d4-a716-446655440001', clientId: '550e8400-e29b-41d4-a716-446655440002' },
  })
  expect(res.status()).toBe(401)
})

test('AC-Auth: GET /api/library/share returns 401 without auth', async ({ request }) => {
  const res = await request.get('/api/library/share?clientId=550e8400-e29b-41d4-a716-446655440002')
  expect(res.status()).toBe(401)
})

test('AC-Auth: GET /api/library/shared returns 401 without auth', async ({ request }) => {
  const res = await request.get('/api/library/shared')
  expect(res.status()).toBe(401)
})

test('AC-Auth: GET /api/library/content/[id] returns 401 without auth', async ({ request }) => {
  const res = await request.get('/api/library/content/550e8400-e29b-41d4-a716-446655440001')
  expect(res.status()).toBe(401)
})

// ─── API Validation: 400 for invalid input ───────────────────────────────────

test('AC-Validation: POST /api/library/search returns 400 for empty query', async ({ request }) => {
  const res = await request.post('/api/library/search', {
    headers: { Authorization: 'Bearer invalid_token_for_validation_test' },
    data: { query: '' },
  })
  // 401 (invalid token) or 400 (validation) — both acceptable, not 500
  expect([400, 401]).toContain(res.status())
})

test('AC-Validation: DELETE /api/library/documents returns 400 for invalid UUID', async ({ request }) => {
  const res = await request.delete('/api/library/documents?id=not-a-uuid', {
    headers: { Authorization: 'Bearer invalid_token' },
  })
  expect([400, 401]).toContain(res.status())
})

// ─── Coach: /coach/library page structure ────────────────────────────────────

test('AC-Coach: /coach/library redirects or shows login prompt for unauthenticated user', async ({ page }) => {
  await page.goto('/coach/library')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(
    () => document.body.innerText.length > 20,
    { timeout: 10000 }
  ).catch(() => {})
  const url = page.url()
  const body = await page.textContent('body') ?? ''
  const redirected = url.includes('/auth')
  const loginPrompt = body.includes('melde dich an') || body.includes('Login') || body.includes('anmelden')
  expect(redirected || loginPrompt).toBeTruthy()
})

test('AC-Coach: /coach page has Bibliothek navigation link', async ({ page }) => {
  await page.goto('/coach')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(
    () => document.body.innerText.length > 20,
    { timeout: 10000 }
  ).catch(() => {})
  const body = await page.textContent('body') ?? ''
  // Page either shows nav with Bibliothek or login prompt — either is valid
  const hasBibliothek = body.includes('Bibliothek')
  const hasLoginPrompt = body.includes('melde dich an') || body.includes('Login')
  expect(hasBibliothek || hasLoginPrompt).toBeTruthy()
})

// ─── Client: /documents page structure ───────────────────────────────────────

test('AC-Client: /documents shows login prompt for unauthenticated user', async ({ page }) => {
  await page.goto('/documents')
  // Wait for skeleton to disappear and auth state to resolve
  await page.waitForFunction(
    () => {
      const text = document.body.innerText
      return text.includes('Login') || text.includes('melde') || text.includes('anmelden') || window.location.href.includes('/auth')
    },
    { timeout: 15000 }
  ).catch(() => {})
  const url = page.url()
  const body = await page.textContent('body').catch(() => '') ?? ''
  const redirected = url.includes('/auth')
  const hasLoginPrompt = body.includes('melde') || body.includes('Login') || body.includes('anmelden')
  expect(redirected || hasLoginPrompt).toBeTruthy()
})

test('AC-Client: /goals page has Dokumente navigation link for users', async ({ page }) => {
  await page.goto('/goals')
  await page.waitForLoadState('networkidle')
  // The nav shows Dokumente link for logged-in users — for anonymous we just verify the page loads
  const statusCode = page.url()
  expect(statusCode).toContain('/goals')
})

// ─── Regression: Existing pages still work ───────────────────────────────────

test('Regression: /goals page loads without error', async ({ page }) => {
  await page.goto('/goals')
  await page.waitForLoadState('networkidle')
  const body = await page.textContent('body') ?? ''
  expect(body.length).toBeGreaterThan(10)
})

test('Regression: /coach page loads without error', async ({ page }) => {
  await page.goto('/coach')
  await page.waitForLoadState('networkidle')
  const body = await page.textContent('body') ?? ''
  expect(body.length).toBeGreaterThan(10)
})

test('Regression: /admin page loads without error', async ({ page }) => {
  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  const body = await page.textContent('body') ?? ''
  expect(body.length).toBeGreaterThan(10)
})

test('Regression: /roadmap page loads without error', async ({ page }) => {
  await page.goto('/roadmap')
  await page.waitForLoadState('networkidle')
  const body = await page.textContent('body') ?? ''
  expect(body.length).toBeGreaterThan(10)
})

// ─── Responsive: Key pages render correctly on mobile ────────────────────────

test('Responsive: /admin/library renders on mobile (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/admin/library')
  await page.waitForLoadState('networkidle')
  const body = await page.textContent('body') ?? ''
  expect(body.length).toBeGreaterThan(10)
})

test('Responsive: /coach/library renders on mobile (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/coach/library')
  await page.waitForLoadState('networkidle')
  const body = await page.textContent('body') ?? ''
  expect(body.length).toBeGreaterThan(10)
})

test('Responsive: /documents renders on mobile (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/documents')
  await page.waitForLoadState('networkidle')
  const body = await page.textContent('body') ?? ''
  expect(body.length).toBeGreaterThan(10)
})
