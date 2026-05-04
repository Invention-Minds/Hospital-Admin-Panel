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
import { CanComponentDeactivate } from '../../guards/unsaved-changes.guard';

/**
 * Sprint 3a-2 — IPD Progress Notes
 *
 * SOAP progress-note form + chronological list for a single IPD admission.
 * NABH COP.2. Composes FORM pattern (§1) + EmptyState + ConfirmDialog
 * (unsaved-changes) from docs/ui-patterns.md.
 */
interface ProgressNoteFormValue {
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

  // ConfirmDialog state for unsaved-changes deactivation.
  confirmDiscardVisible = false;
  private discardDecision$ = new Subject<boolean>();

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ipdService: IpdService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
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
    });
  }

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) {
      this.loadNotes();
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
          this.form.reset();
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
