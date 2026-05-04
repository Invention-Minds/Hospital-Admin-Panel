/// <reference types="jasmine" />
/**
 * Shared testing helpers for Angular specs.
 *
 * Two non-negotiables enforced here:
 *   1. Specs run against the test-only environment stub whose apiUrl points
 *      at an unreachable host. Any accidentally-unmocked HttpClient call
 *      explodes with a loud network error rather than silently hitting
 *      the real dev/prod API. (Frontend analogue of backend jest-setup's
 *      DATABASE_URL stomp.)
 *   2. `installHttpVerify()` — registers an `afterEach` that calls
 *      `HttpTestingController.verify()`. Pending HTTP requests fail the
 *      test so we catch "forgot to mock one of my N requests" bugs.
 *
 * Usage (service spec):
 *
 *   describe('FooService', () => {
 *     let service: FooService;
 *     let http: HttpTestingController;
 *
 *     beforeEach(() => {
 *       TestBed.configureTestingModule({
 *         imports: [HttpClientTestingModule],
 *         providers: [FooService, useTestEnvironment()],
 *       });
 *       service = TestBed.inject(FooService);
 *       http = TestBed.inject(HttpTestingController);
 *     });
 *
 *     // MUST be at describe scope, not inside beforeEach — Jasmine
 *     // disallows registering afterEach from within another hook.
 *     installHttpVerify(() => http);
 *
 *     it(...) { ... }
 *   });
 *
 * Usage (component spec): same shape; set `installHttpVerify` only if the
 * component issues HTTP itself. For pure presentation components, skip it.
 */

import { HttpTestingController } from '@angular/common/http/testing';
import { Provider } from '@angular/core';

/**
 * Test-only environment stub provider. Overrides any `environment` imports
 * via a literal constant. Import this symbol into specs that need it.
 */
export const TEST_API_URL = 'http://test-only-unreachable/no-real-api';

/**
 * Returns a DI override so services that read `environment.apiUrl` fall
 * through to the unreachable URL when injected with the right token.
 * For services that hard-import `environment` (most of the existing code
 * does), rely on the `TEST_API_URL` constant + manual expectation
 * matching — we can't override a static import.
 *
 * When new services are written using a proper `APP_CONFIG` InjectionToken,
 * extend this helper to provide the token.
 */
export function useTestEnvironment(): Provider[] {
  return [
    // Placeholder for future APP_CONFIG-style providers.
  ];
}

/**
 * Register an `afterEach` that fails the test if any HTTP request was
 * opened but never answered. Pass a getter (not the controller directly)
 * so each test can re-inject its own instance after TestBed reset.
 */
export function installHttpVerify(getController: () => HttpTestingController): void {
  afterEach(() => {
    const http = getController();
    http.verify();
  });
}
