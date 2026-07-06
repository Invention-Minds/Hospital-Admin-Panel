import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { IpdService } from '../../services/ipd.service';
import {
  IpdPrescription,
  IpdPrescriptionService,
  MarLogEntry,
} from '../../services/ipd-prescription.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { SignatureCreateResponse } from '../../services/signature.service';

/**
 * Sprint 3c — Screen B — Medication Administration Record (MAR).
 *
 * Nurse view. Two sections:
 *   1. Pending medications — active+pending IPD prescriptions ordered by
 *      nextAdminTime ascending (most overdue first).
 *   2. Administered log — MAR entries enriched with parent prescription
 *      drug identity (backend Sprint 3c expansion).
 *
 * Administer action opens a modal pre-filled with the prescription's
 * quantity + route; nurse confirms or tweaks + adds remarks.
 *
 * Fire-and-forget UX: no HMIS status surface; backend success = UI success.
 */

interface AdministerFormValue {
  quantity: number;
  route: string;
  remarks: string;
  // Phase 4 (WF-3) — NABH MOM.4 / IPC.6 gates. Field names mirror backend
  // `IpdMedicationLog.verifiedTwoIdentifiers` / `fiveRightsChecked`.
  verifiedTwoIdentifiers: boolean;
  fiveRightsChecked: boolean;
}

interface PatientMini {
  name?: string;
  prn?: number | string;
}

@Component({
  selector: 'app-ipd-mar',
  templateUrl: './ipd-mar.component.html',
  styleUrls: ['./ipd-mar.component.css'],
})
export class IpdMarComponent implements OnInit, OnDestroy {
  admissionId = '';
  patient: PatientMini | null = null;

  loadingPending = false;
  loadingAdministered = false;

  pendingRx: IpdPrescription[] = [];
  administeredLogs: MarLogEntry[] = [];

  // Administer modal state
  administerModalVisible = false;
  administerForm: FormGroup;
  administeringRx: IpdPrescription | null = null;
  administerSubmitting = false;

  // Phase 9.5i — same route enum as ipd-pharmacy so MAR entries align with
  // prescription routes for cross-reference.
  readonly routeOptions: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'oral', label: 'Oral (PO)' },
    { value: 'iv', label: 'Intravenous (IV)' },
    { value: 'im', label: 'Intramuscular (IM)' },
    { value: 'sc', label: 'Subcutaneous (SC)' },
    { value: 'topical', label: 'Topical' },
    { value: 'inhaled', label: 'Inhaled' },
    { value: 'pr', label: 'Per Rectum (PR)' },
    { value: 'sl', label: 'Sublingual (SL)' },
    { value: 'nasal', label: 'Nasal' },
    { value: 'ophthalmic', label: 'Ophthalmic (eye)' },
    { value: 'otic', label: 'Otic (ear)' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private ipdService: IpdService,
    private prescriptionService: IpdPrescriptionService,
    private patientLookup: AppointmentConfirmService,
    private messageService: MessageService
  ) {
    this.administerForm = this.fb.group({
      quantity: [1, [Validators.required, Validators.min(1)]],
      route: ['oral', [Validators.required]],
      remarks: [''],
      verifiedTwoIdentifiers: [false, [Validators.requiredTrue]],
      fiveRightsChecked: [false, [Validators.requiredTrue]],
    });
  }

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (!this.admissionId) return;

    this.loadPatientContext();
    this.loadPending();
    this.loadAdministered();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---- Data loading --------------------------------------------------------

  private loadPatientContext(): void {
    this.ipdService
      .getAdmission(this.admissionId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of(null))
      )
      .subscribe((adm) => {
        const prn = pickPrn(adm);
        if (prn == null) return;
        this.patientLookup
          .getDetailsByPRN(String(prn))
          .pipe(
            takeUntil(this.destroy$),
            catchError(() => of(null))
          )
          .subscribe((res) => {
            this.patient = extractPatient(res, prn);
          });
      });
  }

  loadPending(): void {
    this.loadingPending = true;
    this.prescriptionService
      .getPendingMedications(this.admissionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          this.pendingRx = extractList<IpdPrescription>(res);
          this.loadingPending = false;
        },
        error: (err: unknown) => {
          this.pendingRx = [];
          this.loadingPending = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load pending medications',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  loadAdministered(): void {
    this.loadingAdministered = true;
    this.prescriptionService
      .getMedicationAdministrationRecord(this.admissionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          this.administeredLogs = extractList<MarLogEntry>(res);
          this.loadingAdministered = false;
        },
        error: (err: unknown) => {
          this.administeredLogs = [];
          this.loadingAdministered = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load MAR',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  // ---- Administer action --------------------------------------------------

  openAdminister(rx: IpdPrescription): void {
    this.administeringRx = rx;
    this.administerForm.reset({
      quantity: rx.quantity ?? 1,
      route: rx.route || 'oral',
      remarks: '',
      verifiedTwoIdentifiers: false,
      fiveRightsChecked: false,
    });
    this.administerModalVisible = true;
  }

  submitAdminister(): void {
    if (this.administerForm.invalid || !this.administeringRx?.id) {
      this.administerForm.markAllAsTouched();
      return;
    }
    this.administerSubmitting = true;
    const value = this.administerForm.value as AdministerFormValue;
    const prescriptionId = this.administeringRx.id;
    const drugName = this.displayDrugName(this.administeringRx);

    this.prescriptionService
      .administerMedication(prescriptionId, {
        quantity: value.quantity,
        route: value.route,
        remarks: value.remarks || undefined,
        verifiedTwoIdentifiers: value.verifiedTwoIdentifiers,
        fiveRightsChecked: value.fiveRightsChecked,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.administerSubmitting = false;
          this.administerModalVisible = false;
          this.administeringRx = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Medication administered',
            detail: drugName,
            life: 3000,
          });
          this.loadPending();
          this.loadAdministered();
        },
        error: (err: unknown) => {
          this.administerSubmitting = false;
          // Keep modal open — allow user to retry without re-entering values.
          this.messageService.add({
            severity: 'error',
            summary: 'Could not administer medication',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  cancelAdminister(): void {
    this.administerModalVisible = false;
    this.administeringRx = null;
  }

  // ---- Witness co-signature (Phase 4 WF-3) --------------------------------
  // Used for high-risk meds (insulin, opioids, anticoagulants). The original
  // administering nurse already POSTed to /administer; the witness now signs
  // on the same MAR log row to attach a co-signature.

  /** High-risk classifier — drives whether the witness button shows on a row. */
  isHighRiskLog(log: MarLogEntry): boolean {
    const name = (log.prescription?.genericName || log.prescription?.brandName || '').toLowerCase();
    const remarks = (log.remarks || '').toLowerCase();
    const highRiskTerms = [
      'insulin', 'heparin', 'warfarin', 'morphine', 'fentanyl',
      'tramadol', 'pethidine', 'oxycodone', 'enoxaparin',
    ];
    if (highRiskTerms.some((t) => name.includes(t))) return true;
    if (remarks.includes('high-risk') || remarks.includes('high risk')) return true;
    return false;
  }

  /** Already witness-acknowledged → button hides / shows "co-signed". */
  isAcknowledged(log: MarLogEntry): boolean {
    return !!log.acknowledgedBySignatureId;
  }

  // Witness signature modal state.
  witnessModalVisible = false;
  witnessLog: MarLogEntry | null = null;
  witnessName = '';
  witnessSubmitting = false;

  openWitnessAck(log: MarLogEntry): void {
    this.witnessLog = log;
    this.witnessName = '';
    this.witnessModalVisible = true;
  }

  cancelWitnessAck(): void {
    this.witnessModalVisible = false;
    this.witnessLog = null;
  }

  onWitnessSigned(resp: SignatureCreateResponse): void {
    if (!this.witnessLog) return;
    this.witnessSubmitting = true;
    this.prescriptionService
      .acknowledgeMedicationLog(this.witnessLog.id, {
        acknowledgedBySignatureId: resp.id,
        acknowledgedBy: this.witnessName?.trim() || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.witnessSubmitting = false;
          this.witnessModalVisible = false;
          this.witnessLog = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Co-signature recorded',
            life: 3000,
          });
          this.loadAdministered();
        },
        error: (err: unknown) => {
          this.witnessSubmitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not record co-signature',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  // ---- View helpers -------------------------------------------------------

  displayDrugName(rx: IpdPrescription | null): string {
    if (!rx) return '—';
    return rx.genericName || rx.brandName || '—';
  }

  displayLogDrugName(log: MarLogEntry): string {
    return log.prescription?.genericName || log.prescription?.brandName || '—';
  }

  trackRxById(_: number, rx: IpdPrescription): string {
    return rx.id ?? '';
  }

  trackLogById(_: number, log: MarLogEntry): string {
    return log.id;
  }
}

// ---- Typed helpers -------------------------------------------------------

function extractList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function pickPrn(adm: unknown): string | number | null {
  if (!adm || typeof adm !== 'object') return null;
  const maybe = adm as { prn?: unknown; data?: { prn?: unknown } };
  const raw = maybe.data?.prn ?? maybe.prn;
  if (raw == null) return null;
  return typeof raw === 'number' || typeof raw === 'string' ? raw : null;
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
