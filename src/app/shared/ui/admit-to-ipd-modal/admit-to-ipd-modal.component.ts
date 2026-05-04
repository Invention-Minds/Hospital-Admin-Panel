import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { OpdAssessmentsService } from '../../../services/opd-assessment/opd-assessments.service';
import { EmergencyService } from '../../../services/emergency.service';
import { DoctorServiceService } from '../../../services/doctor-details/doctor-service.service';
import {
  WardManagementService,
  Ward,
  Bed,
} from '../../../services/ward-management.service';

/**
 * Sprint 3f — shared Admit-to-IPD modal (P7).
 *
 * Surfaces from OPD assessment (source='opd', sourceId=appointmentId) and
 * Emergency list (source='emergency', sourceId=emergencyId). Dispatches to
 * the source-specific conversion endpoint so Sprint 1's helpers
 * (convertOpdToIpd / convertEmergencyToIpd) handle the admission + MLC
 * linkage + returning pending prescriptions for the IPD Pharmacy review step.
 */
export type AdmitSource = 'opd' | 'emergency';
export type AdmissionType = 'elective' | 'emergency' | 'transfer' | 'routine';

export interface AdmitContext {
  sourceId: string | number;
  prn?: string | number | null;
  patientName?: string | null;
  referringDoctor?: string | null;
  summary?: string | null;
  suggestedAdmissionType?: AdmissionType;
  suggestedRoomType?: string;
}

export interface AdmittedEvent {
  admissionId: string;
  admissionNo: string;
}

interface AdmitResponseShape {
  message?: string;
  data?: {
    ipdAdmission?: { id?: string; admissionNo?: string };
    admissionNo?: string;
    id?: string;
  };
  ipdAdmission?: { id?: string; admissionNo?: string };
  admissionNo?: string;
  id?: string;
}

@Component({
  selector: 'app-admit-to-ipd-modal',
  templateUrl: './admit-to-ipd-modal.component.html',
  styleUrls: ['./admit-to-ipd-modal.component.css'],
})
export class AdmitToIpdModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() source: AdmitSource = 'opd';
  @Input() context: AdmitContext | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() admitted = new EventEmitter<AdmittedEvent>();
  @Output() cancelled = new EventEmitter<void>();

  admitForm: FormGroup;
  submitting = false;
  confirmVisible = false;

  wards: Ward[] = [];
  availableBeds: Bed[] = [];
  doctors: Array<{ id: number; name: string; departmentName?: string }> = [];
  wardsLoading = false;
  bedsLoading = false;

  readonly admissionTypeOptions: ReadonlyArray<{ value: AdmissionType; label: string }> = [
    { value: 'elective', label: 'Elective' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'transfer', label: 'Transfer' },
  ];

  private destroy$ = new Subject<void>();
  private loadedForVisibleCycle = false;

  constructor(
    private fb: FormBuilder,
    private opdService: OpdAssessmentsService,
    private emergencyService: EmergencyService,
    private doctorService: DoctorServiceService,
    private wardService: WardManagementService,
    private messageService: MessageService
  ) {
    this.admitForm = this.fb.group({
      wardId: ['', [Validators.required]],
      bedId: ['', [Validators.required]],
      admittingDoctorId: [null as number | null],
      admittingDoctorName: ['', [Validators.required]],
      admissionType: ['emergency' as AdmissionType, [Validators.required]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      if (this.visible && !this.loadedForVisibleCycle) {
        this.loadedForVisibleCycle = true;
        this.resetForm();
        this.loadWards();
        this.loadDoctors();
      } else if (!this.visible) {
        this.loadedForVisibleCycle = false;
      }
    }
  }

  // ---- Data loading -------------------------------------------------------

  private loadWards(): void {
    this.wardsLoading = true;
    this.wardService
      .getAllWards()
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load wards',
            life: 5000,
          });
          return of([] as Ward[]);
        })
      )
      .subscribe((wards) => {
        this.wards = wards ?? [];
        this.wardsLoading = false;
      });
  }

  private loadDoctors(): void {
    this.doctorService
      .getAllDoctors()
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      )
      .subscribe((docs) => {
        this.doctors = (docs ?? []).map((d) => ({
          id: d.id,
          name: d.name,
          departmentName: d.departmentName,
        }));
      });
  }

  onWardChange(wardId: string): void {
    this.admitForm.patchValue({ bedId: '' });
    this.availableBeds = [];
    if (!wardId) return;
    this.bedsLoading = true;
    this.wardService
      .getBedsByWard(wardId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([] as Bed[]))
      )
      .subscribe((beds) => {
        this.availableBeds = (beds ?? []).filter((b) => b.status === 'available');
        this.bedsLoading = false;
      });
  }

  onDoctorChange(doctorId: number | null): void {
    if (doctorId == null) {
      this.admitForm.patchValue({ admittingDoctorName: '' });
      return;
    }
    const doctor = this.doctors.find((d) => d.id === doctorId);
    if (doctor) {
      this.admitForm.patchValue({ admittingDoctorName: doctor.name });
    }
  }

  // ---- Form state --------------------------------------------------------

  private resetForm(): void {
    const defaultType: AdmissionType =
      this.context?.suggestedAdmissionType ??
      (this.source === 'emergency' ? 'emergency' : 'elective');
    this.admitForm.reset({
      wardId: '',
      bedId: '',
      admittingDoctorId: null,
      admittingDoctorName: this.context?.referringDoctor ?? '',
      admissionType: defaultType,
    });
    this.availableBeds = [];
  }

  shouldShowError(field: string): boolean {
    const ctrl = this.admitForm.get(field);
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  get hasWardOptions(): boolean {
    return this.wards.length > 0;
  }

  get hasBedOptions(): boolean {
    return this.availableBeds.length > 0;
  }

  get selectedWardId(): string {
    return this.admitForm.get('wardId')?.value ?? '';
  }

  // ---- Submit flow -------------------------------------------------------

  attemptSubmit(): void {
    if (this.admitForm.invalid) {
      this.admitForm.markAllAsTouched();
      return;
    }
    this.confirmVisible = true;
  }

  onConfirm(): void {
    this.confirmVisible = false;
    this.performSubmit();
  }

  onConfirmCancel(): void {
    this.confirmVisible = false;
  }

  get confirmMessage(): string {
    const linkLabel = this.source === 'opd' ? 'OPD visit' : 'Emergency case';
    return `This will create an IPD admission linked to this ${linkLabel}. Active prescriptions and investigations will carry forward for review in IPD Pharmacy. Continue?`;
  }

  private performSubmit(): void {
    if (!this.context) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing patient context',
        life: 5000,
      });
      return;
    }
    this.submitting = true;
    const raw = this.admitForm.value as {
      wardId: string;
      bedId: string;
      admittingDoctorId: number | null;
      admittingDoctorName: string;
      admissionType: AdmissionType;
    };

    const payload = {
      wardId: raw.wardId,
      bedId: raw.bedId,
      admittingDoctorId: raw.admittingDoctorId,
      admittingDoctorName: raw.admittingDoctorName.trim(),
      admissionType: raw.admissionType,
    };

    if (this.source === 'opd') {
      const appointmentId =
        typeof this.context.sourceId === 'string'
          ? parseInt(this.context.sourceId, 10)
          : this.context.sourceId;
      this.opdService
        .admitToIpd({ appointmentId, ...payload })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: unknown) => this.onAdmitSuccess(res),
          error: (err: unknown) => this.onAdmitError(err),
        });
      return;
    }

    this.emergencyService
      .convertToIPD(String(this.context.sourceId), payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => this.onAdmitSuccess(res),
        error: (err: unknown) => this.onAdmitError(err),
      });
  }

  private onAdmitSuccess(res: unknown): void {
    this.submitting = false;
    const admission = extractAdmission(res);
    this.messageService.add({
      severity: 'success',
      summary: admission.admissionNo ? `Admission ${admission.admissionNo} created` : 'Admission created',
      life: 4000,
    });
    if (admission.admissionId && admission.admissionNo) {
      this.admitted.emit({
        admissionId: admission.admissionId,
        admissionNo: admission.admissionNo,
      });
    }
    this.closeModal();
  }

  private onAdmitError(err: unknown): void {
    this.submitting = false;
    this.messageService.add({
      severity: 'error',
      summary: 'Could not create admission',
      detail: toErrorMessage(err),
      life: 6000,
    });
  }

  onCancel(): void {
    this.cancelled.emit();
    this.closeModal();
  }

  private closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

// ---- Typed helpers -------------------------------------------------------

function extractAdmission(res: unknown): { admissionId: string | null; admissionNo: string | null } {
  if (!res || typeof res !== 'object') {
    return { admissionId: null, admissionNo: null };
  }
  const r = res as AdmitResponseShape;
  const nested = r.data?.ipdAdmission ?? r.ipdAdmission;
  const admissionId = nested?.id ?? r.data?.id ?? r.id ?? null;
  const admissionNo = nested?.admissionNo ?? r.data?.admissionNo ?? r.admissionNo ?? null;
  return {
    admissionId: admissionId ?? null,
    admissionNo: admissionNo ?? null,
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
