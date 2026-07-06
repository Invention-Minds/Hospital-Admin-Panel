import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  PatientsAffectedItem,
  StaffHandover,
  StaffHandoverEventType,
  StaffHandoverShift,
  StaffHandoverService,
} from '../services/staff-handover.service';
import { SignatureCreateResponse } from '../services/signature.service';
import { DoctorServiceService } from '../services/doctor-details/doctor-service.service';
import { Department } from '../models/department.model';
import { WardManagementService, Ward } from '../services/ward-management.service';
import { IpdService, IpdAdmission } from '../services/ipd.service';

/**
 * Phase 7 — Staff handover / contingency reassignment screen.
 *
 * Two tabs:
 *   • "Raise handover"  — outgoing staff fills the form + signs as originator.
 *   • "Queue"           — incoming staff acknowledges/declines OPEN rows,
 *                         supervisor signs RATIO_BREACH escalations,
 *                         charge nurse closes ACKNOWLEDGED rows.
 *
 * All payload field names mirror the backend StaffHandover columns 1:1.
 */
@Component({
  selector: 'app-staff-handover',
  templateUrl: './staff-handover.component.html',
  styleUrls: ['./staff-handover.component.css'],
})
export class StaffHandoverComponent implements OnInit, OnDestroy {
  activeTab: 'raise' | 'queue' = 'queue';

  loading = false;
  errorMessage = '';
  successMessage = '';

  // ─── Raise form (CreateHandoverPayload mirror) ──────────────────────
  raiseForm = {
    eventType: 'PLANNED_SHIFT' as StaffHandoverEventType,
    shift: 'morning' as StaffHandoverShift,
    department: '',
    wardId: '',
    originatorName: '',
    originatorRole: 'nurse',
    rationale: '',
    pendingTasks: '',
  };
  patientsAffected: PatientsAffectedItem[] = [];
  pendingPatientId = '';
  pendingPatientPrn = '';
  pendingPatientSummary = '';
  raisedRow: StaffHandover | null = null; // last raised row, used to capture originator signature

  // Dropdown sources for the raise form
  departmentOptions: Department[] = [];
  wardOptions: Ward[] = [];
  admissionOptions: IpdAdmission[] = [];

  // ─── Queue state ────────────────────────────────────────────────────
  open: StaffHandover[] = [];
  acknowledged: StaffHandover[] = [];
  expandedId: string | null = null;

  // Acknowledge / decline panel state
  ackOutcome: 'ACKNOWLEDGED' | 'DECLINED' = 'ACKNOWLEDGED';
  receiverName = '';
  receiverRole = '';
  declineReason = '';

  // Supervisor sign state (RATIO_BREACH only)
  supervisorName = '';

  raiseSubmitting = false;
  ackSubmitting = false;
  supervisorSubmitting = false;
  closeSubmitting = false;

  readonly eventTypeOptions: { value: StaffHandoverEventType; label: string }[] = [
    { value: 'PLANNED_SHIFT', label: 'Planned shift change' },
    { value: 'UNPLANNED_ABSENCE', label: 'Unplanned absence' },
    { value: 'RATIO_BREACH', label: 'Nurse:patient ratio breach' },
    { value: 'DOCTOR_UNAVAILABLE', label: 'Doctor unavailable' },
  ];
  readonly shiftOptions: { value: StaffHandoverShift; label: string }[] = [
    { value: 'morning', label: 'Morning' },
    { value: 'evening', label: 'Evening' },
    { value: 'night', label: 'Night' },
    { value: 'adhoc', label: 'Ad-hoc' },
  ];
  readonly roleOptions = ['doctor', 'nurse', 'charge-nurse', 'admin', 'other'];

  private destroy$ = new Subject<void>();
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private handoverService: StaffHandoverService,
    private doctorService: DoctorServiceService,
    private wardService: WardManagementService,
    private ipdService: IpdService,
  ) {}

  ngOnInit(): void {
    this.refreshQueue();
    this.pollHandle = setInterval(() => this.refreshQueue(true), 30_000);
    this.loadFormOptions();
  }

  private loadFormOptions(): void {
    this.doctorService
      .getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => (this.departmentOptions = rows ?? []),
        error: () => (this.departmentOptions = []),
      });
    this.wardService
      .getAllWards()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => (this.wardOptions = rows ?? []),
        error: () => (this.wardOptions = []),
      });
    this.ipdService
      .getAllAdmissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => (this.admissionOptions = rows ?? []),
        error: () => (this.admissionOptions = []),
      });
  }

  /** Selecting an admission auto-populates the matching PRN (and vice versa). */
  onPendingAdmissionChange(value: string): void {
    this.pendingPatientId = value;
    const found = this.admissionOptions.find(
      (a) => (a.admissionNo ?? a.id) === value,
    );
    if (found?.prn) this.pendingPatientPrn = found.prn;
  }

  onPendingPrnChange(prn: string): void {
    this.pendingPatientPrn = prn;
    const found = this.admissionOptions.find((a) => a.prn === prn);
    if (found) this.pendingPatientId = found.admissionNo ?? found.id ?? '';
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectTab(tab: 'raise' | 'queue'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    if (tab === 'queue') this.refreshQueue();
  }

  // ─── Queue ──────────────────────────────────────────────────────────
  refreshQueue(quiet = false): void {
    if (!quiet) this.loading = true;
    let pending = 2;
    const buckets: Record<string, StaffHandover[]> = {};
    (['OPEN', 'ACKNOWLEDGED'] as const).forEach((s) => {
      this.handoverService
        .list({ status: s })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (rows) => {
            buckets[s] = rows;
            pending -= 1;
            if (pending === 0) {
              this.open = buckets['OPEN'] ?? [];
              this.acknowledged = buckets['ACKNOWLEDGED'] ?? [];
              this.loading = false;
            }
          },
          error: () => {
            buckets[s] = [];
            pending -= 1;
            if (pending === 0) {
              this.open = buckets['OPEN'] ?? [];
              this.acknowledged = buckets['ACKNOWLEDGED'] ?? [];
              this.loading = false;
            }
          },
        });
    });
  }

  // ─── Raise ──────────────────────────────────────────────────────────
  addPatient(): void {
    if (!this.pendingPatientId.trim()) return;
    this.patientsAffected.push({
      admissionId: this.pendingPatientId.trim(),
      prn: this.pendingPatientPrn.trim() || undefined,
      summary: this.pendingPatientSummary.trim() || undefined,
    });
    this.pendingPatientId = '';
    this.pendingPatientPrn = '';
    this.pendingPatientSummary = '';
  }

  removePatient(index: number): void {
    this.patientsAffected.splice(index, 1);
  }

  /** True when the raise form has the minimum fields backend will accept. */
  get canRaiseSign(): boolean {
    return (
      !this.raisedRow &&
      !!this.raiseForm.originatorName.trim() &&
      this.raiseForm.rationale.trim().length >= 10
    );
  }

  /** First step — create the row in OPEN, then the e-sign attaches originatorSignatureId. */
  onOriginatorSigned(resp: SignatureCreateResponse): void {
    this.raiseSubmitting = true;
    this.handoverService
      .create({
        eventType: this.raiseForm.eventType,
        shift: this.raiseForm.shift,
        department: this.raiseForm.department?.trim() || undefined,
        wardId: this.raiseForm.wardId?.trim() || undefined,
        originatorName: this.raiseForm.originatorName.trim(),
        originatorRole: this.raiseForm.originatorRole || undefined,
        originatorSignatureId: resp.id,
        rationale: this.raiseForm.rationale.trim(),
        patientsAffected: this.patientsAffected,
        pendingTasks: this.raiseForm.pendingTasks?.trim() || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (row) => {
          this.raiseSubmitting = false;
          this.raisedRow = row;
          this.successMessage =
            'Handover raised. Incoming staff will see it in the queue.';
          this.refreshQueue();
        },
        error: (err) => {
          this.raiseSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to raise handover';
        },
      });
  }

  resetRaiseForm(): void {
    this.raisedRow = null;
    this.patientsAffected = [];
    this.raiseForm = {
      eventType: 'PLANNED_SHIFT',
      shift: 'morning',
      department: '',
      wardId: '',
      originatorName: '',
      originatorRole: 'nurse',
      rationale: '',
      pendingTasks: '',
    };
    this.successMessage = '';
    this.errorMessage = '';
  }

  // ─── Per-row queue actions ──────────────────────────────────────────
  toggleRow(row: StaffHandover): void {
    if (this.expandedId === row.id) {
      this.expandedId = null;
      return;
    }
    this.expandedId = row.id;
    this.ackOutcome = 'ACKNOWLEDGED';
    this.receiverName = '';
    this.receiverRole = '';
    this.declineReason = '';
    this.supervisorName = '';
  }

  isExpanded(row: StaffHandover): boolean {
    return this.expandedId === row.id;
  }

  /** Receiver acknowledges with their e-signature. */
  onReceiverSigned(row: StaffHandover, resp: SignatureCreateResponse): void {
    if (!this.receiverName?.trim()) {
      this.errorMessage = 'Enter receiver name before signing.';
      return;
    }
    this.ackSubmitting = true;
    this.handoverService
      .acknowledge(row.id, {
        receiverName: this.receiverName.trim(),
        receiverRole: this.receiverRole || undefined,
        receiverSignatureId: resp.id,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ackSubmitting = false;
          this.expandedId = null;
          this.refreshQueue();
        },
        error: (err) => {
          this.ackSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to acknowledge';
        },
      });
  }

  submitDecline(row: StaffHandover): void {
    if (!this.receiverName?.trim()) {
      this.errorMessage = 'Receiver name is required when declining.';
      return;
    }
    if (!this.declineReason || this.declineReason.trim().length < 5) {
      this.errorMessage = 'Decline reason (min 5 chars) is required.';
      return;
    }
    this.ackSubmitting = true;
    this.handoverService
      .decline(row.id, {
        receiverName: this.receiverName.trim(),
        receiverRole: this.receiverRole || undefined,
        declineReason: this.declineReason.trim(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.ackSubmitting = false;
          this.expandedId = null;
          this.refreshQueue();
        },
        error: (err) => {
          this.ackSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to decline';
        },
      });
  }

  /** Supervisor signs a RATIO_BREACH row. */
  onSupervisorSigned(row: StaffHandover, resp: SignatureCreateResponse): void {
    if (!this.supervisorName?.trim()) {
      this.errorMessage = 'Supervisor name is required.';
      return;
    }
    this.supervisorSubmitting = true;
    this.handoverService
      .supervisorSign(row.id, {
        supervisorName: this.supervisorName.trim(),
        supervisorSignatureId: resp.id,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.supervisorSubmitting = false;
          this.refreshQueue();
        },
        error: (err) => {
          this.supervisorSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to record supervisor signature';
        },
      });
  }

  closeRow(row: StaffHandover): void {
    this.closeSubmitting = true;
    this.handoverService
      .close(row.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeSubmitting = false;
          this.expandedId = null;
          this.refreshQueue();
        },
        error: (err) => {
          this.closeSubmitting = false;
          this.errorMessage = err?.error?.error || 'Failed to close handover';
        },
      });
  }

  // ─── View helpers ───────────────────────────────────────────────────
  patientsOf(row: StaffHandover): PatientsAffectedItem[] {
    return this.handoverService.parsePatients(row);
  }

  pillClass(eventType: StaffHandoverEventType): string {
    switch (eventType) {
      case 'PLANNED_SHIFT': return 'pill pill-info';
      case 'UNPLANNED_ABSENCE': return 'pill pill-warn';
      case 'RATIO_BREACH': return 'pill pill-danger';
      case 'DOCTOR_UNAVAILABLE': return 'pill pill-warn';
      default: return 'pill';
    }
  }

  eventLabel(eventType: StaffHandoverEventType): string {
    return this.eventTypeOptions.find((o) => o.value === eventType)?.label ?? eventType;
  }

  needsSupervisor(row: StaffHandover): boolean {
    return row.eventType === 'RATIO_BREACH' && !row.supervisorSignatureId;
  }
}
