import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthServiceService } from './services/auth/auth-service.service';
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthServiceService);
  const router = inject(Router);

  // Check if the browser environment is available
  if (typeof window === 'undefined') {
    return false;
  }

  // If the user is not authenticated, redirect to the login page
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Allow access if the user is authenticated
  return true;
};
