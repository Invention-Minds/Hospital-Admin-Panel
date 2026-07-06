import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  AuditPackScope,
  ComplianceChapter,
  ComplianceCheckStatus,
  ComplianceReport,
  ComplianceStandard,
  NabhAuditExport,
  NabhAuditService,
} from '../services/nabh-audit.service';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 10 (extended) — NABH Audit page.
 *
 * Two tabs:
 *   1. "Compliance scorecard" (default) — runs every NABH check against live
 *      data and shows pass/warn/fail per standard, grouped by chapter.
 *      Click a standard to expand and see the breach evidence rows.
 *   2. "Evidence exports" — the older raw-data dump path, kept for auditors
 *      who want a JSON bundle for their working copy.
 */
@Component({
  selector: 'app-nabh-audit',
  templateUrl: './nabh-audit.component.html',
  styleUrls: ['./nabh-audit.component.css'],
})
export class NabhAuditComponent implements OnInit, OnDestroy {
  activeTab: 'scorecard' | 'exports' = 'scorecard';

  loading = false;
  exporting = false;
  errorMessage = '';
  successMessage = '';

  // Scorecard state
  report: ComplianceReport | null = null;
  expandedStandard: string | null = null;

  // Date range — shared between scorecard and exports tabs.
  range = { fromDate: '', toDate: '' };

  // Exports state
  exportForm = { scope: 'full' as AuditPackScope };
  exports: NabhAuditExport[] = [];

  // Scope labels are written in NABH-aligned, plain-English form for auditors.
  // The `value` strings are the contract with the backend and must NOT change.
  readonly scopeOptions: { value: AuditPackScope; label: string }[] = [
    { value: 'full',     label: 'Complete audit bundle — all evidence' },
    { value: 'wf-1',     label: 'Patient billing & payment gating' },
    { value: 'wf-2',     label: 'Admission consent & bedside acceptance (PRE.2 / PRE.4)' },
    { value: 'wf-3',     label: 'Daily care & medication administration (COP.4 / MOM.4)' },
    { value: 'wf-4',     label: 'ICU transfer signature chain (COP.5)' },
    { value: 'wf-5',     label: 'Discharge summaries with clinician sign-off (AAC.5)' },
    { value: 'incident', label: 'Staff handover & contingency reassignment (HRM.5)' },
    { value: 'hmis',     label: 'HMIS integration logs' },
  ];

  private destroy$ = new Subject<void>();

  constructor(private nabhAuditService: NabhAuditService) {}

  ngOnInit(): void {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);
    this.range.fromDate = start.toISOString().slice(0, 10);
    this.range.toDate = today.toISOString().slice(0, 10);
    this.loadScorecard();
    this.loadExports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: 'scorecard' | 'exports'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // ─── Scorecard ───────────────────────────────────────────────────────
  loadScorecard(): void {
    if (!this.range.fromDate || !this.range.toDate) {
      this.errorMessage = 'Pick from + to dates.';
      return;
    }
    if (this.range.fromDate > this.range.toDate) {
      this.errorMessage = '"From" date must be on or before "To" date.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.nabhAuditService
      .getComplianceReport(this.range.fromDate, this.range.toDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.report = report;
          this.expandedStandard = null;
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Failed to load scorecard';
          this.loading = false;
        },
      });
  }

  toggleStandard(code: string): void {
    this.expandedStandard = this.expandedStandard === code ? null : code;
  }

  isExpanded(code: string): boolean {
    return this.expandedStandard === code;
  }

  // ─── Exports (raw evidence) ──────────────────────────────────────────
  loadExports(): void {
    this.nabhAuditService
      .list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.exports = rows ?? [];
        },
        error: (err) => {
          this.errorMessage = err?.error?.error || 'Failed to load exports';
        },
      });
  }

  submitExport(): void {
    if (!this.range.fromDate || !this.range.toDate) {
      this.errorMessage = 'Pick from + to dates.';
      return;
    }
    if (this.range.fromDate > this.range.toDate) {
      this.errorMessage = '"From" date must be on or before "To" date.';
      return;
    }
    this.exporting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.nabhAuditService
      .requestExport({
        scope: this.exportForm.scope,
        fromDate: this.range.fromDate,
        toDate: this.range.toDate,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.exporting = false;
          this.successMessage =
            row.status === 'READY'
              ? `Audit pack ready (${row.rowCount} rows · ${this.formatBytes(row.bundleBytes ?? 0)}).`
              : `Export queued (status=${row.status}).`;
          this.loadExports();
        },
        error: (err) => {
          this.exporting = false;
          this.errorMessage = err?.error?.error || err?.error?.detail || 'Export failed';
        },
      });
  }

  // ─── View helpers ────────────────────────────────────────────────────
  resolveDownloadUrl(rel?: string | null): string {
    if (!rel) return '';
    const apiRoot = environment.apiUrl.replace(/\/api(\/.*)?$/, '');
    return apiRoot + rel;
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
  }

  scoreClass(score: number): string {
    if (score >= 90) return 'score score-good';
    if (score >= 70) return 'score score-warn';
    return 'score score-bad';
  }

  statusClass(status: ComplianceCheckStatus): string {
    switch (status) {
      case 'PASS': return 'pill pill-pass';
      case 'WARNING': return 'pill pill-warn';
      case 'FAIL': return 'pill pill-fail';
      case 'NOT_APPLICABLE': return 'pill pill-na';
      default: return 'pill';
    }
  }

  chapterStatusClass(ch: ComplianceChapter): string {
    if (ch.failed > 0) return 'chapter-head chapter-fail';
    if (ch.warning > 0) return 'chapter-head chapter-warn';
    return 'chapter-head chapter-pass';
  }

  hasBreaches(s: ComplianceStandard): boolean {
    return s.breaches.length > 0;
  }
}
