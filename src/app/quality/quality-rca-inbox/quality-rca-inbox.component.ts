import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QualityService, QualityIndicatorRca, RcaStats, RcaStatus } from '../../services/quality.service';

/**
 * Phase 9.26 / Phase 3 — Quality Indicator RCA inbox.
 * Route: /quality/rcas
 *
 * Lists open / in-progress / closed QI RCAs. Auto-created when a Red or
 * Critical record lands and the indicator's rcaRequiredRule allows it.
 */
@Component({
  selector: 'app-quality-rca-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-rca-inbox.component.html',
  styleUrls: ['./quality-rca-inbox.component.css'],
})
export class QualityRcaInboxComponent implements OnInit, OnDestroy {
  rows: QualityIndicatorRca[] = [];
  stats: RcaStats | null = null;
  loading = false;
  errorMessage = '';

  filters: { status: '' | RcaStatus; owner: string; qiCode: string; overdue: boolean } = {
    status: '', owner: '', qiCode: '', overdue: false,
  };
  readonly STATUSES: RcaStatus[] = ['open', 'in_progress', 'closed'];

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router) {}

  ngOnInit(): void { this.load(); this.loadStats(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.listRcas({
      status: this.filters.status || undefined,
      owner: this.filters.owner || undefined,
      qiCode: this.filters.qiCode || undefined,
      overdue: this.filters.overdue || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load RCAs'; this.loading = false; },
    });
  }
  loadStats(): void {
    this.svc.getRcaStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => (this.stats = s),
      error: () => (this.stats = null),
    });
  }

  openDetail(rca: QualityIndicatorRca): void {
    this.router.navigate(['/quality/rcas', rca.id]);
  }
  goBack(): void { this.router.navigate(['/quality/indicators']); }

  statusClass(status: string): string {
    switch (status) {
      case 'open':        return 'q-bad';
      case 'in_progress': return 'q-warn';
      case 'closed':      return 'q-good';
      default:            return '';
    }
  }
  isOverdue(r: QualityIndicatorRca): boolean {
    if (r.status === 'closed' || !r.dueDate) return false;
    return new Date(r.dueDate) < new Date();
  }
}
