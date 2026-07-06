import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OtTemplate, OtTemplatesService } from '../../services/ot-templates.service';
import { MastersService, MasterDepartment } from '../../services/masters.service';

/**
 * Phase 9.2 — OT Notes Templates manager.
 *
 * Two tabs:
 *   1. Surgical Notes templates — boilerplate for the operative note
 *   2. Other Notes templates    — free-form clinical notes
 *
 * Route: /surgery-ot/templates
 */
@Component({
  selector: 'app-ot-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-templates.component.html',
  styleUrls: ['./ot-templates.component.css'],
})
export class OtTemplatesComponent implements OnInit, OnDestroy {
  activeTab: 'surgical' | 'other' = 'surgical';

  surgical: OtTemplate[] = [];
  other: OtTemplate[] = [];
  departments: MasterDepartment[] = [];

  selected: OtTemplate | null = null;
  isNew = false;

  draft = { name: '', departmentId: null as number | null, bodyTemplate: '', isActive: true };

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private svc: OtTemplatesService,
    private masters: MastersService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.masters.listDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.departments = r; },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.listSurgical().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.surgical = r.data; },
      error: () => { this.errorMessage = 'Failed to load surgical templates'; },
    });
    this.svc.listOther().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.other = r.data; this.loading = false; },
      error: () => { this.errorMessage = 'Failed to load other templates'; this.loading = false; },
    });
  }

  newTemplate(): void {
    this.isNew = true;
    this.selected = null;
    this.draft = { name: '', departmentId: null, bodyTemplate: '', isActive: true };
  }

  edit(row: OtTemplate): void {
    this.isNew = false;
    this.selected = row;
    this.draft = {
      name: row.name,
      departmentId: row.departmentId,
      bodyTemplate: row.bodyTemplate,
      isActive: row.isActive,
    };
  }

  cancel(): void {
    this.isNew = false;
    this.selected = null;
  }

  save(): void {
    if (!this.draft.name.trim() || !this.draft.bodyTemplate.trim()) {
      this.errorMessage = 'Name and body are required';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const body = {
      name: this.draft.name.trim(),
      departmentId: this.draft.departmentId,
      bodyTemplate: this.draft.bodyTemplate,
      isActive: this.draft.isActive,
    };
    const op = this.activeTab === 'surgical'
      ? (this.selected
          ? this.svc.updateSurgical(this.selected.id, body)
          : this.svc.createSurgical(body))
      : (this.selected
          ? this.svc.updateOther(this.selected.id, body)
          : this.svc.createOther(body));
    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.selected ? 'Updated.' : 'Created.';
        this.cancel();
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.message || 'Save failed';
      },
    });
  }

  list(): OtTemplate[] {
    return this.activeTab === 'surgical' ? this.surgical : this.other;
  }

  setTab(tab: 'surgical' | 'other'): void {
    this.activeTab = tab;
    this.cancel();
  }
}
