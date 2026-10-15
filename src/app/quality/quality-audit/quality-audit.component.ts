import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityService, QualityIndicator, QualityAuditObservation,
  AuditObservationCreateBody, AuditPeriodSummary,
} from '../../services/quality.service';
import { AlertService } from '../../services/alert.service';
import { isQualityEditor } from '../quality-access';

/**
 * Phase 9.26 / Phase 5a — Generic audit observation capture.
 * Route: /quality/audit
 *
 * Single form to record any compliance audit (hand hygiene, BMW, MRD,
 * HR training, fire drill, etc.). Indicator dropdown is filtered by
 * chapter chip. Submitting writes a QualityAuditObservation row; the
 * monthly auto-source cron rolls them into a QualityIndicatorRecord.
 */
@Component({
  selector: 'app-quality-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-audit.component.html',
  styleUrls: ['./quality-audit.component.css'],
})
export class QualityAuditComponent implements OnInit, OnDestroy {
  indicators: QualityIndicator[] = [];
  recent: QualityAuditObservation[] = [];
  summary: AuditPeriodSummary | null = null;

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Chapter filter chips — narrow the indicator dropdown.
  readonly CHAPTERS: string[] = ['PSQ', 'ICO', 'OT', 'LAB', 'RAD', 'PRE', 'MRD', 'HR', 'FMS'];

  filterChapter = '';
  /** Quality Manager / super_admin; senior management view read-only. */
  readonly canEdit = isQualityEditor();

  draft: AuditObservationCreateBody = {
    qiCode: '',
    observedAt: this.today(),
    location: '',
    checkpointLabel: '',
    compliant: true,
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
      codes: this.svc.auditBackedCodes(),
      observations: this.svc.listObservations({ period: this.currentMonth() }),
      summary: this.svc.observationSummary(this.currentMonth()),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ indicators, codes, observations, summary }) => {
        const auditBacked = new Set(codes.data);
        this.indicators = indicators.data.filter((i) => auditBacked.has(i.qiCode));
        this.recent = observations.data.slice(0, 30);
        this.summary = summary;
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
    });
  }

  get filteredIndicators(): QualityIndicator[] {
    if (!this.filterChapter) return this.indicators;
    return this.indicators.filter((i) => i.chapter === this.filterChapter);
  }

  selectedIndicator(): QualityIndicator | null {
    return this.indicators.find((i) => i.qiCode === this.draft.qiCode) ?? null;
  }

  selectChapter(ch: string): void {
    this.filterChapter = this.filterChapter === ch ? '' : ch;
    // Reset selection if it no longer matches chapter filter.
    const cur = this.selectedIndicator();
    if (this.filterChapter && cur && cur.chapter !== this.filterChapter) this.draft.qiCode = '';
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.draft.qiCode) { this.errorMessage = 'Pick an indicator'; return; }
    if (typeof this.draft.compliant !== 'boolean') { this.errorMessage = 'Compliant Y/N is required'; return; }
    this.saving = true;
    this.svc.createObservation({
      qiCode: this.draft.qiCode,
      observedAt: this.draft.observedAt || undefined,
      location: this.draft.location || undefined,
      checkpointLabel: this.draft.checkpointLabel || undefined,
      compliant: this.draft.compliant,
      notes: this.draft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Recorded';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.draft = {
          qiCode: this.draft.qiCode,        // keep indicator selected for rapid entry
          observedAt: this.today(),
          location: this.draft.location,    // keep location — auditor stays in one ward
          checkpointLabel: '',
          compliant: true,
          notes: '',
        };
        this.load();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to record'; this.saving = false; },
    });
  }

  async remove(row: QualityAuditObservation): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete this observation for ${row.qiCode}?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteObservation(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  goBack(): void { this.router.navigate(['/quality/indicators']); }

  rate(qiCode: string): number | null {
    const s = this.summary?.data[qiCode];
    if (!s || s.total === 0) return null;
    return Math.round((s.compliant / s.total) * 1000) / 10;
  }

  objectKeys(o: Record<string, unknown> | null | undefined): string[] {
    return o ? Object.keys(o) : [];
  }

  get summaryEntries(): Array<{ qiCode: string; total: number; compliant: number }> {
    if (!this.summary) return [];
    return Object.entries(this.summary.data).map(([qiCode, v]) => ({ qiCode, ...v }));
  }
}
