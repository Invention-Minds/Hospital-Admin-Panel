import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  InvestigationResultService,
  InvestigationResult,
  ResultDepartment,
  ResultStatus,
} from '../../services/investigation-result.service';
import { ReportViewerComponent } from '../report-viewer/report-viewer.component';

/**
 * Phase 9.11 — Reusable "Reports" tab.
 *
 * Embed this on:
 *   - Patient profile         (mode='patient', input prn)
 *   - IPD admission detail    (mode='admission', input admissionId)
 *
 * The component is self-contained: lists results + critical banner +
 * filter row + opens ReportViewerComponent on row click.
 */
@Component({
  selector: 'app-patient-reports-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportViewerComponent],
  templateUrl: './patient-reports-tab.component.html',
  styleUrls: ['./patient-reports-tab.component.css'],
})
export class PatientReportsTabComponent implements OnChanges, OnDestroy {
  @Input() mode: 'patient' | 'admission' = 'patient';
  @Input() prn = '';
  @Input() admissionId = '';

  loading = false;
  errorMessage = '';
  rows: InvestigationResult[] = [];
  windowLabel = '';

  filterDepartment: ResultDepartment | '' = '';
  filterStatus: ResultStatus | '' = '';

  viewerOpen = false;
  viewerResult: InvestigationResult | null = null;

  private destroy$ = new Subject<void>();

  constructor(private svc: InvestigationResultService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] || changes['prn'] || changes['admissionId']) {
      this.load();
    }
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    if (this.mode === 'patient' && !this.prn) return;
    if (this.mode === 'admission' && !this.admissionId) return;

    this.loading = true;
    this.errorMessage = '';
    const obs = this.mode === 'admission'
      ? this.svc.listByAdmission(this.admissionId)
      : this.svc.listByPrn(this.prn, {
          department: this.filterDepartment || undefined,
          status: this.filterStatus || undefined,
        });

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.rows = r.data ?? [];
        const w = (r as { window?: { from: string; to: string } }).window;
        this.windowLabel = w ? `${new Date(w.from).toLocaleDateString()} – ${new Date(w.to).toLocaleDateString()}` : '';
        // Client-side filter for admission mode (server doesn't filter for it).
        if (this.mode === 'admission') {
          this.rows = this.rows.filter((x) =>
            (!this.filterDepartment || x.department === this.filterDepartment) &&
            (!this.filterStatus || x.status === this.filterStatus),
          );
        }
        this.loading = false;
      },
      error: (e) => {
        this.errorMessage = e?.error?.message ?? 'Failed to load reports';
        this.loading = false;
      },
    });
  }

  // ─── Viewer ────────────────────────────────────────────────────────

  open(row: InvestigationResult): void {
    this.viewerResult = row;
    this.viewerOpen = true;
  }

  onViewerClosed(): void {
    this.viewerOpen = false;
    this.viewerResult = null;
  }

  onAcknowledged(updated: InvestigationResult): void {
    // Reflect the ack in the local list so the row's "unack" indicator drops.
    const idx = this.rows.findIndex((r) => r.id === updated.id);
    if (idx >= 0) this.rows[idx] = { ...this.rows[idx], ...updated };
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  get groupedByDate(): Array<{ date: string; rows: InvestigationResult[] }> {
    const groups = new Map<string, InvestigationResult[]>();
    for (const r of this.rows) {
      const key = (r.reportedAt || r.createdAt).slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, rows]) => ({ date, rows }));
  }
}
