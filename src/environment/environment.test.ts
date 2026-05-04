/**
 * Test-only environment stub.
 *
 * Frontend equivalent of the backend's `DATABASE_URL` stomp in
 * `jest-setup.ts`. Tests that accidentally make a real HTTP request will
 * hit an unreachable URL — so the request fails fast instead of silently
 * hitting the real dev/prod API.
 *
 * Tests should import this via `shared/testing/test-utils.ts` rather
 * than importing `environment.ts` / `environment.prod.ts` directly.
 */
export const environment = {
  production: false,
  apiUrl: 'http://test-only-unreachable/no-real-api',
  filesUrl: 'http://test-only-unreachable',
};
