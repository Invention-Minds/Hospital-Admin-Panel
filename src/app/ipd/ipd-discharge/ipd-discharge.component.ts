import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { IpdDischarge, IpdService } from '../../services/ipd.service';
import { CanComponentDeactivate } from '../../guards/unsaved-changes.guard';

/**
 * Sprint 3b — IPD Discharge
 *
 * Structured ACC.5 discharge summary. Composes FORM pattern + ConfirmDialog
 * (irreversible) + ConfirmDialog (unsaved-changes). Backend shipped in
 * Sprint 2b — frees bed, updates admission, pushes to HMIS.
 *
 * Notable design choices:
 *   - Discharge is irreversible at the backend (409 on retry). UI enforces
 *     a ConfirmDialog(severity='danger') before POST.
 *   - DAMA is deliberately absent from the dropdown — it's a separate flow
 *     (DamaRecord / Sprint 3e).
 *   - FormArray for medications; empty array is valid.
 */

interface DischargeMedicationFormValue {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

interface DischargeFormValue {
  dischargeType: 'regular' | 'LAMA' | 'transfer' | 'expired';
  finalDiagnosis: string;
  conditionAtDischarge: string;
  dischargeSummary: string;
  proceduresDone: string;
  followUpDate: Date | null;
  followUpDoctor: string;
  advice: string;
  medications: DischargeMedicationFormValue[];
}

export interface DischargeTypeOption {
  value: 'regular' | 'LAMA' | 'transfer' | 'expired';
  label: string;
}

@Component({
  selector: 'app-ipd-discharge',
  templateUrl: './ipd-discharge.component.html',
  styleUrls: ['./ipd-discharge.component.css'],
})
export class IpdDischargeComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  admissionId = '';
  form: FormGroup;
  submitting = false;

  // Confirm-discharge dialog state
  confirmDischargeVisible = false;

  // Unsaved-changes discard dialog state
  confirmDiscardVisible = false;
  private discardDecision$ = new Subject<boolean>();

  readonly dischargeTypes: DischargeTypeOption[] = [
    { value: 'regular',  label: 'Regular (normal)' },
    { value: 'LAMA',     label: 'LAMA' },
    { value: 'transfer', label: 'Transferred' },
    { value: 'expired',  label: 'Expired' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ipdService: IpdService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      dischargeType: ['' as DischargeFormValue['dischargeType'], [Validators.required]],
      finalDiagnosis: ['', [Validators.required]],
      conditionAtDischarge: ['', [Validators.required]],
      dischargeSummary: ['', [Validators.required]],
      proceduresDone: [''],
      followUpDate: [null as Date | null],
      followUpDoctor: [''],
      advice: [''],
      medications: this.fb.array<FormGroup>([]),
    });
  }

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---- Form helpers -------------------------------------------------------

  get medications(): FormArray<FormGroup> {
    return this.form.get('medications') as FormArray<FormGroup>;
  }

  addMedicationRow(): void {
    this.medications.push(
      this.fb.group({
        name: ['', [Validators.required]],
        dose: ['', [Validators.required]],
        frequency: ['', [Validators.required]],
        duration: [''],
      })
    );
    this.form.markAsDirty();
  }

  removeMedicationRow(index: number): void {
    this.medications.removeAt(index);
    this.form.markAsDirty();
  }

  shouldShowError(name: keyof DischargeFormValue): boolean {
    const ctrl = this.form.get(name);
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  // ---- Submit flow --------------------------------------------------------

  attemptDischarge(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.admissionId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing admission',
        detail: 'Cannot discharge without an admissionId in the route.',
      });
      return;
    }
    this.confirmDischargeVisible = true;
  }

  onDischargeConfirm(): void {
    this.confirmDischargeVisible = false;
    this.performDischarge();
  }

  onDischargeCancel(): void {
    this.confirmDischargeVisible = false;
  }

  private performDischarge(): void {
    this.submitting = true;
    const payload = this.buildPayload();

    this.ipdService
      .createDischarge(this.admissionId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          this.submitting = false;
          const hmisId = extractHmisDischargeId(res);
          this.messageService.add({
            severity: 'success',
            summary: 'Patient discharged',
            detail: hmisId
              ? `HMIS discharge id: ${hmisId}`
              : 'Saved locally. HMIS sync queued if the HMIS side rejected.',
            life: 4000,
          });
          // After success the admission is no longer active — leave the form.
          this.form.markAsPristine();
          this.router.navigate(['/ipd']);
        },
        error: (err: unknown) => {
          this.submitting = false;
          // Deliberately do NOT reset or navigate: user may want to retry.
          this.messageService.add({
            severity: 'error',
            summary: 'Could not discharge patient',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/ipd']);
  }

  private buildPayload(): IpdDischarge {
    const raw = this.form.getRawValue() as DischargeFormValue;
    const medications = raw.medications
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({
        name: m.name.trim(),
        dose: m.dose.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
      }));

    return {
      admissionId: this.admissionId,
      // Server auto-fills dischargeDate + dischargeTime. These are placeholders
      // to satisfy the IpdDischarge interface shape.
      dischargeDate: new Date(),
      dischargeTime: '',
      dischargeType: raw.dischargeType as IpdDischarge['dischargeType'],
      finalDiagnosis: raw.finalDiagnosis.trim(),
      proceduresDone: raw.proceduresDone?.trim() || undefined,
      conditionAtDischarge: raw.conditionAtDischarge.trim(),
      dischargeSummary: raw.dischargeSummary.trim(),
      followUpDate: raw.followUpDate ?? undefined,
      followUpDoctor: raw.followUpDoctor?.trim() || undefined,
      medications,
      advice: raw.advice?.trim() || undefined,
    };
  }

  // ---- Unsaved-changes guard ---------------------------------------------

  canDeactivate(): Observable<boolean> | boolean {
    if (this.form.pristine) return true;
    this.confirmDiscardVisible = true;
    return this.discardDecision$.pipe(take(1));
  }

  onDiscardConfirm(): void {
    this.confirmDiscardVisible = false;
    this.discardDecision$.next(true);
  }

  onDiscardCancel(): void {
    this.confirmDiscardVisible = false;
    this.discardDecision$.next(false);
  }
}

// ---- Local helpers (typed, no `any`) --------------------------------------

function extractHmisDischargeId(res: unknown): string | null {
  if (!res || typeof res !== 'object') return null;
  const maybe = res as { data?: { hmisDischargeId?: string | null } };
  return maybe.data?.hmisDischargeId ?? null;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const maybe = err as { error?: { message?: string }; status?: number; message?: string };
    if (maybe.status === 409) {
      return maybe.error?.message ?? 'Discharge already exists for this admission.';
    }
    return maybe.error?.message ?? maybe.message ?? 'Unknown error';
  }
  return 'Unknown error';
}
