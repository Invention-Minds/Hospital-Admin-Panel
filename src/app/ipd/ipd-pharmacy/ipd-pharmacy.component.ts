import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { IpdService } from '../../services/ipd.service';
import {
  CarryoverPrescription,
  CarryoverTablet,
  IpdPrescription,
  IpdPrescriptionService,
} from '../../services/ipd-prescription.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';

/**
 * Sprint 3c — Screen A — IPD Pharmacy Review.
 *
 * Doctor / pharmacist view. Two sections scoped to a single IPD admission:
 *
 *   1. Carryover prescriptions (last 7 days of OPD/Emergency Rx for this
 *      patient). Per-tablet rows. Action: Continue (creates an
 *      IpdPrescription from the OPD tablet's fields).
 *   2. Active IPD prescriptions (status=active). Per-row actions: Modify
 *      (opens a modal with FORM pattern) and Discontinue (opens a danger
 *      ConfirmDialog).
 *
 * Patient-context lookup path (per docs/audits/patient-vs-patient-details.md):
 *   admissionId → getAdmission(prn) → getDetailsByPRN(PatientDetails)
 *
 * Fire-and-forget UX: backend returns 200/201 immediately; UI never shows
 * HMIS sync status. Errors keep modals open so the user can retry.
 */

interface CarryoverRow {
  prescriptionId: string;     // OPD prescriptionId
  prescribedBy: string;
  prescribedDate: string;
  patientName: string;
  tablet: CarryoverTablet;    // flattened
}

interface ModifyFormValue {
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

interface PatientMini {
  name?: string;
  prn?: number | string;
}

@Component({
  selector: 'app-ipd-pharmacy',
  templateUrl: './ipd-pharmacy.component.html',
  styleUrls: ['./ipd-pharmacy.component.css'],
})
export class IpdPharmacyComponent implements OnInit, OnDestroy {
  admissionId = '';
  patient: PatientMini | null = null;

  loadingCarryover = false;
  loadingActive = false;

  carryoverRows: CarryoverRow[] = [];
  activePrescriptions: IpdPrescription[] = [];

  continuingKey: string | null = null; // disables a row button mid-flight

  // ---- Modify modal ----
  modifyModalVisible = false;
  modifyForm: FormGroup;
  modifyingRx: IpdPrescription | null = null;
  modifySubmitting = false;

  // ---- Discontinue confirm ----
  discontinueConfirmVisible = false;
  discontinueReason = '';
  pendingDiscontinueRx: IpdPrescription | null = null;
  discontinueSubmitting = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private ipdService: IpdService,
    private prescriptionService: IpdPrescriptionService,
    private patientLookup: AppointmentConfirmService,
    private messageService: MessageService
  ) {
    this.modifyForm = this.fb.group({
      dose: ['', [Validators.required]],
      frequency: ['', [Validators.required]],
      duration: ['', [Validators.required]],
      route: ['oral', [Validators.required]],
      instructions: [''],
    });
  }

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (!this.admissionId) return;

    this.loadPatientContext();
    this.loadCarryover();
    this.loadActive();
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

  loadCarryover(): void {
    this.loadingCarryover = true;
    this.prescriptionService
      .reviewCarryoverPrescriptions(this.admissionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          this.carryoverRows = flattenCarryover(extractList<CarryoverPrescription>(res));
          this.loadingCarryover = false;
        },
        error: (err: unknown) => {
          this.carryoverRows = [];
          this.loadingCarryover = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load carryover prescriptions',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  loadActive(): void {
    this.loadingActive = true;
    this.prescriptionService
      .getAdmissionPrescriptions(this.admissionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: unknown) => {
          const rows = extractList<IpdPrescription>(res);
          this.activePrescriptions = rows.filter(
            (rx) => rx.status !== 'discontinued'
          );
          this.loadingActive = false;
        },
        error: (err: unknown) => {
          this.activePrescriptions = [];
          this.loadingActive = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load active prescriptions',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  // ---- Continue action -----------------------------------------------------

  continueCarryover(row: CarryoverRow): void {
    const key = `${row.prescriptionId}|${row.tablet.id}`;
    if (this.continuingKey === key) return;
    this.continuingKey = key;

    const payload: IpdPrescription = {
      admissionId: this.admissionId,
      prescriptionId: row.prescriptionId,
      prescribedBy: row.prescribedBy,
      genericName: row.tablet.genericName,
      brandName: row.tablet.brandName || undefined,
      dose: deriveDose(row.tablet),
      frequency: row.tablet.frequency,
      duration: row.tablet.duration,
      route: row.tablet.route || 'oral',
      instructions: row.tablet.instructions || undefined,
      quantity: row.tablet.quantity,
      isCarryOver: true,
      carryOverFrom: 'opd',
      adminStatus: 'pending',
      status: 'active',
    };

    this.prescriptionService
      .continuePrescription(this.admissionId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.continuingKey = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Continued in IPD',
            detail: row.tablet.genericName,
            life: 3000,
          });
          this.carryoverRows = this.carryoverRows.filter(
            (r) => !(r.prescriptionId === row.prescriptionId && r.tablet.id === row.tablet.id)
          );
          this.loadActive();
        },
        error: (err: unknown) => {
          this.continuingKey = null;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not continue prescription',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  // ---- Modify action -------------------------------------------------------

  openModify(rx: IpdPrescription): void {
    this.modifyingRx = rx;
    this.modifyForm.reset({
      dose: rx.dose,
      frequency: rx.frequency,
      duration: rx.duration,
      route: rx.route || 'oral',
      instructions: rx.instructions ?? '',
    });
    this.modifyModalVisible = true;
  }

  submitModify(): void {
    if (this.modifyForm.invalid || !this.modifyingRx?.id) {
      this.modifyForm.markAllAsTouched();
      return;
    }
    this.modifySubmitting = true;
    const value = this.modifyForm.value as ModifyFormValue;
    const prescriptionId = this.modifyingRx.id;

    this.prescriptionService
      .modifyPrescription(prescriptionId, {
        dose: value.dose,
        frequency: value.frequency,
        duration: value.duration,
        route: value.route,
        instructions: value.instructions || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.modifySubmitting = false;
          this.modifyModalVisible = false;
          this.modifyingRx = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Prescription modified',
            life: 3000,
          });
          this.loadActive();
        },
        error: (err: unknown) => {
          this.modifySubmitting = false;
          // Keep the modal open so the user can retry with the current values.
          this.messageService.add({
            severity: 'error',
            summary: 'Could not modify prescription',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  cancelModify(): void {
    this.modifyModalVisible = false;
    this.modifyingRx = null;
  }

  // ---- Discontinue action --------------------------------------------------

  attemptDiscontinue(rx: IpdPrescription): void {
    this.pendingDiscontinueRx = rx;
    this.discontinueReason = '';
    this.discontinueConfirmVisible = true;
  }

  confirmDiscontinue(): void {
    const rx = this.pendingDiscontinueRx;
    if (!rx?.id || this.discontinueSubmitting) return;
    this.discontinueSubmitting = true;

    this.prescriptionService
      .discontinuePrescription(rx.id, this.discontinueReason || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.discontinueSubmitting = false;
          this.discontinueConfirmVisible = false;
          this.pendingDiscontinueRx = null;
          this.messageService.add({
            severity: 'success',
            summary: 'Prescription discontinued',
            detail: rx.genericName,
            life: 3000,
          });
          this.loadActive();
        },
        error: (err: unknown) => {
          this.discontinueSubmitting = false;
          this.discontinueConfirmVisible = false;
          this.pendingDiscontinueRx = null;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not discontinue prescription',
            detail: toErrorMessage(err),
            life: 5000,
          });
        },
      });
  }

  cancelDiscontinue(): void {
    this.discontinueConfirmVisible = false;
    this.pendingDiscontinueRx = null;
  }

  // ---- View helpers --------------------------------------------------------

  statusPillClass(status: IpdPrescription['status']): string {
    switch (status) {
      case 'active':
        return 'pill pill--active';
      case 'paused':
        return 'pill pill--paused';
      case 'discontinued':
        return 'pill pill--discontinued';
      default:
        return 'pill';
    }
  }

  displayDrugName(row: CarryoverRow | IpdPrescription): string {
    if ('tablet' in row) {
      const t = row.tablet;
      return t.genericName || t.brandName || '—';
    }
    return row.genericName || row.brandName || '—';
  }

  displayRowKey(row: CarryoverRow): string {
    return `${row.prescriptionId}|${row.tablet.id}`;
  }

  trackActiveById(_: number, rx: IpdPrescription): string {
    return rx.id ?? '';
  }
}

// ---- Local helpers (typed) ------------------------------------------------

function extractList<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && 'data' in res) {
    const data = (res as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function flattenCarryover(list: CarryoverPrescription[]): CarryoverRow[] {
  const rows: CarryoverRow[] = [];
  for (const p of list) {
    if (!p.tablets || p.tablets.length === 0) continue;
    for (const tablet of p.tablets) {
      rows.push({
        prescriptionId: p.prescriptionId,
        prescribedBy: p.prescribedBy,
        prescribedDate: p.prescribedDate,
        patientName: p.patientName,
        tablet,
      });
    }
  }
  return rows;
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

function deriveDose(tablet: CarryoverTablet): string {
  // OPD tablets don't carry an explicit dose column — surface the
  // frequency / quantity as the best proxy for the new IPD row.
  if (tablet.instructions && tablet.instructions.trim().length > 0) {
    return tablet.instructions.trim();
  }
  return `${tablet.quantity}`;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const maybe = err as { error?: { message?: string }; message?: string };
    return maybe.error?.message ?? maybe.message ?? 'Unknown error';
  }
  return 'Unknown error';
}
