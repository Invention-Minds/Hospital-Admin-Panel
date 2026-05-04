import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { MlcCase, MlcService } from '../../services/mlc.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

/**
 * Sprint 3d Screen B — MLC Detail / Lifecycle view.
 *
 * Shows the case summary + HMIS sync indicator (inline-await, per Sprint 2e)
 * + three lifecycle sections, each with an in-place form:
 *
 *   1. Examination (examiner name + injuries)
 *   2. Sample collection (samples + storage info)
 *   3. Final report (report text + target authority)
 *
 * Each lifecycle submit:
 *   - Disables its own button while awaiting the HMIS-inline-await round-trip
 *   - On success: refresh the whole case so the sync indicator reflects
 *     the latest hmisMlcId (opportunistic backfill per Sprint 2e)
 *   - On error: preserve form values, show error toast
 *
 * Final report submit is gated by a P1 ConfirmDialog(severity=warning).
 */

interface MlcResponse extends MlcCase {
  id?: string;
  hmisMlcId?: string | null;
  emergency?: {
    id?: number;
    prn?: string;
    patientName?: string;
    phoneNumber?: string;
    age?: number;
    presentingComplaint?: string;
  };
}

interface PatientMini {
  name?: string;
  prn?: number | string;
}

type LifecycleKey = 'examination' | 'samples' | 'report';

@Component({
  selector: 'app-mlc-detail',
  templateUrl: './mlc-detail.component.html',
  styleUrls: ['./mlc-detail.component.css'],
})
export class MlcDetailComponent implements OnInit, OnDestroy {
  mlcId = '';
  mlc: MlcResponse | null = null;
  patient: PatientMini | null = null;

  loading = false;
  submitting: Record<LifecycleKey, boolean> = {
    examination: false,
    samples: false,
    report: false,
  };

  examinationForm: FormGroup;
  sampleForm: FormGroup;
  reportForm: FormGroup;

  // Final-report confirmation state
  reportConfirmVisible = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private mlcService: MlcService,
    private patientLookup: AppointmentConfirmService,
    private messageService: MessageService
  ) {
    this.examinationForm = this.fb.group({
      examinerName: ['', [Validators.required]],
      injuries: ['', [Validators.required]],
    });
    this.sampleForm = this.fb.group({
      samplesCollected: ['', [Validators.required]],
      sampleStorageInfo: [''],
    });
    this.reportForm = this.fb.group({
      finalReport: ['', [Validators.required]],
      reportSubmittedTo: [''],
    });
  }

  ngOnInit(): void {
    this.mlcId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.mlcId) {
      this.loadCase();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---- Data loading -------------------------------------------------------

  loadCase(): void {
    this.loading = true;
    this.mlcService
      .getMlcCase(this.mlcId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          this.mlc = extractMlc(res);
          this.loading = false;
          this.hydrateFormsFromCase();
          const prn = this.mlc?.emergency?.prn;
          if (prn) this.loadPatient(prn);
        },
        error: (err: unknown) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load MLC case',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  private loadPatient(prn: string): void {
    this.patientLookup
      .getDetailsByPRN(prn)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe((res) => {
        this.patient = extractPatient(res, prn);
      });
  }

  private hydrateFormsFromCase(): void {
    if (!this.mlc) return;
    this.examinationForm.reset({
      examinerName: this.mlc.examinerName ?? '',
      injuries: this.mlc.injuries ?? '',
    });
    this.sampleForm.reset({
      samplesCollected: this.mlc.samplesCollected ?? '',
      sampleStorageInfo: this.mlc.sampleStorageInfo ?? '',
    });
    this.reportForm.reset({
      finalReport: this.mlc.finalReport ?? '',
      reportSubmittedTo: this.mlc.reportSubmittedTo ?? '',
    });
  }

  // ---- HMIS sync indicator ------------------------------------------------
  // Copy/icon migrated to <app-hmis-sync-indicator> in Sprint 3.5; the
  // component's own spec still reads this synced-state helper so we keep it.

  get hmisSyncIsSynced(): boolean {
    return !!this.mlc?.hmisMlcId;
  }

  // ---- Lifecycle actions --------------------------------------------------

  submitExamination(): void {
    if (this.examinationForm.invalid || !this.mlcId) {
      this.examinationForm.markAllAsTouched();
      return;
    }
    this.submitting.examination = true;
    const value = this.examinationForm.value as { examinerName: string; injuries: string };
    this.mlcService
      .recordExamination(this.mlcId, {
        examinerName: value.examinerName.trim(),
        injuries: value.injuries.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting.examination = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Examination recorded',
            life: 3000,
          });
          this.loadCase();
        },
        error: (err) => {
          this.submitting.examination = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not record examination',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  submitSamples(): void {
    if (this.sampleForm.invalid || !this.mlcId) {
      this.sampleForm.markAllAsTouched();
      return;
    }
    this.submitting.samples = true;
    const value = this.sampleForm.value as {
      samplesCollected: string;
      sampleStorageInfo: string;
    };
    this.mlcService
      .recordSampleCollection(this.mlcId, {
        samplesCollected: value.samplesCollected.trim(),
        sampleStorageInfo: value.sampleStorageInfo.trim() || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting.samples = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Samples recorded',
            life: 3000,
          });
          this.loadCase();
        },
        error: (err) => {
          this.submitting.samples = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not record samples',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  // ---- Final report (confirm-gated) ---------------------------------------

  attemptSubmitReport(): void {
    if (this.reportForm.invalid || !this.mlcId) {
      this.reportForm.markAllAsTouched();
      return;
    }
    this.reportConfirmVisible = true;
  }

  onReportConfirm(): void {
    this.reportConfirmVisible = false;
    this.performSubmitReport();
  }

  onReportCancel(): void {
    this.reportConfirmVisible = false;
  }

  private performSubmitReport(): void {
    this.submitting.report = true;
    const value = this.reportForm.value as {
      finalReport: string;
      reportSubmittedTo: string;
    };
    this.mlcService
      .submitFinalReport(this.mlcId, {
        finalReport: value.finalReport.trim(),
        reportSubmittedTo: value.reportSubmittedTo.trim() || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting.report = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Final report submitted',
            life: 3000,
          });
          this.loadCase();
        },
        error: (err) => {
          this.submitting.report = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not submit report',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  // ---- View helpers -------------------------------------------------------

  isReportSubmitted(): boolean {
    return this.mlc?.status === 'report-submitted' || this.mlc?.status === 'closed';
  }
}

// ---- Typed helpers -------------------------------------------------------

function extractMlc(res: unknown): MlcResponse | null {
  if (!res || typeof res !== 'object') return null;
  if ('data' in res) {
    const data = (res as { data: unknown }).data;
    return (data as MlcResponse) ?? null;
  }
  return res as MlcResponse;
}

function extractPatient(res: unknown, fallbackPrn: string | number): PatientMini {
  if (!res || typeof res !== 'object') return { prn: fallbackPrn };
  const maybe = res as {
    data?: { name?: string; prn?: number | string };
    name?: string;
    prn?: number | string;
  };
  const data = maybe.data ?? maybe;
  return {
    name: typeof data.name === 'string' ? data.name : undefined,
    prn: data.prn ?? fallbackPrn,
  };
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const maybe = err as { error?: { message?: string }; message?: string };
    return maybe.error?.message ?? maybe.message ?? 'Unknown error';
  }
  return 'Unknown error';
}
