import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  NurseStaffService, NurseRow, NurseDesignation, NurseListFilters,
  NurseCreateBody, NurseUpdateBody,
  NURSE_DESIGNATIONS, OT_ELIGIBLE_DESIGNATIONS,
} from '../../services/nurse-staff.service';
import { WardManagementService, Ward } from '../../services/ward-management.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.10 — Nurse / clinical-staff admin.
 *
 * Top-level page at /staff/nurses. A "nurse" here is a User row with
 * subAdminType='nurse' plus the profile fields added in Phase 9.10.
 * Picking an OT-eligible designation enables a "Sync to OT staff" action
 * that mirrors the row into OtStaffMaster so the OT pickers can find them.
 */
@Component({
  selector: 'app-nurses-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nurses-admin.component.html',
  styleUrls: ['./nurses-admin.component.css'],
})
export class NursesAdminComponent implements OnInit, OnDestroy {
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  rows: NurseRow[] = [];
  wards: Ward[] = [];

  readonly designations = NURSE_DESIGNATIONS;
  readonly otEligibleDesignations = OT_ELIGIBLE_DESIGNATIONS;

  // Filters
  filters: NurseListFilters = {
    search: '',
    designation: '',
    wardId: '',
    includeInactive: false,
  };

  // Editor state — null = closed
  editing: NurseRow | null | 'new' = null;
  draft = this.emptyDraft();

  private destroy$ = new Subject<void>();

  constructor(
    private nurses: NurseStaffService,
    private wardSvc: WardManagementService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.loadWards();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Data ─────────────────────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.nurses.list(this.filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.loading = false; },
      error: (e) => {
        this.errorMessage = e?.error?.message ?? 'Failed to load nurses';
        this.loading = false;
      },
    });
  }

  private loadWards(): void {
    this.wardSvc.getAllWards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (w) => { this.wards = w || []; },
      error: () => { this.wards = []; },
    });
  }

  applyFilters(): void { this.load(); }
  clearFilters(): void {
    this.filters = { search: '', designation: '', wardId: '', includeInactive: false };
    this.load();
  }

  // ─── Editor ───────────────────────────────────────────────────────────

  openCreate(): void {
    this.editing = 'new';
    this.draft = this.emptyDraft();
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEdit(row: NurseRow): void {
    this.editing = row;
    this.draft = {
      username: row.username,
      password: '', // not used on edit
      employeeId: row.employeeId ?? '',
      fullName: row.fullName ?? '',
      designation: (row.designation ?? 'Staff Nurse') as NurseDesignation,
      qualification: row.qualification ?? '',
      phoneNumber: row.phoneNumber ?? '',
      primaryWardId: row.primaryWardId ?? '',
      joiningDate: row.joiningDate ? row.joiningDate.slice(0, 10) : '',
      dateOfBirth: row.dateOfBirth ? row.dateOfBirth.slice(0, 10) : '',
      isActive: row.isActive,
    };
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditor(): void {
    this.editing = null;
    this.draft = this.emptyDraft();
  }

  save(): void {
    if (this.saving) return;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.draft.fullName.trim()) { this.errorMessage = 'Full name is required'; return; }
    if (!this.draft.designation) { this.errorMessage = 'Designation is required'; return; }

    if (this.editing === 'new') {
      if (!this.draft.username.trim()) { this.errorMessage = 'Username is required'; return; }
      if (!this.draft.password || this.draft.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters';
        return;
      }
      const body: NurseCreateBody = {
        username: this.draft.username.trim(),
        password: this.draft.password,
        employeeId: this.draft.employeeId.trim() || null,
        fullName: this.draft.fullName.trim(),
        designation: this.draft.designation,
        qualification: this.draft.qualification.trim() || null,
        phoneNumber: this.draft.phoneNumber.trim() || null,
        primaryWardId: this.draft.primaryWardId || null,
        joiningDate: this.draft.joiningDate || null,
        dateOfBirth: this.draft.dateOfBirth || null,
        isActive: this.draft.isActive,
      };
      this.saving = true;
      this.nurses.create(body).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = `Nurse "${body.fullName}" created`;
          this.closeEditor();
          this.load();
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = e?.error?.message ?? 'Failed to create nurse';
        },
      });
    } else if (this.editing) {
      const id = this.editing.id;
      const body: NurseUpdateBody = {
        employeeId: this.draft.employeeId.trim() || null,
        fullName: this.draft.fullName.trim(),
        designation: this.draft.designation,
        qualification: this.draft.qualification.trim() || null,
        phoneNumber: this.draft.phoneNumber.trim() || null,
        primaryWardId: this.draft.primaryWardId || null,
        joiningDate: this.draft.joiningDate || null,
        dateOfBirth: this.draft.dateOfBirth || null,
        isActive: this.draft.isActive,
      };
      this.saving = true;
      this.nurses.update(id, body).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = 'Nurse updated';
          this.closeEditor();
          this.load();
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = e?.error?.message ?? 'Failed to update nurse';
        },
      });
    }
  }

  // ─── Row actions ──────────────────────────────────────────────────────

  async deactivate(row: NurseRow): Promise<void> {
    if (!await this.alertSvc.confirm(`Deactivate ${row.fullName ?? row.username}? They will no longer be able to log in or be assigned shifts.`, { severity: 'warning', confirmLabel: 'Deactivate' })) return;
    this.nurses.deactivate(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage = `${row.fullName ?? row.username} deactivated`;
        this.load();
      },
      error: (e) => { this.errorMessage = e?.error?.message ?? 'Failed to deactivate'; },
    });
  }

  async resetPassword(row: NurseRow): Promise<void> {
    const pwd = await this.alertSvc.prompt(`Reset password for ${row.fullName ?? row.username}.\nEnter a new password (min 6 characters):`, { title: 'Reset password', inputType: 'password', placeholder: 'New password', confirmLabel: 'Reset' });
    if (!pwd) return;
    if (pwd.length < 6) { this.errorMessage = 'Password must be at least 6 characters'; return; }
    this.nurses.resetPassword(row.id, pwd).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = `Password reset for ${row.fullName ?? row.username}`; },
      error: (e) => { this.errorMessage = e?.error?.message ?? 'Failed to reset password'; },
    });
  }

  syncToOt(row: NurseRow): void {
    this.nurses.syncToOtStaff(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage = `${row.fullName ?? row.username} synced to OT staff master`;
        this.load();
      },
      error: (e) => { this.errorMessage = e?.error?.message ?? 'Failed to sync to OT staff'; },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  isOtEligible(designation: NurseDesignation | null): boolean {
    if (!designation) return false;
    return (this.otEligibleDesignations as readonly NurseDesignation[]).includes(designation);
  }

  hasOtMirror(row: NurseRow): boolean {
    return !!row.otStaffMasters?.some((m) => m.isActive);
  }

  wardLabel(wardId: string | null | undefined): string {
    if (!wardId) return '—';
    const w = this.wards.find((x) => x.id === wardId);
    return w ? `${w.wardName} (${w.wardCode})` : wardId;
  }

  private emptyDraft() {
    return {
      username: '',
      password: '',
      employeeId: '',
      fullName: '',
      designation: 'Staff Nurse' as NurseDesignation,
      qualification: '',
      phoneNumber: '',
      primaryWardId: '',
      joiningDate: '',
      dateOfBirth: '',
      isActive: true,
    };
  }
}
