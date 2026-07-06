import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type DashboardView =
  | 'doctor'
  | 'management'
  | 'frontdesk'
  | 'nurse'
  | 'nursing-superintendent'
  | 'legacy';

/**
 * Single entry point for /dashboard. Picks the designation-tuned view based
 * on role/admin/subAdmin keys set at login. Falls through to the legacy
 * `DashboardOverviewComponent` for unrecognized roles so existing users
 * see no behavior change.
 *
 * Detection rules (most specific first):
 *  - role=doctor → doctor dashboard
 *  - role=admin + (adminType=Manager or Senior Manager) → management
 *  - role=admin + adminType=IP Billing Manager → legacy (already has /estimation home)
 *  - role=admin (other) → management (best fit)
 *  - role=sub_admin + subAdminType=Nursing Superintendent → nursing superintendent
 *  - role=sub_admin + subAdminType=Nurse (or legacy nurse subtypes) → bedside nurse
 *  - role=sub_admin + subAdminType in (Front Desk, Tele Caller) OR isReceptionist=true → front desk
 *  - everyone else → legacy
 */
@Component({
  selector: 'app-dashboard-dispatcher',
  template: `
    <app-doctor-dashboard *ngIf="targetView === 'doctor'"></app-doctor-dashboard>
    <app-management-dashboard *ngIf="targetView === 'management'"></app-management-dashboard>
    <app-frontdesk-dashboard *ngIf="targetView === 'frontdesk'"></app-frontdesk-dashboard>
    <app-nurse-dashboard *ngIf="targetView === 'nurse'"></app-nurse-dashboard>
    <app-nursing-super-dashboard *ngIf="targetView === 'nursing-superintendent'"></app-nursing-super-dashboard>
    <app-dashboard-overview *ngIf="targetView === 'legacy'"></app-dashboard-overview>
  `,
})
export class DashboardDispatcherComponent implements OnInit {
  targetView: DashboardView = 'legacy';

  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const role = (localStorage.getItem('role') || '').toLowerCase();
    const adminType = (localStorage.getItem('adminType') || '').toLowerCase();
    const subAdminType = (localStorage.getItem('subAdminType') || '').toLowerCase();
    const isReceptionist = localStorage.getItem('isReceptionist') === 'true';

    if (role === 'doctor') {
      this.targetView = 'doctor';
      return;
    }

    if (role === 'admin') {
      // IP Billing Manager has its own home (/estimation), leave legacy here.
      if (adminType === 'ip billing manager') {
        this.targetView = 'legacy';
        return;
      }
      this.targetView = 'management';
      return;
    }

    if (role === 'sub_admin') {
      // NS — superintendent is now an explicit subAdminType (no more B<N> hack).
      if (subAdminType === 'nursing superintendent') {
        this.targetView = 'nursing-superintendent';
        return;
      }
      // Canonical 'nurse' + legacy nurse subtypes → bedside nurse dashboard.
      if (['nurse', 'nursing', 'ipd nurse', 'icu nurse', 'ward coordinator'].includes(subAdminType)) {
        this.targetView = 'nurse';
        return;
      }
      if (
        subAdminType === 'front desk' ||
        subAdminType === 'tele caller' ||
        isReceptionist
      ) {
        this.targetView = 'frontdesk';
        return;
      }
    }

    this.targetView = 'legacy';
  }
}
