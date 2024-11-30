import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private logoutTimer: any;
  private readonly INACTIVITY_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes

  constructor(private router: Router, private ngZone: NgZone) {
    this.startInactivityWatch();
  }

  // Start monitoring user activity
  private startInactivityWatch(): void {
    this.resetLogoutTimer();

    ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, () => this.resetLogoutTimer());
    });
  }

  // Function to reset the inactivity timer
  private resetLogoutTimer(): void {
    // Clear any existing timer
    clearTimeout(this.logoutTimer);
    // Set a new timer
    this.ngZone.runOutsideAngular(() => {
      this.logoutTimer = setTimeout(() => this.logoutUser(), this.INACTIVITY_TIME_LIMIT);
    });
  }

  // Function to log out the user
  private logoutUser(): void {
    this.ngZone.run(() => {
      console.log('Logging out due to inactivity...');
      // Perform your logout logic here
      this.router.navigate(['/login']); // Adjust this to match your logout route
      localStorage.removeItem('token');
    });
  }
}
