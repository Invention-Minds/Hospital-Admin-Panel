import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class InactivityService {
  private logoutTimer: any;
  private lastReset = 0;
  private readonly INACTIVITY_TIME_LIMIT = 10 * 60 * 1000; // 10 minutes
  private readonly RESET_THROTTLE_MS = 1000;

  constructor(private router: Router, private ngZone: NgZone) {
    this.startInactivityWatch();
  }

  // Start monitoring user activity
  private startInactivityWatch(): void {
    this.resetLogoutTimer();

    // Listen outside Angular's zone: these events fire many times per second, and
    // inside the zone each one triggers change detection across the whole app.
    this.ngZone.runOutsideAngular(() => {
      ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.onActivity(), { passive: true });
      });
    });
  }

  private onActivity(): void {
    const now = Date.now();
    if (now - this.lastReset < this.RESET_THROTTLE_MS) return;
    this.resetLogoutTimer();
  }
  private isChannelRoute(): boolean {
    return this.router.url.startsWith('/channel/');
  }
  private isDoctorRoute(): boolean {
    return this.router.url.startsWith('/doctor-appointments');
  }

  private isOTChannelRoute(): boolean {
    return this.router.url.startsWith('/ot-channel');
  }
  therapyChannelRoute(): boolean {
    return this.router.url === '/therapy-channel';
  }
  therapistRoute(): boolean {
    return this.router.url === '/therapy-list';
  }

  // Function to reset the inactivity timer
  private resetLogoutTimer(): void {
    this.lastReset = Date.now();
    // Clear any existing timer
    clearTimeout(this.logoutTimer);
    // Set a new timer
    this.ngZone.runOutsideAngular(() => {
      this.logoutTimer = setTimeout(() => this.logoutUser(), this.INACTIVITY_TIME_LIMIT);
    });
  }

  // Function to log out the user
  private logoutUser(): void {
    if (!this.isChannelRoute() && !this.isDoctorRoute() && !this.isOTChannelRoute() && !this.therapyChannelRoute() && !this.therapistRoute()) {
      this.ngZone.run(() => {
        console.log('Logging out due to inactivity...');
        localStorage.setItem('logoutReason', 'inactivity');
        // Perform your logout logic here
        this.router.navigate(['/login']); // Adjust this to match your logout route
        localStorage.removeItem('token');
      });
    }
  }
}
