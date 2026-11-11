import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  DIAGNOSIS_SPECIALTIES,
  DiagnosisCodeMaster,
  DiagnosisCodeMasterCategory,
  DiagnosisCodeMasterService,
  DiagnosisSpecialty,
} from '../../services/diagnosis-code-master.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.4a — ICD-10 + CPT master catalog management page.
 *
 * MRD team curates the list here; admission-level `AdmissionDiagnosisCode`
 * rows take a denormalised snapshot of code+description at write time.
 * Route: /masters/diagnosis-codes
 */
@Component({
  selector: 'app-diagnosis-code-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diagnosis-code-master.component.html',
  styleUrls: ['./diagnosis-code-master.component.css'],
})
export class DiagnosisCodeMasterComponent implements OnInit, OnDestroy {
  activeTab: DiagnosisCodeMasterCategory = 'icd';
  rows: DiagnosisCodeMaster[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  search = '';
  /** List filter: '' = all, 'general' = untagged, or a specialty. */
  specialtyFilter: DiagnosisSpecialty | 'general' | '' = '';
  readonly specialties = DIAGNOSIS_SPECIALTIES;

  draft: { code: string; description: string; specialty: DiagnosisSpecialty | null } = { code: '', description: '', specialty: null };
  selected: DiagnosisCodeMaster | null = null;

  private destroy$ = new Subject<void>();

  constructor(private svc: DiagnosisCodeMasterService, private alertSvc: AlertService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.list({ category: this.activeTab, specialty: this.specialtyFilter || undefined, search: this.search, limit: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { this.rows = r.data; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
      });
  }

  setTab(tab: DiagnosisCodeMasterCategory): void {
    this.activeTab = tab;
    this.cancelEdit();
    this.search = '';
    this.load();
  }

  edit(row: DiagnosisCodeMaster): void {
    this.selected = row;
    this.draft = { code: row.code, description: row.description, specialty: row.specialty ?? null };
  }

  cancelEdit(): void {
    this.selected = null;
    this.draft = { code: '', description: '', specialty: null };
  }

  specialtyLabel(value: DiagnosisSpecialty | null): string {
    return this.specialties.find((s) => s.value === value)?.label ?? 'General';
  }

  save(): void {
    if (!this.draft.code.trim() || !this.draft.description.trim()) {
      this.errorMessage = 'Code and description are required';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const body = {
      category: this.activeTab,
      code: this.draft.code.trim(),
      description: this.draft.description.trim(),
      specialty: this.draft.specialty,
    };
    const op = this.selected
      ? this.svc.update(this.selected.id, body)
      : this.svc.create(body);
    op.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.selected ? 'Updated.' : 'Created.';
        this.cancelEdit();
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.errorMessage = e?.error?.message || 'Save failed';
      },
    });
  }

  async remove(row: DiagnosisCodeMaster): Promise<void> {
    if (!await this.alertSvc.confirm(`Deactivate ${row.code}? (Existing admission codes remain intact.)`, { severity: 'warning', confirmLabel: 'Deactivate' })) return;
    this.svc.remove(row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.load(),
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to remove'; },
      });
  }
}
