import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OpthPresService } from '../../services/ophthamology-prescription/opth-pres.service';

/**
 * Optometrist page — `/optometry/queue`.
 *
 * Today's ophthalmology appointments with the state of each refraction
 * work-up. The optometrist opens a patient, records VA / glass power /
 * autorefraction / subjective refraction / IOP / drops, and submits it.
 *
 * The work-up stays PROVISIONAL until the treating doctor verifies it — the
 * doctor sees who recorded it and which values they changed, so a mis-entry
 * here can never silently become the doctor's signed word.
 */
interface QueueRow {
  id: number;
  patientName: string;
  prnNumber: number | null;
  age: string | null;
  gender: string | null;
  doctorName: string;
  department: string;
  time: string;
  status: string;
  checkedIn: boolean | null;
  workupStatus: string;
  workup: {
    prescriptionId: string;
    recordedBy: string | null;
    recordedAt: string | null;
    verifiedBy: string | null;
    verifiedAt: string | null;
  } | null;
}

@Component({
  selector: 'app-optometry-queue',
  templateUrl: './optometry-queue.component.html',
  styleUrls: ['./optometry-queue.component.css'],
  // The table styling targets bare thead/tbody selectors (copied from the
  // appointment lists), so keep the default emulated encapsulation scoping.
})
export class OptometryQueueComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';

  /** Board date — defaults to today, kept as YYYY-MM-DD like the rest of the app. */
  selectedDate = new Date().toISOString().split('T')[0];
  rows: QueueRow[] = [];

  /** Appointment opened in the work-up form; null = the board is showing. */
  activeAppointment: QueueRow | null = null;

  private destroy$ = new Subject<void>();

  constructor(private api: OpthPresService) {}

  ngOnInit(): void {
    this.refresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api.getOptometryQueue(this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.rows = res?.rows ?? [];
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Failed to load the optometry queue';
          this.loading = false;
        },
      });
  }

  openWorkup(row: QueueRow): void {
    this.activeAppointment = row;
  }

  /** Back to the board — reload so the status chip reflects what was submitted. */
  closeWorkup(): void {
    this.activeAppointment = null;
    this.refresh();
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'submitted': return 'Awaiting doctor';
      case 'verified':  return 'Verified';
      case 'amended':   return 'Verified (corrected)';
      default:          return 'Not started';
    }
  }

  get pendingCount(): number {
    return this.rows.filter(r => r.workupStatus === 'pending').length;
  }
}
