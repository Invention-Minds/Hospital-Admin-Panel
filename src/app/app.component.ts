import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { InactivityService } from './services/inactivity.service';
import { LoaderComponent } from "./loader/loader.component";
import { SettingsComponent } from "./settings/settings/settings.component";
import { SignatureComponent } from "./signature/signature/signature.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  // imports: [SettingsComponent],
})
export class AppComponent {
  role: string = ''; 
  constructor(private router: Router, private inactivityService: InactivityService) {}
  title = 'hospital_appointment_admin_panel';
  isLoginRoute(): boolean {
    return this.router.url === '/login'; // Adjust this if your login route is different
  }
  isLoading = true; // Global loading stat
  isSettingsOpen = false;

  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
    console.log('Settings open:', this.isSettingsOpen);
  }
  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      this.role = localStorage.getItem('role') || '';
      // console.log('User role:', this.role);
    } else {
      console.log('localStorage is not available');
    }
  }
  isChannelRoute(): boolean {
    return this.router.url.startsWith('/channel/');
  }
}
