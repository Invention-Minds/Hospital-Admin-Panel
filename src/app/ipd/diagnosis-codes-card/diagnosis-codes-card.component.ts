import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  AdmissionDiagnosisCode, DiagnosisCodeCategory, DiagnosisCodeService,
} from '../../services/diagnosis-code.service';
import {
  DiagnosisCodeMaster, DiagnosisCodeMasterService,
} from '../../services/diagnosis-code-master.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.3c — ICD-10 + CPT codes editor card.
 *
 * Mirrors the reference HMIS "Update Patient's Diagnosis" screen:
 *   * ICD Codes (Provisional / Final tabs)
 *   * CPT Codes
 * Embedded on the Discharge Summary page; can be used standalone too.
 */
@Component({
  selector: 'app-diagnosis-codes-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diagnosis-codes-card.component.html',
  styleUrls: ['./diagnosis-codes-card.component.css'],
})
export class DiagnosisCodesCardComponent implements OnChanges, OnDestroy {
  @Input() admissionId = '';

  rows: AdmissionDiagnosisCode[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  activeIcdTab: 'icd-provisional' | 'icd-final' = 'icd-provisional';

  draftIcd = { code: '', description: '' };
  draftCpt = { code: '', description: '' };

  // Phase 9.4a — autocomplete suggestions from the master
  icdSuggestions: DiagnosisCodeMaster[] = [];
  cptSuggestions: DiagnosisCodeMaster[] = [];
  showIcdDropdown = false;
  showCptDropdown = false;

  private destroy$ = new Subject<void>();

  constructor(
    private svc: DiagnosisCodeService,
    private masterSvc: DiagnosisCodeMasterService,
    private alertSvc: AlertService,
  ) {}

  ngOnChanges(c: SimpleChanges): void {
    if (c['admissionId'] && this.admissionId) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.list(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load codes'; this.loading = false; },
    });
  }

  rowsByCategory(category: DiagnosisCodeCategory): AdmissionDiagnosisCode[] {
    return this.rows.filter((r) => r.category === category);
  }

  /** Phase 9.4a — debounced master lookup as the user types. */
  searchIcd(): void {
    const q = (this.draftIcd.code + ' ' + this.draftIcd.description).trim();
    if (q.length < 2) { this.icdSuggestions = []; this.showIcdDropdown = false; return; }
    this.masterSvc.list({ category: 'icd', search: q, limit: 12 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { this.icdSuggestions = r.data; this.showIcdDropdown = r.data.length > 0; },
      });
  }

  pickIcd(row: DiagnosisCodeMaster): void {
    this.draftIcd = { code: row.code, description: row.description };
    this.showIcdDropdown = false;
  }

  searchCpt(): void {
    const q = (this.draftCpt.code + ' ' + this.draftCpt.description).trim();
    if (q.length < 2) { this.cptSuggestions = []; this.showCptDropdown = false; return; }
    this.masterSvc.list({ category: 'cpt', search: q, limit: 12 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { this.cptSuggestions = r.data; this.showCptDropdown = r.data.length > 0; },
      });
  }

  pickCpt(row: DiagnosisCodeMaster): void {
    this.draftCpt = { code: row.code, description: row.description };
    this.showCptDropdown = false;
  }

  addIcd(): void {
    if (!this.draftIcd.code.trim() || !this.draftIcd.description.trim()) return;
    this.saving = true;
    this.svc.add(this.admissionId, {
      category: this.activeIcdTab,
      code: this.draftIcd.code.trim(),
      description: this.draftIcd.description.trim(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.draftIcd = { code: '', description: '' };
        this.saving = false;
        this.successMessage = 'ICD code added.';
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to add'; },
    });
  }

  addCpt(): void {
    if (!this.draftCpt.code.trim() || !this.draftCpt.description.trim()) return;
    this.saving = true;
    this.svc.add(this.admissionId, {
      category: 'cpt',
      code: this.draftCpt.code.trim(),
      description: this.draftCpt.description.trim(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.draftCpt = { code: '', description: '' };
        this.saving = false;
        this.successMessage = 'CPT code added.';
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to add'; },
    });
  }

  async remove(row: AdmissionDiagnosisCode): Promise<void> {
    if (!await this.alertSvc.confirm(`Remove ${row.category} code ${row.code}?`, { severity: 'warning', confirmLabel: 'Remove' })) return;
    this.svc.remove(this.admissionId, row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.load(),
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to remove'; },
      });
  }
}
