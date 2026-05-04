import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { MlcCase, MlcService } from '../../services/mlc.service';
import { environment } from '../../../environment/environment.prod';

/**
 * Sprint 3d Screen A — MLC Register form.
 *
 * Creates a new MLC case, optionally pre-filled from an Emergency when the
 * route is navigated with `?emergencyId=<id>`.
 *
 * Per NABH MRD.2, most MLC lifecycle fields (injuries, examiner, samples,
 * report) are captured later on the detail screen — register only collects
 * the minimum required to persist the row and link it to the Emergency.
 *
 * Inline-await UX: submit button shows a spinner while the server does its
 * HMIS push; response's `data.hmisMlcId` may or may not be populated (the
 * detail screen then surfaces the sync status).
 */

interface EmergencyContext {
  id: number;
  prn: string;
  patientName: string;
  age?: number | null;
}

type MlcRegisterPayload = Pick<
  MlcCase,
  'emergencyId' | 'caseType' | 'policeStationName' | 'fir_No' | 'fir_Date'
>;

interface MlcRegisterFormValue {
  emergencyId: string;
  caseType: MlcCase['caseType'] | '';
  policeStationName: string;
  fir_No: string;
  fir_Date: Date | null;
}

@Component({
  selector: 'app-mlc-register',
  templateUrl: './mlc-register.component.html',
  styleUrls: ['./mlc-register.component.css'],
})
export class MlcRegisterComponent implements OnInit, OnDestroy {
  form: FormGroup;
  submitting = false;
  emergency: EmergencyContext | null = null;

  caseTypes: { value: MlcCase['caseType']; label: string }[] = [
    { value: 'accident', label: 'Accident' },
    { value: 'assault', label: 'Assault' },
    { value: 'poison', label: 'Poison' },
    { value: 'burn', label: 'Burn' },
    { value: 'other', label: 'Other' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private mlcService: MlcService,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      emergencyId: ['', [Validators.required]],
      caseType: ['' as MlcCase['caseType'] | '', [Validators.required]],
      policeStationName: [''],
      fir_No: [''],
      fir_Date: [null as Date | null],
    });
  }

  ngOnInit(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('emergencyId');
    if (fromQuery) {
      this.form.patchValue({ emergencyId: fromQuery });
      this.loadEmergencyContext(fromQuery);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  shouldShowError(name: keyof MlcRegisterFormValue): boolean {
    const ctrl = this.form.get(name);
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  private loadEmergencyContext(emergencyId: string): void {
    // No dedicated EmergencyService method for by-id lookup; use a direct GET
    // since the existing emergency.routes.ts exposes /api/emergency/:id.
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;

    const raw = this.form.value as MlcRegisterFormValue;
    const payload = buildRegisterPayload(raw);

    this.mlcService
      .registerMlcCase(payload as MlcCase)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          this.submitting = false;
          this.messageService.add({
            severity: 'success',
            summary: 'MLC case registered',
            life: 3000,
          });
          const id = extractId(res);
          if (id != null) {
            this.router.navigate(['/mlc', id]);
          } else {
            this.router.navigate(['/mlc']);
          }
        },
        error: (err: unknown) => {
          this.submitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not register MLC case',
            detail: toErrorMessage(err),
            life: 6000,
          });
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/mlc']);
  }
}

// ---- Typed helpers --------------------------------------------------------

function buildRegisterPayload(raw: MlcRegisterFormValue): MlcRegisterPayload {
  return {
    emergencyId: raw.emergencyId,
    caseType: raw.caseType as MlcCase['caseType'],
    policeStationName: raw.policeStationName.trim() || undefined,
    fir_No: raw.fir_No.trim() || undefined,
    fir_Date: raw.fir_Date ?? undefined,
  };
}

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
  if (typeof data.id !== 'number' || typeof data.prn !== 'string' || typeof data.patientName !== 'string') {
    return null;
  }
  return {
    id: data.id,
    prn: data.prn,
    patientName: data.patientName,
    age: typeof data.age === 'number' ? data.age : null,
  };
}

function extractId(res: unknown): number | string | null {
  if (!res || typeof res !== 'object') return null;
  const maybe = res as { data?: { id?: number | string }; id?: number | string };
  const id = maybe.data?.id ?? maybe.id;
  return id ?? null;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const maybe = err as { error?: { message?: string }; message?: string };
    return maybe.error?.message ?? maybe.message ?? 'Unknown error';
  }
  return 'Unknown error';
}
