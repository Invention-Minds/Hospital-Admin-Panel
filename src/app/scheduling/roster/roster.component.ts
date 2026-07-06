import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  SchedulingService,
  Shift,
  ShiftAssignment,
  SchedulingStaff,
  UpsertAssignmentPayload,
} from '../../services/scheduling.service';
import { MastersService, MasterWard } from '../../services/masters.service';
import { AlertService } from '../../services/alert.service';

/**
 * Roster page — `/scheduling/roster`.
 *
 * Date-grid view: each row is a (Ward × Shift) cell for the chosen calendar
 * date; each cell shows the rostered users for that shift in that ward, with
 * their acknowledgement status. The charge nurse clicks an empty cell to
 * assign a user, or clicks a chip to update / cancel an existing assignment.
 *
 * No ward (NULL wardId) is rendered as the "Unassigned ward" row, used for
 * non-ward roles (OT Coordinator, Therapist, etc.) that still get rostered.
 */
@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.css'],
})
export class RosterComponent implements OnInit, OnDestroy {
  date = new Date().toISOString().slice(0, 10);
  wards: MasterWard[] = [];
  shifts: Shift[] = [];
  staff: SchedulingStaff[] = [];
  assignments: ShiftAssignment[] = [];

  // Inline assign form (shown when a cell is clicked).
  cellWardId: string | null = null;
  cellShiftId = '';
  formUserId: number | null = null;
  formNotes = '';
  saving = false;

  loading = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private scheduling: SchedulingService,
    private masters: MastersService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.scheduling.listShifts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.shifts = (r ?? []).filter((s) => s.isActive); },
      error: () => { this.shifts = []; },
    });
    this.scheduling.listStaff().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.staff = r ?? []; },
      error: () => { this.staff = []; },
    });
    this.masters.listWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.wards = r ?? []; },
      error: () => { this.wards = []; },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.scheduling.listAssignments({ from: this.date, to: this.date })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => { this.assignments = rows ?? []; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load roster'; this.loading = false; },
      });
  }

  /** Cell key — used to look up assignments for a (wardId|null, shiftId) cell. */
  cellAssignments(wardId: string | null, shiftId: string): ShiftAssignment[] {
    return this.assignments.filter((a) =>
      (a.wardId ?? null) === wardId
      && a.shiftId === shiftId
      && a.status !== 'CANCELLED',
    );
  }

  openCell(wardId: string | null, shiftId: string): void {
    this.cellWardId = wardId;
    this.cellShiftId = shiftId;
    this.formUserId = null;
    this.formNotes = '';
    this.errorMessage = '';
    this.successMessage = '';
  }
  closeCell(): void {
    this.cellShiftId = '';
    this.cellWardId = null;
  }

  assign(): void {
    if (!this.cellShiftId || !this.formUserId) {
      this.errorMessage = 'Pick a staff member.';
      return;
    }
    this.saving = true;
    const payload: UpsertAssignmentPayload = {
      userId: this.formUserId,
      shiftId: this.cellShiftId,
      wardId: this.cellWardId,
      date: this.date,
      notes: this.formNotes || undefined,
    };
    this.scheduling.createAssignment(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = 'Staff rostered.';
          this.closeCell();
          this.refresh();
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = e?.error?.error || 'Roster failed';
        },
      });
  }

  async cancelAssignment(a: ShiftAssignment): Promise<void> {
    if (!await this.alertSvc.confirm(`Cancel ${a.user?.username ?? 'this user'}'s ${a.shift?.name} shift?`, { severity: 'warning', confirmLabel: 'Cancel shift' })) return;
    this.scheduling.deleteAssignment(a.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = 'Cancelled.'; this.refresh(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Cancel failed'; },
      });
  }

  staffLabel(s: SchedulingStaff): string {
    const role = s.subAdminType ?? s.role;
    return `${s.username} · ${role}${s.employeeId ? ' (' + s.employeeId + ')' : ''}`;
  }

  statusClass(a: ShiftAssignment): string {
    switch (a.status) {
      case 'ACKNOWLEDGED': return 'rs-pill rs-ok';
      case 'COMPLETED': return 'rs-pill rs-info';
      case 'NO_SHOW': return 'rs-pill rs-bad';
      case 'CANCELLED': return 'rs-pill rs-muted';
      default: return 'rs-pill';
    }
  }
}
