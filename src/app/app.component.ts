import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { InactivityService } from './services/inactivity.service';
import { AppointmentConfirmService } from './services/appointment-confirm.service';
import { AlertService, AlertState } from './services/alert.service';
import { NotificationRecipientService } from './services/notification-recipient.service';
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
  alertState: AlertState = {
    visible: false, title: '', message: '', confirmLabel: 'OK', cancelLabel: 'Cancel',
    severity: 'default', alertOnly: false,
    promptMode: false, inputType: 'text', inputPlaceholder: '', inputValue: '',
  };

  /** Support WhatsApp number — DB-managed (support_contact group); falls back
   *  to the previously-hardcoded value until the recipients table is seeded. */
  supportPhone = '919844005600';

  constructor(
    private router: Router,
    private inactivityService: InactivityService,
    private appointmentService: AppointmentConfirmService,
    private location: Location,
    public alertSvc: AlertService,
    private recipientsSvc: NotificationRecipientService,
  ) {
    this.alertSvc.state$.subscribe((s) => (this.alertState = s));
  }

  onAlertConfirm(): void { this.alertSvc.respondConfirm(true); }
  onAlertPromptConfirm(value: string): void { this.alertSvc.respondConfirm(value); }
  onAlertCancel(): void { this.alertSvc.respondCancel(); }

  /** Phase 9.8 — routes where the global Back button should NOT render.
   *  Top-level entry points (dashboard/analytics/login) have nothing
   *  meaningful to go back to; channel + kiosk + helpdesk pages have
   *  their own UX. */
  private readonly noBackRoutes = new Set<string>([
    '/login', '/maintenance', '/dashboard', '/analytics',
    '/help-center', '/redirector', '/tv-control', '/duty-signin',
  ]);
  private readonly noBackPrefixes = [
    '/channel/', '/ot-channel', '/therapy-channel', '/canteen-channel/',
  ];

  showBackButton(): boolean {
    const url = (this.router.url || '').split('?')[0]; // strip query
    if (!url || url === '/') return false;
    if (this.noBackRoutes.has(url)) return false;
    if (this.noBackPrefixes.some((p) => url.startsWith(p))) return false;
    return true;
  }

  /** Browser-history back. Falls back to /dashboard if there's no history. */
  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
  showSettingsModal = false;



  closeSettings() {
    this.appointmentService.closeSettingsModal();
  }
  title = 'hospital_appointment_admin_panel';
  isLoginRoute(): boolean {
    return this.router.url === '/login'; // Adjust this if your login route is different
  }
  isLoading = true; // Global loading stat
  isSettingsOpen = false;
  preventClose(event: MouseEvent) {
    event.stopPropagation();  // Prevent the click from reaching the overlay
  }
  toggleSettings(): void {
    this.isSettingsOpen = !this.isSettingsOpen;
    // console.log('Settings open:', this.isSettingsOpen);
  }
  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Fetch role from localStorage or the authentication service
      this.role = localStorage.getItem('role') || '';
      // console.log('User role:', this.role);
      // Support number from DB (best-effort; endpoint needs an auth token).
      if (localStorage.getItem('token')) {
        this.recipientsSvc.phones('support_contact').subscribe({
          next: (res) => { if (res.phones?.length) this.supportPhone = res.phones[0]; },
          error: () => {},
        });
      }
    } else {
      // console.log('localStorage is not available');
    }
    this.appointmentService.settingsModalState$.subscribe((state: boolean) => {
      this.showSettingsModal = state;
    });
  }
  isChannelRoute(): boolean {
    return this.router.url.startsWith('/channel/');
  }
  private isDoctorRoute(): boolean {
    return this.router.url.startsWith('/doctor-appointments');
  }
  isMaintenanceRoute(): boolean {
    return this.router.url === '/maintenance';
  }
  openWhatsApp(): void {
    // Old hardcoded number (kept for reference; now DB-managed via support_contact):
    // const phone = '919844005600';
    const phone = this.supportPhone;
    const message = encodeURIComponent('Hello! I need assistance.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  }

  isHelpDesk():boolean{
    return this.router.url === '/help-center';
  }

  otChannelRoute(): boolean {
    return this.router.url === '/ot-channel';
  }

  therapyChannelRoute(): boolean {
    return this.router.url === '/therapy-channel';
  }

  /** Phase 6 — patient-facing feedback pages render bare (no admin sidebar,
   *  no notification poller, no duty-ack modal). Otherwise the shell's long-
   *  polling XHRs (notifications, my-pending-ack, dashboard-module) saturate
   *  the browser's HTTP/1.1 connection pool and the survey GET hangs. */
  isFeedbackKioskRoute(): boolean {
    const url = (this.router.url || '').split('?')[0];
    return url.startsWith('/feedback/k/') || url === '/feedback/new';
  }
}
