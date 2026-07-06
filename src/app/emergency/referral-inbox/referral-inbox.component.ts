import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EmergencyReferralService, EmergencyReferral } from '../../services/emergency-referral.service';

/**
 * Phase 9.19 — Referral inbox.
 *
 * A dedicated worklist of emergency referrals awaiting the logged-in
 * doctor's acknowledgment — so they don't have to open each ER case to act.
 *
 * Route: /emergency/my-referrals
 */
@Component({
  selector: 'app-referral-inbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './referral-inbox.component.html',
  styleUrls: ['./referral-inbox.component.css'],
})
export class ReferralInboxComponent implements OnInit, OnDestroy {
  referrals: EmergencyReferral[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: EmergencyReferralService, private router: Router) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    // All emergency patients referred/assigned to this doctor (pending + acknowledged).
    this.svc.mine().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.referrals = r.data ?? []; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load referrals'; this.loading = false; },
    });
  }

  acknowledge(ref: EmergencyReferral): void {
    this.svc.acknowledge(ref.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.referrals = this.referrals.filter((r) => r.id !== ref.id);
        this.successMessage = 'Referral acknowledged.';
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to acknowledge'; },
    });
  }

  openCase(ref: EmergencyReferral): void {
    if (ref.emergency?.id) this.router.navigate(['/emergency', ref.emergency.id]);
  }

  /** Minutes since the referral was raised — surfaces how overdue it is. */
  minutesElapsed(ref: EmergencyReferral): number {
    return Math.floor((Date.now() - new Date(ref.referredAt).getTime()) / 60_000);
  }
  isOverdue(ref: EmergencyReferral): boolean {
    return this.minutesElapsed(ref) > ref.slaMinutes;
  }
}
