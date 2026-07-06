import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityService, QualityIndicator, QualityMonthlyDenominator,
  DenominatorUpsertBody,
} from '../../services/quality.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.26 / Phase 5c — Monthly denominator capture.
 * Route: /quality/denominators
 *
 * Single page to record "total medication administrations / total surgeries /
 * total encounters / etc." for the period. The Phase 5c auto-source needs a
 * denominator row to publish a record — without one the indicator stays
 * skipped-no-data.
 */
@Component({
  selector: 'app-quality-denominators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-denominators.component.html',
  styleUrls: ['./quality-denominators.component.css'],
})
export class QualityDenominatorsComponent implements OnInit, OnDestroy {
  indicators: QualityIndicator[] = [];
  rows: QualityMonthlyDenominator[] = [];
  hints: Record<string, number> = {};

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Mirror of the backend Phase 5c registration. Only these indicators need
  // a monthly denominator captured manually.
  readonly DENOMINATOR_BACKED: string[] = [
    'PSQ-016', 'PSQ-017', 'PSQ-018', 'PSQ-019', 'PSQ-020', 'PSQ-021', 'PSQ-022',
    'PSQ-023', 'PSQ-026', 'PSQ-027', 'PRE-010',
    'OT-002', 'OT-005', 'OT-006', 'OT-007',
    // Phase 5b / 5f — added codes that use the same manual-denominator flow.
    'HR-006', 'FMS-007',
    // Phase 5e — billing errors + application downtime.
    'OPS-001', 'OPS-009',
    // Phase 5g — expired drug rate (total drug items audited).
    'OPS-004',
  ];

  filterPeriod = this.currentMonth();
  draft: DenominatorUpsertBody = {
    qiCode: '',
    period: this.currentMonth(),
    value: 0,
    notes: '',
  };

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router, private alertSvc: AlertService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      indicators: this.svc.listIndicators({ active: true }),
      denominators: this.svc.listDenominators({ period: this.filterPeriod || undefined }),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ indicators, denominators }) => {
        this.indicators = indicators.data.filter((i) => this.DENOMINATOR_BACKED.includes(i.qiCode));
        this.rows = denominators.data;
        this.hints = denominators.hints ?? {};
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
    });
  }

  selectedIndicator(): QualityIndicator | null {
    return this.indicators.find((i) => i.qiCode === this.draft.qiCode) ?? null;
  }

  existingFor(qiCode: string): QualityMonthlyDenominator | null {
    return this.rows.find((r) => r.qiCode === qiCode && r.period === this.draft.period) ?? null;
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.draft.qiCode) { this.errorMessage = 'Pick an indicator'; return; }
    if (!this.draft.period) { this.errorMessage = 'Period (YYYY-MM) required'; return; }
    if (typeof this.draft.value !== 'number' || this.draft.value < 0) {
      this.errorMessage = 'Value must be ≥ 0'; return;
    }
    this.saving = true;
    this.svc.upsertDenominator({
      qiCode: this.draft.qiCode,
      period: this.draft.period,
      value: Number(this.draft.value),
      notes: this.draft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Saved';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.draft = {
          qiCode: this.draft.qiCode,    // keep selected
          period: this.draft.period,    // keep period
          value: 0,
          notes: '',
        };
        this.load();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to save'; this.saving = false; },
    });
  }

  async remove(row: QualityMonthlyDenominator): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete ${row.qiCode} / ${row.period} denominator?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteDenominator(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }

  loadValueFromExisting(): void {
    const ex = this.existingFor(this.draft.qiCode);
    if (ex) { this.draft.value = ex.value; this.draft.notes = ex.notes ?? ''; }
    else    { this.draft.value = 0;       this.draft.notes = ''; }
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  goBack(): void { this.router.navigate(['/quality/indicators']); }
}
