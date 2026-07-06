import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthServiceService } from './services/auth/auth-service.service';

/**
 * Phase NS-5 — role/subAdminType route guard.
 *
 * Use alongside authGuard. Reads the allowed roles / subAdminTypes from the
 * route's `data`:
 *
 *   {
 *     path: 'nursing-stations',
 *     component: NursingStationAdminComponent,
 *     canActivate: [authGuard, roleGuard],
 *     data: { subAdminTypes: ['Nursing Superintendent'] },   // super_admin always allowed
 *   }
 *
 * super_admin passes unless `data.allowSuperAdmin === false`. On the server
 * (SSR) we return false so protected routes render only on the client — mirrors
 * authGuard. Mismatched users are redirected to /dashboard.
 *
 * This is defence-in-depth: the backend already enforces these permissions; the
 * guard just keeps the wrong user from loading a screen they can't use.
 */
export const roleGuard: CanActivateFn = (route) => {
  const router = inject(Router);

  if (typeof window === 'undefined') {
    return false;
  }

  const role = localStorage.getItem('role') || '';
  const subAdminType = localStorage.getItem('subAdminType') || '';

  const allowedRoles: string[] = route.data?.['roles'] ?? [];
  const allowedSubTypes: string[] = route.data?.['subAdminTypes'] ?? [];
  const allowSuperAdmin = route.data?.['allowSuperAdmin'] !== false;

  const passes =
    (allowSuperAdmin && role === 'super_admin') ||
    allowedRoles.includes(role) ||
    allowedSubTypes.includes(subAdminType);

  if (!passes) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
