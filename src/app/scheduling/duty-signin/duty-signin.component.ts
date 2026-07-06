import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ESignComponent } from '../../shared/ui/e-sign/e-sign.component';
import { SchedulingService, ShiftAssignment } from '../../services/scheduling.service';
import { MastersService, MasterWard } from '../../services/masters.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Duty sign-in kiosk — `/duty-signin`.
 *
 * Designed for a shared ward tablet: the charge nurse picks a date + ward and
 * the page lists every rostered assignment for that combination. Each row
 * shows the staff member, their shift window, and a "Sign in" button that
 * captures an e-signature (source = KIOSK).
 *
 * For an individual nurse acknowledging via their own login session, the
 * `app-duty-ack-modal` component embeds the same logic in a post-login modal.
 * Both flows call the same `/acknowledge` endpoint; only the `source` field
 * differs in the audit log.
 */
@Component({
  selector: 'app-duty-signin',
  standalone: true,
  imports: [CommonModule, FormsModule, ESignComponent],
  templateUrl: './duty-signin.component.html',
  styleUrls: ['./duty-signin.component.css'],
})
export class DutySigninComponent implements OnInit, OnDestroy {
  date = new Date().toISOString().slice(0, 10);
  wardId = '';
  wards: MasterWard[] = [];
  rows: ShiftAssignment[] = [];

  // Active sign-in row.
  active: ShiftAssignment | null = null;
  saving = false;

  loading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private scheduling: SchedulingService,
    private masters: MastersService,
  ) {}

  ngOnInit(): void {
    this.masters.listWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.wards = r ?? []; },
      error: () => { this.wards = []; },
    });
    this.refresh();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.scheduling.kioskList(this.wardId || undefined, this.date)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => { this.rows = rows ?? []; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load list'; this.loading = false; },
      });
  }

  isAcked(a: ShiftAssignment): boolean {
    return !!(a.acknowledgements && a.acknowledgements.length > 0);
  }
  ackedAt(a: ShiftAssignment): string | null {
    return a.acknowledgements?.[0]?.acknowledgedAt ?? null;
  }

  openSignin(a: ShiftAssignment): void {
    this.active = a;
    this.errorMessage = '';
    this.successMessage = '';
  }
  closeSignin(): void { this.active = null; }

  onSigned(sig: SignatureCreateResponse): void {
    if (!this.active) return;
    this.saving = true;
    this.scheduling.acknowledge(this.active.id, {
      signatureId: sig.id,
      source: 'KIOSK',
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = `${this.active?.user?.username} signed in.`;
        this.closeSignin();
        this.refresh();
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.error || e?.error?.detail || 'Sign-in failed';
      },
    });
  }
}
