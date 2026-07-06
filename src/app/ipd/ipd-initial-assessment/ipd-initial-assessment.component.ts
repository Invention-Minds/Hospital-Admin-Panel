import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ESignComponent } from '../../shared/ui/e-sign/e-sign.component';
import {
  IpdInitialAssessmentService,
  IpdInitialAssessment,
  UpsertAssessmentPayload,
} from '../../services/ipd-initial-assessment.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * IPD Initial Assessment editor — `/ipd/admission/:admissionId/initial-assessment`.
 *
 * One form per admission. Filled by the admitting M.O. / resident /
 * registrar, then signed by them, then co-signed by the consultant.
 *
 * Layout — vertical-tab sections for navigation across the long form:
 *   1. Allergies + Chief complaints + HOPI
 *   2. Past history (co-morbidities + surgical + medications)
 *   3. Personal + OB/GYN + Family history
 *   4. Geriatric ADL (collapsed unless isGeriatric is true)
 *   5. Vital signs + General exam
 *   6. Systemic exam
 *   7. Summary + Plan + Discharge planning
 *   8. Sign-off
 */
type Section =
  | 'presenting' | 'past' | 'personal' | 'geriatric'
  | 'vitals-exam' | 'systemic' | 'plan' | 'sign';

@Component({
  selector: 'app-ipd-initial-assessment',
  standalone: true,
  imports: [CommonModule, FormsModule, ESignComponent],
  templateUrl: './ipd-initial-assessment.component.html',
  styleUrls: ['./ipd-initial-assessment.component.css'],
})
export class IpdInitialAssessmentComponent implements OnInit, OnDestroy {
  admissionId = '';
  section: Section = 'presenting';
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  /** The live editor buffer. Hydrated from the server on load; sent back via
   *  upsert on save. Sentinel id '' when no row exists yet. */
  form: UpsertAssessmentPayload = this.blank();
  serverRow: IpdInitialAssessment | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: IpdInitialAssessmentService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.get(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (row) => {
        this.serverRow = row;
        if (row) {
          // Hydrate the editor from the server row; preserve any optional
          // fields the API didn't send (everything's nullable so spread is safe).
          this.form = { ...row };
        } else {
          this.form = this.blank();
        }
        this.loading = false;
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Failed to load initial assessment';
        this.loading = false;
      },
    });
  }

  setSection(s: Section): void {
    this.section = s;
    this.successMessage = '';
    this.errorMessage = '';
  }

  /** Read-only when consultant has co-signed — section editors stay visible
   *  for review but inputs go disabled. */
  get readOnly(): boolean {
    return this.serverRow?.status === 'CONSULTANT_SIGNED';
  }

  /** Save the editor buffer back to the server. The backend strips
   *  undefined keys so partial saves are safe. */
  saveDraft(): void {
    if (this.readOnly) return;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.svc.upsert(this.admissionId, this.form).pipe(takeUntil(this.destroy$)).subscribe({
      next: (row) => {
        this.serverRow = row;
        this.saving = false;
        this.successMessage = 'Saved.';
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || e?.error?.detail || 'Save failed';
        this.saving = false;
      },
    });
  }

  onFilledSigned(sig: SignatureCreateResponse): void {
    this.svc.signFilled(this.admissionId, { signatureId: sig.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => { this.serverRow = row; this.successMessage = 'Filler signed.'; this.load(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Sign failed'; },
      });
  }
  onConsultantSigned(sig: SignatureCreateResponse): void {
    this.svc.signConsultant(this.admissionId, { signatureId: sig.id })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => { this.serverRow = row; this.successMessage = 'Consultant co-signed.'; this.load(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Sign failed'; },
      });
  }

  // ─── Systemic exam helpers ──────────────────────────────────────────
  // Strict-template type-check can't index `form` by a computed key like
  // `form[key + 'Nad']`, so the systemic-exam loop routes through these
  // typed accessors. The cast to a string-keyed record is contained here.
  private sysAccess(): Record<string, boolean | string | null | undefined> {
    return this.form as unknown as Record<string, boolean | string | null | undefined>;
  }
  getSysNad(key: string): boolean {
    return !!this.sysAccess()[`${key}Nad`];
  }
  setSysNad(key: string, value: boolean): void {
    this.sysAccess()[`${key}Nad`] = value;
  }
  getSysFindings(key: string): string {
    const v = this.sysAccess()[`${key}Findings`];
    return typeof v === 'string' ? v : '';
  }
  setSysFindings(key: string, value: string): void {
    this.sysAccess()[`${key}Findings`] = value;
  }

  readonly systems: ReadonlyArray<{ key: string; label: string }> = [
    { key: 'cvs',  label: 'CVS' },
    { key: 'ent',  label: 'ENT, head &amp; neck' },
    { key: 'gi',   label: 'GI / Abdomen' },
    { key: 'msk',  label: 'Musculo-skeletal' },
    { key: 'cns',  label: 'CNS' },
    { key: 'resp', label: 'Respiratory' },
    { key: 'gu',   label: 'Genito-urinary' },
    { key: 'hem',  label: 'Hematologic / Lymphatic' },
  ];

  blank(): UpsertAssessmentPayload {
    return {
      allergyNotKnown: false, allergyDrug: false, allergyFood: false,
      allergyTransfusion: false,
      hasHypertension: false, hasDiabetes: false, hasCardiacDisease: false,
      hasWoundDischarge: false, hasCopd: false, hasThyroidDisorder: false,
      hasCva: false, hasRecurrentInfection: false,
      isPregnant: false, isLactating: false,
      previousInvestigationsEnclosed: false,
      isGeriatric: false,
      examPallor: false, examEdema: false, examClubbing: false,
      examCyanosis: false, examIcterus: false, examEmaciated: false,
      cvsNad: false, entNad: false, giNad: false, mskNad: false,
      cnsNad: false, respNad: false, guNad: false, hemNad: false,
      needsSocialSupport: false, needsHomeEquipment: false,
      needsPhysiotherapy: false, needsWoundCare: false,
    };
  }
}
