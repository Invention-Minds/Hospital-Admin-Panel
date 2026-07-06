import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

import {
  DischargeClearanceService, QueueRow, DischargeDepartment, DISCHARGE_DEPARTMENTS,
} from '../../services/discharge-clearance.service';

/**
 * Phase D — Per-department clearance queue.
 *
 * Route: /discharge/queue/:dept  (DEPT in OT|BILLING|NURSING|PHARMACY|LAB_RAD|DIET|MLC).
 * Each coordinator opens this; rows are pending DischargeClearance entries
 * for their department across every active admission. Auto-refreshes every
 * 30s so a freshly-signed discharge appears without manual reload.
 */
@Component({
  selector: 'app-discharge-dept-queue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './discharge-dept-queue.component.html',
  styleUrls: ['./discharge-dept-queue.component.css'],
})
export class DischargeDeptQueueComponent implements OnInit, OnDestroy {
  dept: DischargeDepartment | '' = '';
  rows: QueueRow[] = [];
  loading = false;
  errorMessage = '';

  readonly DEPARTMENTS = DISCHARGE_DEPARTMENTS;
  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private router: Router, private svc: DischargeClearanceService) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((m) => {
      const d = (m.get('dept') ?? '').toUpperCase();
      if (!DISCHARGE_DEPARTMENTS.includes(d as DischargeDepartment)) {
        this.errorMessage = `Unknown department: ${d}`;
        this.dept = '';
        return;
      }
      this.dept = d as DischargeDepartment;
      this.startPolling();
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private startPolling(): void {
    if (!this.dept) return;
    interval(30000)
      .pipe(startWith(0), takeUntil(this.destroy$), switchMap(() => this.svc.departmentQueue(this.dept as DischargeDepartment)))
      .subscribe({
        next: (r) => { this.rows = r.data ?? []; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load queue'; this.loading = false; },
      });
  }

  switchDept(d: DischargeDepartment): void { this.router.navigate(['/discharge/queue', d]); }
}
