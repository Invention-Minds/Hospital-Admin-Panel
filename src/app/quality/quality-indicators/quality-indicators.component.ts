import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityService, QualityIndicator, IndicatorStats, CaptureBody,
} from '../../services/quality.service';

/**
 * Phase 9.26 / Phase 1 — NABH/QCI 108-indicator master.
 * Route: /quality/indicators
 *
 * Lists all 108 indicators grouped by chapter with chapter chips + search.
 * Click an indicator to capture this month's numerator/denominator — the
 * status engine (Green/Amber/Red/Critical) runs server-side at save time.
 */
@Component({
  selector: 'app-quality-indicators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-indicators.component.html',
  styleUrls: ['./quality-indicators.component.css'],
})
export class QualityIndicatorsComponent implements OnInit, OnDestroy {
  rows: QualityIndicator[] = [];
  stats: IndicatorStats | null = null;
  loading = false;
  errorMessage = '';

  // Filters.
  filters = { chapter: '', department: '', search: '', onlyActive: true };
  readonly CHAPTERS: string[] = ['PSQ', 'ICO', 'OT', 'LAB', 'RAD', 'PRE', 'MRD', 'HR', 'FMS', 'OPS'];

  // Capture dialog state.
  capture: QualityIndicator | null = null;
  draftCapture: CaptureBody = {
    period: '', numerator: 0, denominator: 0, remarks: '',
    criticalTriggered: false, benchmarkOverride: null,
  };
  benchmarkOverrideEnabled = false;
  saving = false;
  captureError = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router) {}

  ngOnInit(): void { this.load(); this.loadStats(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── Loaders ──────────────────────────────────────────────────────────
  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc
      .listIndicators({
        chapter: this.filters.chapter || undefined,
        department: this.filters.department || undefined,
        search: this.filters.search || undefined,
        active: this.filters.onlyActive ? true : undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { this.rows = r.data; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load indicators'; this.loading = false; },
      });
  }

  loadStats(): void {
    this.svc.getIndicatorStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => (this.stats = s),
      error: () => (this.stats = null),
    });
  }

  // ── Filters ──────────────────────────────────────────────────────────
  selectChapter(ch: string): void {
    this.filters.chapter = this.filters.chapter === ch ? '' : ch;
    this.load();
  }
  clearFilters(): void {
    this.filters = { chapter: '', department: '', search: '', onlyActive: true };
    this.load();
  }

  // ── Grouping for template ────────────────────────────────────────────
  get grouped(): Array<{ chapter: string; rows: QualityIndicator[] }> {
    const map = new Map<string, QualityIndicator[]>();
    for (const r of this.rows) {
      if (!map.has(r.chapter)) map.set(r.chapter, []);
      map.get(r.chapter)!.push(r);
    }
    return Array.from(map.entries()).map(([chapter, rows]) => ({ chapter, rows }));
  }

  // ── Latest-record peek (already fetched via getIndicator detail later) ─
  latestStatus(ind: QualityIndicator): string {
    return ind.records?.[0]?.status ?? 'none';
  }
  latestValue(ind: QualityIndicator): string | null {
    const r = ind.records?.[0];
    if (!r) return null;
    return `${r.calculatedValue} ${ind.unit}`;
  }

  // ── Capture dialog ───────────────────────────────────────────────────
  openCapture(ind: QualityIndicator): void {
    this.capture = ind;
    this.benchmarkOverrideEnabled = false;
    this.captureError = '';
    this.draftCapture = {
      period: this.currentMonth(),
      numerator: 0,
      denominator: 0,
      remarks: '',
      criticalTriggered: false,
      benchmarkOverride: ind.defaultBenchmark,
    };
  }
  closeCapture(): void {
    this.capture = null;
    this.saving = false;
    this.captureError = '';
  }
  submitCapture(): void {
    if (!this.capture) return;
    if (!this.draftCapture.period) { this.captureError = 'Period is required (YYYY-MM)'; return; }
    if (this.draftCapture.numerator < 0 || this.draftCapture.denominator < 0) {
      this.captureError = 'Values must be non-negative'; return;
    }
    if (this.draftCapture.denominator === 0 && this.capture.multiplier !== 'NA') {
      this.captureError = 'Denominator cannot be zero for rate-based indicators';
      return;
    }
    this.saving = true;
    const payload: CaptureBody = {
      period: this.draftCapture.period,
      numerator: Number(this.draftCapture.numerator),
      denominator: Number(this.draftCapture.denominator),
      remarks: this.draftCapture.remarks || undefined,
      criticalTriggered: !!this.draftCapture.criticalTriggered,
      benchmarkOverride: this.benchmarkOverrideEnabled
        ? (this.draftCapture.benchmarkOverride === null ? null : Number(this.draftCapture.benchmarkOverride))
        : undefined,
    };
    this.svc.captureIndicatorRecord(this.capture.qiCode, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.saving = false; this.closeCapture(); this.load(); this.loadStats(); },
        error: (e) => { this.captureError = e?.error?.message || 'Failed to save'; this.saving = false; },
      });
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  statusClass(status: string): string {
    switch (status) {
      case 'green': return 'q-good';
      case 'amber': return 'q-warn';
      case 'red': return 'q-bad';
      case 'critical': return 'q-bad q-critical';
      default: return '';
    }
  }
  goBack(): void { this.router.navigate(['/quality']); }
  openRcas(): void { this.router.navigate(['/quality/rcas']); }
  openAudit(): void { this.router.navigate(['/quality/audit']); }
  openDenominators(): void { this.router.navigate(['/quality/denominators']); }
  openInfectionControl(): void { this.router.navigate(['/quality/infection-control']); }
  openFacility(): void { this.router.navigate(['/quality/facility']); }
  openTatEvents(): void { this.router.navigate(['/quality/tat-events']); }
  openPharmacy(): void { this.router.navigate(['/quality/pharmacy']); }
  openLabRad(): void { this.router.navigate(['/quality/lab-rad-events']); }
}
