import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  AppointmentEventReport,
  AppointmentHistoryService,
} from '../../services/appointment-history.service';

/**
 * Reschedule & Cancellation report tab.
 *
 * Surfaces the backend /api/appointments/reschedule-report aggregate: who
 * reschedules and cancels, for which doctors, and how much of it is staff
 * action versus the automated no-show cancel. Defaults to the last 30 days.
 */
type Breakdown = 'actor' | 'doctor' | 'source';

@Component({
  selector: 'app-reschedule-report',
  templateUrl: './reschedule-report.component.html',
  styleUrl: './reschedule-report.component.css',
})
export class RescheduleReportComponent implements OnInit, OnDestroy {
  isLoading = false;
  errorMessage = '';

  from = ''; // YYYY-MM-DD
  to = '';
  breakdown: Breakdown = 'actor';

  report: AppointmentEventReport | null = null;

  // Pagination over the active breakdown table — same controls as the
  // appointment tables.
  currentPage = 1;
  itemsPerPage = 10;

  private destroy$ = new Subject<void>();

  constructor(private historyService: AppointmentHistoryService) {}

  ngOnInit(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 29);
    this.from = this.ymd(past);
    this.to = this.ymd(today);
    this.runReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  runReport(): void {
    if (!this.from || !this.to) {
      this.errorMessage = 'Pick from + to dates.';
      return;
    }
    if (this.from > this.to) {
      this.errorMessage = '"From" date must be on or before "To" date.';
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    this.historyService
      .getReport({ from: this.from, to: this.to })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.report = res;
          this.currentPage = 1;
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.report = null;
          this.errorMessage =
            err?.error?.error || 'Failed to load the reschedule report.';
        },
      });
  }

  setBreakdown(breakdown: Breakdown): void {
    if (this.breakdown === breakdown) return;
    this.breakdown = breakdown;
    this.currentPage = 1;
  }

  setRangeToday(): void {
    const today = this.ymd(new Date());
    this.from = today;
    this.to = today;
    this.runReport();
  }

  setRangeLast7(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 6);
    this.from = this.ymd(past);
    this.to = this.ymd(today);
    this.runReport();
  }

  setRangeLast30(): void {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 29);
    this.from = this.ymd(past);
    this.to = this.ymd(today);
    this.runReport();
  }

  refresh(): void {
    this.runReport();
  }

  /** Column header for the first column of the active breakdown table. */
  get breakdownLabel(): string {
    if (this.breakdown === 'doctor') return 'Doctor';
    if (this.breakdown === 'source') return 'Source';
    return 'Staff member';
  }

  get rows() {
    if (!this.report) return [];
    if (this.breakdown === 'doctor') return this.report.byDoctor;
    if (this.breakdown === 'source') return this.report.bySource;
    return this.report.byActor;
  }

  getPaginatedRows() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.rows.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.rows.length / this.itemsPerPage));
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  onPageChange(): void {
    if (this.currentPage < 1) this.currentPage = 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  /** Same label mapping as the history popup, kept readable for the front desk. */
  sourceLabel(source: string | number): string {
    switch (String(source)) {
      case 'admin-panel': return 'Admin panel';
      case 'walk-in': return 'Walk-in';
      case 'whatsapp-bot': return 'WhatsApp bot';
      case 'cron:expired-3h': return 'Auto (no-show 3h)';
      case 'cron:mark-complete': return 'Auto (end of day)';
      case 'service-close': return 'Service closed';
      case 'followup-automation': return 'Follow-up automation';
      case 'scheduled-completion': return 'Auto (scheduled)';
      case 'unknown': return 'Unknown';
      default: return String(source);
    }
  }

  rowLabel(label: string): string {
    return this.breakdown === 'source' ? this.sourceLabel(label) : label;
  }

  private ymd(d: Date): string {
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }
}
