import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OtWorkflowService, OtSchedule, OtScheduleStatus } from '../../services/ot-workflow.service';

interface WorkbenchAction {
  key: string;
  label: string;
  /** route segments appended to /surgery-ot/:id — leave empty to open the detail screen. */
  route: string[];
  /** Optional query params. */
  queryParams?: Record<string, string>;
  /** Disable when no schedule selected. */
  needsSchedule?: boolean;
}

/**
 * Phase 9.5g — Unified OT Workbench.
 *
 * Mirrors the reference HMIS "Operation Theatre Workbench" shell: a
 * filter strip on top, a date-ranged schedules grid on the left, and a
 * vertical 14-button sidebar on the right that navigates to each
 * sub-feature (Order Surgeries, Equipments, Drugs & Consumables,
 * Surgical Notes, Other Notes, Discharge Summary, View Issued Drugs,
 * Archives, Print, Emrg Surgery Charges, …).
 *
 * Route: /surgery-ot/workbench
 */
@Component({
  selector: 'app-ot-workbench',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ot-workbench.component.html',
  styleUrls: ['./ot-workbench.component.css'],
})
export class OtWorkbenchComponent implements OnInit, OnDestroy {
  filterDate = '';
  filterStatus: OtScheduleStatus | '' = '';
  filterSurgeon = '';
  filterPrn = '';

  schedules: OtSchedule[] = [];
  selected: OtSchedule | null = null;

  loading = false;
  errorMessage = '';

  readonly actions: WorkbenchAction[] = [
    { key: 'order-surgeries', label: 'Order Surgeries', route: ['/estimation'], needsSchedule: false },
    { key: 'time-schedule', label: 'Time Schedule', route: [], needsSchedule: true },
    { key: 'surgery', label: 'Surgery', route: [], needsSchedule: true },
    { key: 'surgeon', label: 'Surgeon', route: [], needsSchedule: true },
    { key: 'equipments', label: 'Equipments', route: [], needsSchedule: true },
    { key: 'drugs', label: 'Drugs & Consumables', route: [], needsSchedule: true },
    { key: 'checklist', label: 'Surgery CheckList', route: [], needsSchedule: true },
    { key: 'surgical-notes', label: 'Surgical Notes', route: [], needsSchedule: true },
    { key: 'other-notes', label: 'Other Notes', route: [], needsSchedule: true },
    { key: 'discharge', label: 'Discharge Summary', route: ['discharge-summary'], needsSchedule: true },
    { key: 'issued-drugs', label: 'View Issued Drugs', route: ['issued-drugs'], needsSchedule: true },
    { key: 'archives', label: 'Archives', route: ['archives'], needsSchedule: true },
    { key: 'print', label: 'Print', route: ['print'], queryParams: { form: 'operative-note' }, needsSchedule: true },
    { key: 'emrg', label: 'Emrg Surgery Charges', route: ['emrg-charges'], needsSchedule: true },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: OtWorkflowService,
  ) {}

  ngOnInit(): void {
    const today = new Date();
    this.filterDate = today.toISOString().slice(0, 10);
    this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.listSchedules({
      date: this.filterDate || undefined,
      status: this.filterStatus || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        // Client-side filter for surgeon + PRN (backend doesn't expose those filters yet)
        let filtered = r;
        if (this.filterSurgeon) {
          const q = this.filterSurgeon.toLowerCase();
          filtered = filtered.filter((s) => (s.surgeonName || '').toLowerCase().includes(q));
        }
        if (this.filterPrn) {
          const q = this.filterPrn.toLowerCase();
          filtered = filtered.filter((s) => (s.prn || '').toLowerCase().includes(q));
        }
        this.schedules = filtered;
        if (this.selected && !filtered.find((s) => s.id === this.selected!.id)) this.selected = null;
        this.loading = false;
      },
      error: () => { this.errorMessage = 'Failed to load schedules'; this.loading = false; },
    });
  }

  select(s: OtSchedule): void { this.selected = s; }

  triggerAction(a: WorkbenchAction): void {
    if (a.needsSchedule && !this.selected) {
      this.flashError('Select a schedule first');
      return;
    }
    // Actions that depend on an external link (estimation / admission / PRN).
    // These have no valid /surgery-ot/:id child route, so when the link is
    // missing we must surface an error rather than fall through to a dead URL
    // (which the wildcard route would bounce to /login → doctor-appointments).
    if (a.key === 'order-surgeries') {
      if (!this.selected?.estimationId) { this.flashError('No estimation linked to this schedule'); return; }
      this.router.navigate(['/estimation', this.selected.estimationId, 'order-surgeries']);
      return;
    }
    if (a.key === 'archives') {
      if (!this.selected?.prn) { this.flashError('No PRN on this schedule'); return; }
      this.router.navigate(['/surgery-ot/archives', this.selected.prn]);
      return;
    }
    if (a.key === 'discharge') {
      if (!this.selected?.admissionId) { this.flashError('No admission linked to this schedule'); return; }
      this.router.navigate(['/surgery-ot/admission', this.selected.admissionId, 'discharge-summary']);
      return;
    }
    if (!a.route.length) {
      // Open the per-schedule detail page (tabs handle the sub-feature)
      this.router.navigate(['/surgery-ot', this.selected!.id], { queryParams: { tab: a.key } });
      return;
    }
    // Per-schedule sub-route
    this.router.navigate(['/surgery-ot', this.selected!.id, ...a.route], { queryParams: a.queryParams });
  }

  private flashError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => (this.errorMessage = ''), 2500);
  }

  statusPillClass(s: OtScheduleStatus): string { return `ow-status-${s}`; }
}
