import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { DiagnosisCodeService, AdmissionDiagnosisCode, DiagnosisCodeCategory } from '../../services/diagnosis-code.service';
import { DiagnosisCodeMasterService, DiagnosisCodeMaster } from '../../services/diagnosis-code-master.service';

/**
 * Phase 9.5e — Update Patient's Diagnosis (ICD + CPT) modal.
 *
 * Two columns matching the reference HMIS screen:
 *   * ICD Codes  — Provisional / Final inner tabs
 *   * CPT Codes  — procedure codes
 *
 * Master codes drive autocomplete on both panels. Selected rows post to
 * AdmissionDiagnosisCode keyed by admissionId.
 *
 * Route: /surgery-ot/admission/:admissionId/diagnosis
 */
@Component({
  selector: 'app-ot-diagnosis-update',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ot-diagnosis-update.component.html',
  styleUrls: ['./ot-diagnosis-update.component.css'],
})
export class OtDiagnosisUpdateComponent implements OnInit, OnDestroy {
  admissionId = '';
  icdTab: 'icd-provisional' | 'icd-final' = 'icd-provisional';

  rows: AdmissionDiagnosisCode[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Search state (per-panel)
  icdSearch = '';
  cptSearch = '';
  icdMaster: DiagnosisCodeMaster[] = [];
  cptMaster: DiagnosisCodeMaster[] = [];

  private icdSearch$ = new Subject<string>();
  private cptSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: DiagnosisCodeService,
    private masterSvc: DiagnosisCodeMasterService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (!this.admissionId) {
      this.errorMessage = 'Missing admissionId';
      return;
    }
    this.icdSearch$.pipe(takeUntil(this.destroy$), debounceTime(250)).subscribe((q) => this.loadMaster('icd', q));
    this.cptSearch$.pipe(takeUntil(this.destroy$), debounceTime(250)).subscribe((q) => this.loadMaster('cpt', q));
    this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.svc.list(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.loading = false; },
      error: () => { this.errorMessage = 'Failed to load diagnosis codes'; this.loading = false; },
    });
  }

  loadMaster(category: 'icd' | 'cpt', search: string): void {
    if (!search.trim()) {
      if (category === 'icd') this.icdMaster = [];
      else this.cptMaster = [];
      return;
    }
    this.masterSvc.list({ category, search: search.trim(), limit: 25 }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        if (category === 'icd') this.icdMaster = r.data;
        else this.cptMaster = r.data;
      },
    });
  }

  onIcdSearch(q: string): void { this.icdSearch = q; this.icdSearch$.next(q); }
  onCptSearch(q: string): void { this.cptSearch = q; this.cptSearch$.next(q); }

  rowsByCategory(cat: DiagnosisCodeCategory): AdmissionDiagnosisCode[] {
    return this.rows.filter((r) => r.category === cat);
  }

  addCode(category: DiagnosisCodeCategory, m: DiagnosisCodeMaster): void {
    if (this.rowsByCategory(category).some((r) => r.code === m.code)) {
      this.errorMessage = `${m.code} already added.`;
      setTimeout(() => (this.errorMessage = ''), 2500);
      return;
    }
    this.saving = true;
    this.svc.add(this.admissionId, { category, code: m.code, description: m.description })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.rows = [...this.rows, r.data];
          this.saving = false;
          this.successMessage = `${m.code} added.`;
          setTimeout(() => (this.successMessage = ''), 2000);
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = e?.error?.message || 'Failed to add code';
        },
      });
  }

  /** Manual entry — when the user types a code not in the master. */
  addManual(category: DiagnosisCodeCategory, code: string, description: string): void {
    if (!code.trim() || !description.trim()) {
      this.errorMessage = 'Code and description are required';
      return;
    }
    this.saving = true;
    this.svc.add(this.admissionId, { category, code: code.trim(), description: description.trim() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          this.rows = [...this.rows, r.data];
          this.saving = false;
          if (category === 'cpt') this.cptSearch = '';
          else this.icdSearch = '';
        },
        error: (e) => {
          this.saving = false;
          this.errorMessage = e?.error?.message || 'Failed to add code';
        },
      });
  }

  remove(row: AdmissionDiagnosisCode): void {
    this.svc.remove(this.admissionId, row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.rows = this.rows.filter((r) => r.id !== row.id); },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to delete'; },
    });
  }

  close(): void { this.router.navigate(['/surgery-ot']); }
}
