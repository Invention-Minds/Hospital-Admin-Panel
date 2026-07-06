import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

import { DischargeClearanceService, MtQueueRow } from '../../services/discharge-clearance.service';

/**
 * Phase D — Medical transcriptionist queue.
 *
 * Route: /discharge/mt-queue
 * Lists admissions flagged "ready for discharge" where the summary isn't
 * signed yet. MT acknowledges to claim a case (hides it from other MTs'
 * fresh-claim list but keeps it visible until the doctor signs).
 */
@Component({
  selector: 'app-discharge-mt-queue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './discharge-mt-queue.component.html',
  styleUrls: ['./discharge-mt-queue.component.css'],
})
export class DischargeMtQueueComponent implements OnInit, OnDestroy {
  rows: MtQueueRow[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();
  constructor(private svc: DischargeClearanceService) {}

  ngOnInit(): void {
    interval(30000)
      .pipe(startWith(0), takeUntil(this.destroy$), switchMap(() => this.svc.mtQueue()))
      .subscribe({
        next: (r) => { this.rows = r.data ?? []; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load MT queue'; this.loading = false; },
      });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  ack(row: MtQueueRow): void {
    this.svc.mtAck(row.id).subscribe({
      next: () => { this.successMessage = `Claimed ${row.admissionNo}.`; setTimeout(() => this.successMessage = '', 2500); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Failed to claim'; },
    });
  }

  minsSince(when: string | null): string {
    if (!when) return '—';
    const mins = Math.floor((Date.now() - new Date(when).getTime()) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
}
