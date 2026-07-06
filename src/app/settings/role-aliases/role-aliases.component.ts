import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { RoleAlias, RoleAliasCreateBody, RoleAliasService } from '../../services/role-alias.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 6 / Batch A — Notification target-role alias admin.
 * Route: /settings/role-aliases
 *
 * Maps spec strings ("Quality Manager", "grievance_officer", …) to real
 * Notification.targetRole values. Edit here when you need to re-route a
 * bell without a code change.
 */
@Component({
  selector: 'app-role-aliases',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-aliases.component.html',
  styleUrls: ['./role-aliases.component.css'],
})
export class RoleAliasesComponent implements OnInit, OnDestroy {
  rows: RoleAlias[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  draft: RoleAliasCreateBody = { alias: '', targetRole: 'admin', isActive: true, notes: '' };

  // Known real values for the dropdown — matches the User.role enum + a few
  // common subAdminType candidates the system already uses.
  readonly KNOWN_ROLES = ['super_admin', 'admin', 'sub_admin', 'doctor'];

  private destroy$ = new Subject<void>();

  constructor(private svc: RoleAliasService, private alertSvc: AlertService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load aliases'; this.loading = false; },
    });
  }

  submitNew(): void {
    if (!this.draft.alias.trim() || !this.draft.targetRole.trim()) {
      this.errorMessage = 'Alias and targetRole are required'; return;
    }
    this.saving = true;
    this.errorMessage = ''; this.successMessage = '';
    this.svc.create({
      alias: this.draft.alias.trim(),
      targetRole: this.draft.targetRole.trim(),
      isActive: this.draft.isActive !== false,
      notes: this.draft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Added';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.draft = { alias: '', targetRole: 'admin', isActive: true, notes: '' };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to add'; },
    });
  }

  saveRow(r: RoleAlias): void {
    this.svc.update(r.id, {
      targetRole: r.targetRole,
      isActive: r.isActive,
      notes: r.notes,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = `Saved ${r.alias}`; setTimeout(() => (this.successMessage = ''), 2000); },
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to save'),
    });
  }

  async deleteRow(r: RoleAlias): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete alias "${r.alias}"? Notifications will fall back to the literal string.`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.delete(r.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }
}
