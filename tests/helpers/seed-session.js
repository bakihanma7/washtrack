/* ==========================================================
   Shared Playwright test helpers for the auth/role-gating layer
   added in the Platform & Access milestone. Every page in the app
   now requires an active session, so specs that used to load
   straight into the dashboard need a seeded session first.

   These functions are passed directly to page.addInitScript(),
   which serializes them via toString() and runs them in the
   browser context — so they must be fully self-contained (no
   references to anything outside their own body).
   ========================================================== */

/* Seeds one admin account + an active session for it, WITHOUT
   touching any other localStorage keys. Safe to use even on
   reload/every-navigation re-runs (addInitScript fires on each
   one) since it's idempotent and doesn't clear app data. */
function seedAuthenticatedSession() {
  var account = {
    id: 'u001',
    name: 'Test Admin',
    email: 'test-admin@washtrackpro.test',
    passwordHash: 'not-a-real-hash-test-only',
    role: 'admin',
    initials: 'TA',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem('washtrackpro:accounts:v1', JSON.stringify([account]));
  localStorage.setItem('washtrackpro:session:v1', account.id);
}

/* Clears all app storage first (fresh dashboard/customer/job data
   next load), then seeds the same admin session. Use in place of
   the old `() => localStorage.clear()` init scripts. */
function clearAndSeedSession() {
  localStorage.clear();
  var account = {
    id: 'u001',
    name: 'Test Admin',
    email: 'test-admin@washtrackpro.test',
    passwordHash: 'not-a-real-hash-test-only',
    role: 'admin',
    initials: 'TA',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem('washtrackpro:accounts:v1', JSON.stringify([account]));
  localStorage.setItem('washtrackpro:session:v1', account.id);
}

module.exports = { seedAuthenticatedSession, clearAndSeedSession };
