import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AdmissionOperativeNote, OtOperativeNotesService } from '../../services/ot-operative-notes.service';

/**
 * Phase 9.3b — Read-only Operative Notes card for the IPD Discharge page.
 *
 * Lists every operative note (multi-note per schedule, multi-schedule per
 * admission) so the discharging clinician can quote them in the summary.
 * Mirrors the reference HMIS "Operative Notes" tab inside Discharge
 * Summary (Operation Notes 1 / 2 / 3 numbered cards).
 */
@Component({
  selector: 'app-ipd-discharge-operative-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ipd-discharge-operative-notes.component.html',
  styleUrls: ['./ipd-discharge-operative-notes.component.css'],
})
export class IpdDischargeOperativeNotesComponent implements OnChanges, OnDestroy {
  @Input() admissionId = '';

  notes: AdmissionOperativeNote[] = [];
  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: OtOperativeNotesService) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['admissionId'] && this.admissionId) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.byAdmission(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.notes = r.data; this.loading = false; },
      error: (e) => {
        this.errorMessage = e?.error?.message || 'Failed to load operative notes';
        this.loading = false;
      },
    });
  }

  parseImplants(raw: string | null): Array<{ name: string; batch?: string; serial?: string; manufacturer?: string }> {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  parseAssistants(raw: string | null): Array<{ name: string; role?: string }> {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }
}
