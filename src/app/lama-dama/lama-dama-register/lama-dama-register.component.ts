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
import { EmergencyService, EmergencyCase } from '../../services/emergency.service';
import { IpdService } from '../../services/ipd.service';
import { SignatureCreateResponse } from '../../services/signature.service';
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

interface AdmissionContext {
  id: string;
  admissionNo?: string | null;
  prn?: string | null;
  patientName?: string | null;
}

@Component({
  selector: 'app-lama-dama-register',
  templateUrl: './lama-dama-register.component.html',
  styleUrls: ['./lama-dama-register.component.css'],
})
export class LamaDamaRegisterComponent implements OnInit, OnDestroy {
  type: LamaDamaType = 'lama';
  emergency: EmergencyContext | null = null;

  /** IPD source — set when deep-linked with ?admissionId=…; replaces the ER picker. */
  admissionId: string | null = null;
  admission: AdmissionContext | null = null;

  sharedForm: FormGroup;
  lamaForm: FormGroup;
  damaForm: FormGroup;

  submitting = false;
  confirmVisible = false;

  // Emergency-case picker — staff pick a human-readable case, not a DB id.
  emergencyOptions: { value: string; label: string }[] = [];
  loadingEmergencies = false;
  /** When deep-linked with ?emergencyId=…, lock the picker to that case. */
  lockedEmergency = false;

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
    private emergencyService: EmergencyService,
    private ipdService: IpdService,
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
    const admissionParam = qp.get('admissionId');
    if (admissionParam) {
      // IPD / post-op flow: link to the admission instead of an ER case.
      // Drop the emergencyId required-validator and skip the ER picker entirely.
      this.admissionId = admissionParam;
      this.sharedForm.get('emergencyId')?.clearValidators();
      this.sharedForm.get('emergencyId')?.updateValueAndValidity();
      this.loadAdmissionContext(admissionParam);
      return; // do not load ER cases for the picker
    }

    const emergencyParam = qp.get('emergencyId');
    if (emergencyParam) {
      this.lockedEmergency = true;
      this.sharedForm.patchValue({ emergencyId: emergencyParam });
      this.loadEmergencyContext(emergencyParam);
    }
    this.loadEmergencies();
  }

  /** Populate the emergency-case dropdown with readable labels. */
  private loadEmergencies(): void {
    this.loadingEmergencies = true;
    this.emergencyService
      .getAllEmergencyCases()
      .pipe(takeUntil(this.destroy$), catchError(() => of([] as EmergencyCase[])))
      .subscribe((cases) => {
        this.emergencyOptions = cases
          .filter((c) => c.id != null)
          .map((c) => ({ value: String(c.id), label: emergencyLabel(c) }));
        this.loadingEmergencies = false;
      });
  }

  /** When the user picks a case, refresh the header context (name / PRN). */
  onEmergencySelect(emergencyId: string): void {
    this.emergency = null;
    if (emergencyId) this.loadEmergencyContext(emergencyId);
  }

  // ---- e-signature capture (patient + witness) -----------------------------
  // The pad POSTs to /api/signature and returns a SignatureBlob id; we keep
  // only that id in the form control (the image lives in SignatureBlob).
  showPatientSign = false;
  showWitnessSign = false;

  get witnessName(): string {
    return (this.sharedForm.get('witnessName')?.value ?? '').toString();
  }

  onPatientSigned(resp: SignatureCreateResponse): void {
    this.sharedForm.patchValue({ patientSignature: resp.id });
    this.showPatientSign = false;
  }
  onWitnessSigned(resp: SignatureCreateResponse): void {
    this.sharedForm.patchValue({ witnessSignature: resp.id });
    this.showWitnessSign = false;
  }
  clearPatientSignature(): void {
    this.sharedForm.patchValue({ patientSignature: '' });
  }
  clearWitnessSignature(): void {
    this.sharedForm.patchValue({ witnessSignature: '' });
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
    const source = this.isAdmissionSource ? 'admission' : 'Emergency case';
    return `Recording ${label} for this patient is linked to the ${source} and cannot be reversed from this screen. Continue?`;
  }

  private performSubmit(): void {
    this.submitting = true;
    const shared = this.sharedForm.value as SharedFormValue;

    // Send EITHER admissionId (IPD source) OR emergencyId (ER source).
    const sourceLink = this.admissionId
      ? { admissionId: this.admissionId }
      : { emergencyId: shared.emergencyId };

    if (this.type === 'lama') {
      const lama = this.lamaForm.value as LamaSpecific;
      const payload: LamaRecord = {
        ...sourceLink,
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
      ...sourceLink,
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

  /** IPD flow — resolve the admission so the header shows PRN + admission no. */
  private loadAdmissionContext(admissionId: string): void {
    this.ipdService
      .getAdmission(admissionId)
      .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) return;
        const prn = res.prn ?? null;
        this.admission = {
          id: res.id ?? admissionId,
          admissionNo: res.admissionNo ?? null,
          prn,
          patientName: null,
        };
        // The admission has no patient name field — resolve it from the PRN
        // (same pattern the discharge summary uses) so the header + signature
        // signer name are populated for IPD-sourced records.
        if (prn) {
          this.http
            .post<{ patientData?: { name?: string } }>(
              `${environment.apiUrl}/patients/get-details-by-prn`,
              { prnNumber: prn },
            )
            .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
            .subscribe((r) => {
              if (r?.patientData?.name && this.admission) {
                this.admission.patientName = r.patientData.name;
              }
            });
        }
      });
  }

  /** True when this form is sourced from an IPD admission (not an ER case). */
  get isAdmissionSource(): boolean {
    return !!this.admissionId;
  }

  /** Patient name for the page-header — ER name, else null (admission has no name field). */
  get headerPatientName(): string | null {
    return this.emergency?.patientName ?? this.admission?.patientName ?? null;
  }

  /** PRN for the page-header — ER PRN, else the admission's PRN. */
  get headerPatientPrn(): string | null {
    return this.emergency?.prn ?? this.admission?.prn ?? null;
  }

  /** Signature pad context id — emergencyId for ER cases, admissionId for IPD. */
  get signatureContextId(): string | undefined {
    return this.admissionId ?? (this.sharedForm.get('emergencyId')?.value || undefined);
  }

  /** Whether the patient-signature pad may be shown (a source must be resolved). */
  get hasResolvedSource(): boolean {
    return !!this.emergency || !!this.admission;
  }
}

// ---- Typed helpers --------------------------------------------------------

/** Human-readable dropdown label: ER number — name (age) · triage. */
function emergencyLabel(c: EmergencyCase): string {
  const parts = [c.prn];
  if (c.patientName) parts.push(`— ${c.patientName}`);
  if (c.age != null) parts.push(`(${c.age}y)`);
  if (c.triageCategory) parts.push(`· ${c.triageCategory}`);
  return parts.join(' ');
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
