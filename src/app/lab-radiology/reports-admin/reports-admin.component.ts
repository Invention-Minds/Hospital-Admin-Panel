import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  InvestigationResultService,
  PendingOrderRow,
  ResultDepartment,
  InvestigationResult,
} from '../../services/investigation-result.service';
import { ReportUploadComponent } from '../report-upload/report-upload.component';
import { ReportViewerComponent } from '../report-viewer/report-viewer.component';

/**
 * Phase 9.11 — Lab & Radiology Reports admin (coordinator workbench).
 *
 * Route: /lab-radiology/reports
 * Audience: subAdminType ∈ {'Lab Coordinator', 'Radiology Coordinator'} + super_admin.
 *
 * Lists recent InvestigationOrders, shows which tests in each order still
 * need a final result, and exposes an inline "Upload" action that opens
 * the ReportUploadComponent pre-populated with the right (orderId,
 * testName, department).
 */
@Component({
  selector: 'app-reports-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportUploadComponent, ReportViewerComponent],
  templateUrl: './reports-admin.component.html',
  styleUrls: ['./reports-admin.component.css'],
})
export class ReportsAdminComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  successMessage = '';

  rows: PendingOrderRow[] = [];

  // Filters
  filterDepartment: ResultDepartment | '' = '';
  filterDays = 14;
  filterShowComplete = false;
  filterSearch = '';

  // Upload modal state
  uploadOpen = false;
  uploadOrderId: number | null = null;
  uploadPrn = '';
  uploadTestName = '';
  uploadDepartment: ResultDepartment = 'lab';

  // Viewer modal state
  viewerOpen = false;
  viewerResultId: number | null = null;
  viewerResult: InvestigationResult | null = null;

  private destroy$ = new Subject<void>();

  constructor(private svc: InvestigationResultService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.pendingOrders({
      department: this.filterDepartment || undefined,
      days: this.filterDays,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data ?? []; this.loading = false; },
      error: (e) => {
        this.errorMessage = e?.error?.message ?? 'Failed to load pending orders';
        this.loading = false;
      },
    });
  }

  get visibleRows(): PendingOrderRow[] {
    const q = this.filterSearch.trim().toLowerCase();
    return this.rows.filter((row) => {
      if (!this.filterShowComplete && row.isComplete) return false;
      if (q && !`${row.prn} ${row.doctorName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  // ─── Upload ────────────────────────────────────────────────────────

  openUpload(row: PendingOrderRow, test?: { name: string; dept: ResultDepartment }): void {
    this.uploadOrderId = row.id;
    this.uploadPrn = row.prn;
    if (test) {
      this.uploadTestName = test.name;
      this.uploadDepartment = test.dept;
    } else {
      // No specific test clicked — pre-fill with the first pending one if any.
      const first = row.pendingTests[0];
      this.uploadTestName = first?.name ?? '';
      this.uploadDepartment = first?.dept ?? 'lab';
    }
    this.uploadOpen = true;
  }

  onUploadClosed(): void {
    this.uploadOpen = false;
    this.uploadOrderId = null;
  }

  onUploadSaved(_row: InvestigationResult): void {
    this.uploadOpen = false;
    this.uploadOrderId = null;
    this.successMessage = 'Result uploaded';
    this.load();
  }

  // ─── Viewer ────────────────────────────────────────────────────────

  openViewer(resultId: number): void {
    this.viewerResultId = resultId;
    this.viewerResult = null;
    this.viewerOpen = true;
    this.svc.get(resultId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.viewerResult = r.data; },
      error: (e) => {
        this.errorMessage = e?.error?.message ?? 'Failed to open result';
        this.viewerOpen = false;
      },
    });
  }

  onViewerClosed(): void {
    this.viewerOpen = false;
    this.viewerResult = null;
    this.viewerResultId = null;
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  pendingCount(row: PendingOrderRow): number { return row.pendingTests.length; }
  uploadedCount(row: PendingOrderRow): number { return row.results.length; }

  hasCritical(row: PendingOrderRow): boolean {
    return row.results.some((r) => r.criticalFlag);
  }
}
