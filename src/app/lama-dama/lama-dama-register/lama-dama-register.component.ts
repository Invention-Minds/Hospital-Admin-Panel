import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import {
  DamaRecord,
  LamaDamaService,
  LamaRecord,
} from '../../services/lama-dama.service';
import { environment } from '../../../environment/environment.prod';

/**
 * Sprint 3e — combined LAMA / DAMA Register form.
 *
 * Route: /lama-dama/new?type=lama|dama (&emergencyId=<id>)
 *
 * Type is a discriminator that:
 *   - picks which fields render in the type-specific section
 *   - picks which service method is called on submit
 *   - picks the P1 ConfirmDialog copy (severity=danger)
 *
 * Shared fields: emergencyId, timestamp, witnessName, witnessSignature,
 *   patientSignature.
 * LAMA-specific: doctorAdvice, riskExplained, reasonForLama.
 * DAMA-specific: doctorRecommendation, patientDeclinesAdvice, followUpAdvice.
 *
 * On success navigate to /lama-dama/:type/:id; on error preserve form.
 */
export type LamaDamaType = 'lama' | 'dama';

interface EmergencyContext {
  id: number;
  prn: string;
  patientName: string;
  age?: number | null;
}

interface SharedFormValue {
  emergencyId: string;
  timestamp: Date | null;
  witnessName: string;
  witnessSignature: string;
  patientSignature: string;
}
interface LamaSpecific {
  doctorAdvice: string;
  riskExplained: boolean;
  reasonForLama: string;
}
interface DamaSpecific {
  doctorRecommendation: string;
  patientDeclinesAdvice: boolean;
  followUpAdvice: string;
}

@Component({
  selector: 'app-lama-dama-register',
  templateUrl: './lama-dama-register.component.html',
  styleUrls: ['./lama-dama-register.component.css'],
})
export class LamaDamaRegisterComponent implements OnInit, OnDestroy {
  type: LamaDamaType = 'lama';
  emergency: EmergencyContext | null = null;

  sharedForm: FormGroup;
  lamaForm: FormGroup;
  damaForm: FormGroup;

  submitting = false;
  confirmVisible = false;

  typeOptions: { value: LamaDamaType; label: string }[] = [
    { value: 'lama', label: 'LAMA — Left Against Medical Advice' },
    { value: 'dama', label: 'DAMA — Discharged Against Medical Advice' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private lamaDamaService: LamaDamaService,
    private messageService: MessageService
  ) {
    this.sharedForm = this.fb.group({
      emergencyId: ['', [Validators.required]],
      timestamp: [new Date() as Date | null, [Validators.required]],
      witnessName: ['', [Validators.required]],
      witnessSignature: [''],
      patientSignature: [''],
    });

    this.lamaForm = this.fb.group({
      doctorAdvice: ['', [Validators.required]],
      riskExplained: [false, []],
      reasonForLama: ['', [Validators.required]],
    });

    this.damaForm = this.fb.group({
      doctorRecommendation: ['', [Validators.required]],
      patientDeclinesAdvice: [false, []],
      followUpAdvice: [''],
    });
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const typeParam = qp.get('type');
    if (typeParam === 'lama' || typeParam === 'dama') {
      this.type = typeParam;
    }
    const emergencyParam = qp.get('emergencyId');
    if (emergencyParam) {
      this.sharedForm.patchValue({ emergencyId: emergencyParam });
      this.loadEmergencyContext(emergencyParam);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTypeChange(newType: LamaDamaType): void {
    this.type = newType;
    // Reset the now-hidden type-specific form so stale data doesn't leak
    // into a future submit if the user toggles back.
    if (newType === 'lama') this.damaForm.reset({ doctorRecommendation: '', patientDeclinesAdvice: false, followUpAdvice: '' });
    else this.lamaForm.reset({ doctorAdvice: '', riskExplained: false, reasonForLama: '' });
  }

  shouldShowError(
    form: 'shared' | 'lama' | 'dama',
    name: string
  ): boolean {
    const group = form === 'shared' ? this.sharedForm : form === 'lama' ? this.lamaForm : this.damaForm;
    const ctrl = group.get(name);
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  get typeSpecificForm(): FormGroup {
    return this.type === 'lama' ? this.lamaForm : this.damaForm;
  }

  get overallInvalid(): boolean {
    return this.sharedForm.invalid || this.typeSpecificForm.invalid;
  }

  // ---- Submit flow ---------------------------------------------------------

  attemptSubmit(): void {
    if (this.overallInvalid) {
      this.sharedForm.markAllAsTouched();
      this.typeSpecificForm.markAllAsTouched();
      return;
    }
    this.confirmVisible = true;
  }

  onConfirm(): void {
    this.confirmVisible = false;
    this.performSubmit();
  }

  onCancel(): void {
    this.confirmVisible = false;
  }

  get confirmMessage(): string {
    const label = this.type === 'lama' ? 'LAMA' : 'DAMA';
    return `Recording ${label} for this patient updates the Emergency case status and cannot be reversed from this screen. Continue?`;
  }

  private performSubmit(): void {
    this.submitting = true;
    const shared = this.sharedForm.value as SharedFormValue;

    if (this.type === 'lama') {
      const lama = this.lamaForm.value as LamaSpecific;
      const payload: LamaRecord = {
        emergencyId: shared.emergencyId,
        lamaTime: shared.timestamp ?? new Date(),
        doctorAdvice: lama.doctorAdvice.trim(),
        riskExplained: !!lama.riskExplained,
        reasonForLama: lama.reasonForLama.trim(),
        witnessName: shared.witnessName.trim() || undefined,
        witnessSignature: shared.witnessSignature.trim() || undefined,
        patientSignature: shared.patientSignature.trim() || undefined,
      };

      this.lamaDamaService
        .createLamaRecord(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: unknown) => this.onCreateSuccess(res, 'lama', 'LAMA recorded'),
          error: (err: unknown) => this.onCreateError(err),
        });
      return;
    }

    const dama = this.damaForm.value as DamaSpecific;
    const payload: DamaRecord = {
      emergencyId: shared.emergencyId,
      dischargeTime: shared.timestamp ?? new Date(),
      doctorRecommendation: dama.doctorRecommendation.trim(),
      patientDeclinesAdvice: !!dama.patientDeclinesAdvice,
      followUpAdvice: dama.followUpAdvice.trim() || undefined,
      witnessName: shared.witnessName.trim() || undefined,
      witnessSignature: shared.witnessSignature.trim() || undefined,
      patientSignature: shared.patientSignature.trim() || undefined,
    };
    this.lamaDamaService
      .createDamaRecord(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => this.onCreateSuccess(res, 'dama', 'DAMA recorded'),
        error: (err: unknown) => this.onCreateError(err),
      });
  }

  private onCreateSuccess(res: unknown, type: LamaDamaType, summary: string): void {
    this.submitting = false;
    this.messageService.add({ severity: 'success', summary, life: 3000 });
    const id = extractId(res);
    if (id != null) {
      this.router.navigate(['/lama-dama', type, id]);
    } else {
      this.router.navigate(['/lama-dama']);
    }
  }

  private onCreateError(err: unknown): void {
    this.submitting = false;
    this.messageService.add({
      severity: 'error',
      summary: this.type === 'lama' ? 'Could not record LAMA' : 'Could not record DAMA',
      detail: toErrorMessage(err),
      life: 6000,
    });
  }

  cancel(): void {
    this.router.navigate(['/lama-dama']);
  }

  private loadEmergencyContext(emergencyId: string): void {
    this.http
      .get<unknown>(`${environment.apiUrl}/emergency/${emergencyId}`)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe((res) => {
        this.emergency = extractEmergency(res);
      });
  }
}

// ---- Typed helpers --------------------------------------------------------

function extractEmergency(res: unknown): EmergencyContext | null {
  if (!res || typeof res !== 'object') return null;
  const maybe = res as {
    data?: { id?: number; prn?: string; patientName?: string; age?: number };
    id?: number;
    prn?: string;
    patientName?: string;
    age?: number;
  };
  const data = maybe.data ?? maybe;
  if (typeof data.id !== 'number' || typeof data.prn !== 'string' || typeof data.patientName !== 'string') return null;
  return { id: data.id, prn: data.prn, patientName: data.patientName, age: typeof data.age === 'number' ? data.age : null };
}

function extractId(res: unknown): number | string | null {
  if (!res || typeof res !== 'object') return null;
  const maybe = res as { data?: { id?: number | string }; id?: number | string };
  return maybe.data?.id ?? maybe.id ?? null;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const maybe = err as { error?: { message?: string }; message?: string };
    return maybe.error?.message ?? maybe.message ?? 'Unknown error';
  }
  return 'Unknown error';
}
