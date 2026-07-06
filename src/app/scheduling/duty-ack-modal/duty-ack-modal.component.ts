import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SchedulingService, ShiftAssignment } from '../../services/scheduling.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Post-login duty acknowledgement modal.
 *
 * Mounted in the authenticated app shell. On startup it asks
 * `/scheduling/my-pending-ack` whether the logged-in user has any assignments
 * inside their ack window (30 min before → 60 min after shift start). If yes,
 * it pops a modal with the e-sign pad. User signs → modal closes → flag set
 * in localStorage so we don't nag them again the same session.
 *
 * Designed to be unobtrusive: a single dismiss button lets users defer (e.g.
 * if they're not yet on shift). The ward-tablet kiosk page is the fallback
 * for missed acks.
 */
@Component({
  selector: 'app-duty-ack-modal',
  templateUrl: './duty-ack-modal.component.html',
  styleUrls: ['./duty-ack-modal.component.css'],
})
export class DutyAckModalComponent implements OnInit, OnDestroy {
  pending: ShiftAssignment[] = [];
  current: ShiftAssignment | null = null;
  visible = false;
  saving = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  private readonly DISMISS_KEY = 'duty-ack-dismissed-at';

  constructor(private scheduling: SchedulingService) {}

  ngOnInit(): void {
    // Don't prompt within 2h of a manual dismiss; lets users defer once
    // without the modal re-popping on every navigation.
    const dismissedAt = Number.parseInt(localStorage.getItem(this.DISMISS_KEY) || '0', 10);
    if (Date.now() - dismissedAt < 2 * 60 * 60 * 1000) return;

    this.scheduling.myPendingAck().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        this.pending = rows ?? [];
        if (this.pending.length > 0) {
          this.current = this.pending[0];
          this.visible = true;
        }
      },
      error: () => { /* swallow — the modal is non-critical */ },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  signerName(): string {
    return this.current?.user?.username ?? localStorage.getItem('username') ?? '';
  }
  signerRole(): string {
    return this.current?.user?.subAdminType ?? this.current?.user?.role ?? '';
  }

  onSigned(sig: SignatureCreateResponse): void {
    if (!this.current) return;
    this.saving = true;
    this.scheduling.acknowledge(this.current.id, {
      signatureId: sig.id,
      source: 'MODAL',
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        // Move to next pending or close.
        this.pending = this.pending.filter((p) => p.id !== this.current?.id);
        this.current = this.pending[0] ?? null;
        this.visible = this.current !== null;
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.error || e?.error?.detail || 'Acknowledgement failed';
      },
    });
  }

  dismiss(): void {
    localStorage.setItem(this.DISMISS_KEY, String(Date.now()));
    this.visible = false;
  }
}
