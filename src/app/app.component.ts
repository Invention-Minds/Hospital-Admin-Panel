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
}
