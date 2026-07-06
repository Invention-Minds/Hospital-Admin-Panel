import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  OtDischargeSummaryService,
  OtDischargeSummaryResponse,
} from '../../services/ot-discharge-summary.service';

type DsTab = 'admission' | 'op1' | 'op2' | 'op3' | 'course' | 'advice' | 'other';

/**
 * Phase 9.5b — OT Discharge Summary (tabbed read view).
 *
 * Tabs:
 *   * Admission      — admission core fields
 *   * Operative Notes 1–3 (only show those that exist)
 *   * Course in Hospital — IpdProgressNote rolled up
 *   * Advice on Discharge — IpdDischarge.advice + meds
 *   * Other Information — discharge type, follow-up, diagnosis codes
 *
 * Route: /surgery-ot/admission/:admissionId/discharge-summary
 */
@Component({
  selector: 'app-ot-discharge-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ot-discharge-summary.component.html',
  styleUrls: ['./ot-discharge-summary.component.css'],
})
export class OtDischargeSummaryComponent implements OnInit, OnDestroy {
  admissionId = '';
  activeTab: DsTab = 'admission';

  payload: OtDischargeSummaryResponse['data'] | null = null;
  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: OtDischargeSummaryService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.get(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.payload = r.data; this.loading = false; },
      error: () => { this.errorMessage = 'Failed to load discharge summary'; this.loading = false; },
    });
  }

  get opNotes() { return this.payload?.operativeNotes ?? []; }
  get note1() { return this.opNotes[0] ?? null; }
  get note2() { return this.opNotes[1] ?? null; }
  get note3() { return this.opNotes[2] ?? null; }

  setTab(tab: DsTab): void { this.activeTab = tab; }

  print(): void { window.print(); }

  /** Try to parse the IpdDischarge.medications JSON string. */
  parseMedications(raw: string | null): Array<Record<string, unknown>> {
    if (!raw) return [];
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }

  codesByCategory(cat: 'icd-provisional' | 'icd-final' | 'cpt') {
    return (this.payload?.diagnosisCodes ?? []).filter((c) => c.category === cat);
  }
}
