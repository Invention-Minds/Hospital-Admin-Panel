import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  RevenueGroupBy,
  RevenueReport,
  RevenueService,
} from '../../services/revenue.service';

/**
 * Phase 2.5 — Revenue report tab.
 *
 * Surfaces the backend `/api/revenue` rollup. Lets the user pick a date range
 * (defaults to today), group by department or doctor, and admins can trigger
 * a manual rollup rebuild for a date.
 *
 * All field names match the backend response (`by`, `from`, `to`, `rows`,
 * `totals`) so templates can use them directly without mapping.
 */
@Component({
  selector: 'app-revenue-report',
  templateUrl: './revenue-report.component.html',
  styleUrls: ['./revenue-report.component.css'],
})
export class RevenueReportComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';
  recomputeMessage = '';

  by: RevenueGroupBy = 'department';
  from = ''; // ISO date YYYY-MM-DD
  to = '';
  recomputeDate = '';

  report: RevenueReport | null = null;

  isAdmin = false;

  private destroy$ = new Subject<void>();

  constructor(private revenueService: RevenueService) {}

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.from = today;
    this.to = today;
    this.recomputeDate = today;
    this.isAdmin = (localStorage.getItem('role') ?? '').includes('admin');
    this.runReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Re-fetch when filters change. */
  runReport(): void {
    if (!this.from || !this.to) {
      this.errorMessage = 'Pick from + to dates.';
      return;
    }
    if (this.from > this.to) {
      this.errorMessage = '"From" date must be on or before "To" date.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.revenueService
      .getReport({ by: this.by, from: this.from, to: this.to })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.report = res;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.error || 'Failed to load revenue';
        },
      });
  }

  setBy(by: RevenueGroupBy): void {
    if (this.by === by) return;
    this.by = by;
    this.runReport();
  }

  setRangeToday(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.from = today;
    this.to = today;
    this.runReport();
  }

  setRangeLast7(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 6);
    this.from = past.toISOString().slice(0, 10);
    this.to = today.toISOString().slice(0, 10);
    this.runReport();
  }

  setRangeMonthToDate(): void {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    this.from = first.toISOString().slice(0, 10);
    this.to = today.toISOString().slice(0, 10);
    this.runReport();
  }

  /** Admin-only — recompute the rollup for a specific date. */
  recompute(): void {
    if (!this.recomputeDate) {
      this.recomputeMessage = 'Pick a date.';
      return;
    }
    this.recomputeMessage = '';
    this.revenueService
      .recomputeRollup(this.recomputeDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recomputeMessage = `Rollup rebuilt for ${this.recomputeDate}.`;
          if (this.recomputeDate >= this.from && this.recomputeDate <= this.to) {
            this.runReport();
          }
        },
        error: (err) => {
          this.recomputeMessage = err?.error?.error || 'Recompute failed.';
        },
      });
  }

  /** Format INR. */
  inr(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  }
}
