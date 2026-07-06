import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  EquipmentUtilizationRow,
  OtReportsService,
  SurgeryRegisterRow,
  TimeBookedVsActualRow,
  TimeReportMeta,
} from '../../services/ot-reports.service';

/**
 * Phase 9.3a — OT reports page.
 *
 * Three tabs:
 *   * Surgery Register         — listing of all scheduled surgeries in range
 *   * Equipment Utilization    — sum of usedMinutes per equipment, # of uses
 *   * OT Time Booked vs Actual — per-schedule planned-vs-actual + start delay
 *
 * Route: /surgery-ot/reports
 */
@Component({
  selector: 'app-ot-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-reports.component.html',
  styleUrls: ['./ot-reports.component.css'],
})
export class OtReportsComponent implements OnInit, OnDestroy {
  activeTab: 'register' | 'equipment' | 'time' = 'register';

  // Default to last 30 days
  fromDate = '';
  toDate = '';

  register: SurgeryRegisterRow[] = [];
  equipment: EquipmentUtilizationRow[] = [];
  time: TimeBookedVsActualRow[] = [];
  timeMeta: TimeReportMeta | null = null;

  loading = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: OtReportsService) {}

  ngOnInit(): void {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    this.toDate = today.toISOString().slice(0, 10);
    this.fromDate = monthAgo.toISOString().slice(0, 10);
    this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    const filters = { fromDate: this.fromDate, toDate: this.toDate };

    if (this.activeTab === 'register') {
      this.svc.surgeryRegister(filters).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.register = r.data; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load surgery register'; this.loading = false; },
      });
    } else if (this.activeTab === 'equipment') {
      this.svc.equipmentUtilization(filters).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.equipment = r.data; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load equipment utilization'; this.loading = false; },
      });
    } else {
      this.svc.timeBookedVsActual(filters).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.time = r.data; this.timeMeta = r.meta; this.loading = false; },
        error: () => { this.errorMessage = 'Failed to load time-booked-vs-actual'; this.loading = false; },
      });
    }
  }

  setTab(tab: 'register' | 'equipment' | 'time'): void {
    this.activeTab = tab;
    this.load();
  }

  deltaClass(delta: number | null): string {
    if (delta === null) return '';
    if (delta > 15) return 'rpt-delta-bad';
    if (delta < -5) return 'rpt-delta-good';
    return 'rpt-delta-ok';
  }

  exportCsv(): void {
    let rows: Array<Record<string, unknown>> = [];
    let filename = 'ot-report.csv';

    if (this.activeTab === 'register') {
      rows = this.register as unknown as Array<Record<string, unknown>>;
      filename = `surgery-register-${this.fromDate}_${this.toDate}.csv`;
    } else if (this.activeTab === 'equipment') {
      rows = this.equipment as unknown as Array<Record<string, unknown>>;
      filename = `equipment-utilization-${this.fromDate}_${this.toDate}.csv`;
    } else {
      rows = this.time as unknown as Array<Record<string, unknown>>;
      filename = `time-booked-vs-actual-${this.fromDate}_${this.toDate}.csv`;
    }
    if (!rows.length) return;

    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
