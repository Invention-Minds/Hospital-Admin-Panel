import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Observable, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import {
  IpdProgressNote,
  IpdService,
} from '../../services/ipd.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { CanComponentDeactivate } from '../../guards/unsaved-changes.guard';

interface DoctorLite { id: number; name: string; userId?: number | null; departmentName?: string | null; }

/**
 * Sprint 3a-2 — IPD Progress Notes
 *
 * SOAP progress-note form + chronological list for a single IPD admission.
 * NABH COP.2. Composes FORM pattern (§1) + EmptyState + ConfirmDialog
 * (unsaved-changes) from docs/ui-patterns.md.
 */
interface ProgressNoteFormValue {
  doctorId: number | null;
  doctorName: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  nursingNotes: string;
  vitalsBP: string;
  vitalsHR: string;
  vitalsTemp: string;
  vitalsSpO2: string;
  vitalsRR: string;
  vitalsMonitoringFrequency: string | null;
}

@Component({
  selector: 'app-ipd-progress-note',
  templateUrl: './ipd-progress-note.component.html',
  styleUrls: ['./ipd-progress-note.component.css'],
})
export class IpdProgressNoteComponent
  implements OnInit, OnDestroy, CanComponentDeactivate
{
  admissionId = '';
  form: FormGroup;
  notes: IpdProgressNote[] = [];
  loadingList = false;
  submitting = false;

  /** Doctor picker — loaded once per visit; default-selects the logged-in user's doctor row when one matches. */
  doctors: DoctorLite[] = [];

  // ConfirmDialog state for unsaved-changes deactivation.
  confirmDiscardVisible = false;
  private discardDecision$ = new Subject<boolean>();

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ipdService: IpdService,
    private doctorService: DoctorServiceService,
    private authService: AuthServiceService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      doctorId: [null as number | null, [Validators.required]],
      doctorName: ['', [Validators.required]],
      subjective: ['', [Validators.required]],
      objective: ['', [Validators.required]],
      assessment: ['', [Validators.required]],
      plan: ['', [Validators.required]],
      nursingNotes: [''],
      vitalsBP: [''],
      vitalsHR: [''],
      vitalsTemp: [''],
      vitalsSpO2: [''],
      vitalsRR: [''],
      // Phase 9.13 — optional re-order of the vitals monitoring frequency.
      vitalsMonitoringFrequency: [null as string | null],
    });
  }

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) {
      this.loadNotes();
    }
    this.loadDoctors();
  }

  /** Loads the doctor list and default-selects the logged-in user's doctor row, if any. */
  loadDoctors(): void {
    this.doctorService
      .getAllDoctors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows: any[]) => {
          this.doctors = (rows ?? []).map((d: any) => ({
            id: d.id,
            name: d.name,
            userId: d.userId ?? null,
            departmentName: d.departmentName ?? null,
          }));
          // Default-select the logged-in doctor (if their User row is linked to a Doctor).
          const myUserId = this.authService.getUserId();
          if (myUserId != null && this.form.get('doctorId')?.value == null) {
            const me = this.doctors.find((d) => d.userId === myUserId);
            if (me) this.applyDoctorSelection(me.id);
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Doctors',
            detail: 'Failed to load doctor list',
            life: 5000,
          });
        },
      });
  }

  onDoctorChange(doctorId: number | null): void {
    this.applyDoctorSelection(doctorId);
  }

  /** Single source of truth for keeping doctorId + doctorName aligned. */
  private applyDoctorSelection(doctorId: number | null): void {
    if (doctorId == null) {
      this.form.patchValue({ doctorId: null, doctorName: '' });
      return;
    }
    const d = this.doctors.find((x) => x.id === doctorId);
    if (d) {
      // patchValue with { emitEvent: false } would skip onValueChange; default is fine here.
      this.form.patchValue({ doctorId, doctorName: d.name });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Control getter — keeps templates type-safe without bypassing strictTemplates. */
  c(name: keyof ProgressNoteFormValue) {
    return this.form.get(name);
  }

  /** Whether a given required control should show its error caption. */
  shouldShowError(name: keyof ProgressNoteFormValue): boolean {
    const ctrl = this.c(name);
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  loadNotes(): void {
    this.loadingList = true;
    this.ipdService
      .getProgressNotes(this.admissionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          this.notes = extractNotes(res);
          this.loadingList = false;
        },
        error: (err: unknown) => {
          this.notes = [];
          this.loadingList = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load progress notes',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.admissionId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing admission',
        detail: 'Cannot save a progress note without an admissionId in the route.',
      });
      return;
    }

    this.submitting = true;
    const value = this.form.value as ProgressNoteFormValue;
    const payload: IpdProgressNote = {
      admissionId: this.admissionId,
      doctorName: value.doctorName,
      subjective: value.subjective,
      objective: value.objective,
      assessment: value.assessment,
      plan: value.plan,
      nursingNotes: value.nursingNotes || undefined,
      vitalsBP: value.vitalsBP || undefined,
      vitalsHR: value.vitalsHR || undefined,
      vitalsTemp: value.vitalsTemp || undefined,
      vitalsSpO2: value.vitalsSpO2 || undefined,
      vitalsRR: value.vitalsRR || undefined,
      vitalsMonitoringFrequency: value.vitalsMonitoringFrequency || undefined,
    };

    this.ipdService
      .addProgressNote(this.admissionId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Progress note saved',
            life: 3000,
          });
          // Preserve the doctor selection across resets — the same clinician
          // typically writes multiple notes per round.
          const keepDoctorId = this.form.get('doctorId')?.value as number | null;
          this.form.reset();
          if (keepDoctorId != null) this.applyDoctorSelection(keepDoctorId);
          this.loadNotes();
        },
        error: (err: unknown) => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not save progress note',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/ipd']);
  }

  // --- Unsaved-changes guard integration ----------------------------------

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

/**
 * HTTP response shape is `{ message, data, pagination }` or (legacy calls)
 * the raw array. Normalise both so the component never touches `any`.
 */
function extractNotes(res: unknown): IpdProgressNote[] {
  if (Array.isArray(res)) {
    return res as IpdProgressNote[];
  }
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data;
    if (Array.isArray(data)) return data as IpdProgressNote[];
  }
  return [];
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const maybe = err as { error?: { message?: string }; message?: string };
    return maybe.error?.message ?? maybe.message ?? 'Unknown error';
  }
  return 'Unknown error';
}
