import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  OtRequisition,
  OtRequisitionService,
  OtRequisitionStatus,
} from '../../services/ot-requisition.service';
import { IpdService, IpdAdmission } from '../../services/ipd.service';
import { OtWorkflowService, OtRoom, OtUrgency } from '../../services/ot-workflow.service';
import { AlertService } from '../../services/alert.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorSelectComponent } from '../../shared/ui/doctor-select/doctor-select.component';

/**
 * Phase 9.1a — OT Requisition queue (mirrors reference HMIS "Search
 * Requisition" + "Enter Requisition" dialogs).
 *
 * Three sections:
 *   1. Filters (status, date range, PRN)
 *   2. Table of existing requisitions
 *   3. "New requisition" modal (opens from + button)
 */
@Component({
  selector: 'app-ot-requisition-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorSelectComponent],
  templateUrl: './ot-requisition-list.component.html',
  styleUrls: ['./ot-requisition-list.component.css'],
})
export class OtRequisitionListComponent implements OnInit, OnDestroy {
  rows: OtRequisition[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  filterStatus: OtRequisitionStatus | '' = 'pending';
  filterFrom = '';
  filterTo = '';
  filterPrn = '';

  newModalOpen = false;
  creating = false;
  draft = {
    patientName: '',
    prn: '',
    patientAdmitted: false,
    admissionId: '',
    bedCategory: '',
    phoneNumber: '',
    bookingFrom: '',
    bookingTo: '',
    primarySurgery: '',
    departmentId: null as number | null,
    categoryCode: '',
    surgeonName: '',
    anaesthetistName: '',
    anaesthesiaType: '',
    specialInstructions: '',
    requisitionBy: '',
  };

  readonly statuses: ReadonlyArray<{ value: OtRequisitionStatus | ''; label: string }> = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'fulfilled', label: 'Fulfilled' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  readonly bedCategories = ['ER', 'Day Care', 'Ward', 'ICU', 'Private'];
  readonly anaesthesiaTypes = ['GA', 'SA', 'EA', 'Regional', 'Block', 'MAC', 'Local'];

  // Admission picker — populated when the user types a PRN. Shown as a
  // dropdown so the user picks an admission by AdmissionNo + date rather
  // than typing a UUID.
  admissionOptions: IpdAdmission[] = [];
  admissionLoading = false;

  // ─── Schedule-from-requisition modal ──────────────────────────────────
  rooms: OtRoom[] = [];
  scheduleModalOpen = false;
  scheduling = false;
  scheduleSource: OtRequisition | null = null;
  readonly urgencies: OtUrgency[] = ['elective', 'urgent', 'emergency'];
  scheduleDraft = {
    otRoomId: '',
    date: '',
    plannedStart: '',
    plannedEnd: '',
    procedureName: '',
    procedureCode: '',
    patientName: '',
    prn: '',
    admissionId: '',
    surgeonName: '',
    anaesthesiologistName: '',
    urgency: 'elective' as OtUrgency,
  };

  private destroy$ = new Subject<void>();

  constructor(
    private svc: OtRequisitionService,
    private router: Router,
    private ipd: IpdService,
    private ot: OtWorkflowService,
    private alertSvc: AlertService,
    private appointmentConfirm: AppointmentConfirmService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadRooms();
  }

  loadRooms(): void {
    this.ot.listRooms().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rooms = r ?? []; },
      error: () => { this.rooms = []; },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.list({
      status: this.filterStatus || undefined,
      prn: this.filterPrn || undefined,
      fromDate: this.filterFrom || undefined,
      toDate: this.filterTo || undefined,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.rows = res.data; this.loading = false; },
        error: (e) => {
          this.errorMessage = e?.error?.message || 'Failed to load requisitions';
          this.loading = false;
        },
      });
  }

  openNew(): void {
    this.draft = {
      patientName: '', prn: '', patientAdmitted: false, admissionId: '',
      bedCategory: '', phoneNumber: '', bookingFrom: '', bookingTo: '',
      primarySurgery: '', departmentId: null, categoryCode: '',
      surgeonName: '', anaesthetistName: '', anaesthesiaType: '',
      specialInstructions: '', requisitionBy: '',
    };
    this.admissionOptions = [];
    this.newModalOpen = true;
  }
  closeNew(): void { this.newModalOpen = false; }

  /** Re-fetch admissions whenever PRN changes — drives the admission dropdown. */
  onPrnChange(): void {
    this.draft.admissionId = '';
    this.admissionOptions = [];
    const prn = this.draft.prn.trim();
    if (!prn) return;
    this.admissionLoading = true;
    this.ipd.getAdmissionsByPrn(prn).pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        this.admissionOptions = rows;
        this.admissionLoading = false;
        // Auto-fill patient name + admitted flag from the most recent admission
        // so the user doesn't retype it. They can still override.
        if (rows.length && !this.draft.patientName) {
          this.draft.patientName = (rows[0] as IpdAdmission & { patientName?: string }).patientName ?? '';
          this.draft.patientAdmitted = true;
        }
      },
      error: () => { this.admissionLoading = false; },
    });

    // Also pull full patient details by PRN and fill the demographic fields the
    // form has (patientName + phoneNumber). Only sets empty fields so we don't
    // clobber anything the user already typed. Response shape is
    // { patientData: { name, mobileNo, contactNo, ... } }.
    this.appointmentConfirm.getDetailsByPRN(prn).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const p = res?.patientData;
        if (!p) return;
        if (!this.draft.patientName && p.name) {
          this.draft.patientName = p.name;
        }
        if (!this.draft.phoneNumber) {
          this.draft.phoneNumber = p.mobileNo || p.contactNo || this.draft.phoneNumber;
        }
      },
      error: () => { /* PRN lookup is best-effort; admission fetch above still runs */ },
    });
  }

  submitNew(): void {
    if (!this.draft.primarySurgery.trim() || !this.draft.bookingFrom || !this.draft.bookingTo) {
      this.errorMessage = 'Primary surgery, booking from, booking to are required';
      return;
    }
    this.creating = true;
    this.errorMessage = '';
    this.svc.create({
      patientName: this.draft.patientName || null,
      prn: this.draft.prn || null,
      patientAdmitted: this.draft.patientAdmitted,
      admissionId: this.draft.admissionId || null,
      bedCategory: this.draft.bedCategory || null,
      phoneNumber: this.draft.phoneNumber || null,
      bookingFrom: this.draft.bookingFrom,
      bookingTo: this.draft.bookingTo,
      primarySurgery: this.draft.primarySurgery.trim(),
      departmentId: this.draft.departmentId,
      categoryCode: this.draft.categoryCode || null,
      surgeonName: this.draft.surgeonName || null,
      anaesthetistName: this.draft.anaesthetistName || null,
      anaesthesiaType: this.draft.anaesthesiaType || null,
      specialInstructions: this.draft.specialInstructions || null,
      requisitionBy: this.draft.requisitionBy || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.creating = false;
        this.successMessage = 'Requisition created.';
        this.closeNew();
        this.load();
      },
      error: (e) => {
        this.creating = false;
        this.errorMessage = e?.error?.message || 'Failed to create requisition';
      },
    });
  }

  async cancelRow(row: OtRequisition): Promise<void> {
    const reason = await this.alertSvc.prompt('Cancel reason?', { title: 'Cancel requisition', placeholder: 'Reason…', confirmLabel: 'Cancel', severity: 'warning' });
    if (!reason) return;
    this.svc.cancel(row.id, reason).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Cancelled.'; this.load(); },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to cancel'; },
    });
  }

  openSchedule(row: OtRequisition): void {
    const scheduleId = row.schedules?.[0]?.id;
    if (scheduleId) this.router.navigate(['/surgery-ot', scheduleId]);
  }

  // ─── Schedule a pending requisition into an OT slot ───────────────────
  /** Open the booking modal pre-filled from the requisition row. */
  openScheduleModal(row: OtRequisition): void {
    this.scheduleSource = row;
    this.scheduleDraft = {
      otRoomId: row.otRoomId || this.rooms[0]?.id || '',
      date: this.ymdOf(row.bookingFrom),
      plannedStart: this.isoToLocalInput(row.bookingFrom),
      plannedEnd: this.isoToLocalInput(row.bookingTo),
      procedureName: row.primarySurgery || '',
      procedureCode: row.categoryCode || '',
      patientName: row.patientName || '',
      prn: row.prn || '',
      admissionId: row.admissionId || '',
      surgeonName: row.surgeonName || '',
      anaesthesiologistName: row.anaesthetistName || '',
      urgency: 'elective',
    };
    this.errorMessage = '';
    this.successMessage = '';
    this.scheduleModalOpen = true;
  }

  closeScheduleModal(): void {
    this.scheduleModalOpen = false;
    this.scheduleSource = null;
  }

  submitSchedule(): void {
    if (!this.scheduleSource) return;
    if (!this.scheduleDraft.otRoomId) { this.errorMessage = 'Pick an OT room.'; return; }
    if (!this.scheduleDraft.procedureName.trim()) { this.errorMessage = 'Procedure name is required.'; return; }
    if (!this.scheduleDraft.plannedStart || !this.scheduleDraft.plannedEnd) {
      this.errorMessage = 'Planned start and end are required.';
      return;
    }
    if (this.scheduleDraft.plannedEnd <= this.scheduleDraft.plannedStart) {
      this.errorMessage = 'Planned end must be after planned start.';
      return;
    }
    this.scheduling = true;
    this.errorMessage = '';
    this.ot.createSchedule({
      otRoomId: this.scheduleDraft.otRoomId,
      date: this.scheduleDraft.date || this.scheduleDraft.plannedStart.slice(0, 10),
      plannedStart: `${this.scheduleDraft.plannedStart}:00`,
      plannedEnd: `${this.scheduleDraft.plannedEnd}:00`,
      procedureName: this.scheduleDraft.procedureName.trim(),
      procedureCode: this.scheduleDraft.procedureCode.trim() || undefined,
      patientName: this.scheduleDraft.patientName.trim() || undefined,
      prn: this.scheduleDraft.prn.trim() || undefined,
      admissionId: this.scheduleDraft.admissionId.trim() || undefined,
      surgeonName: this.scheduleDraft.surgeonName.trim() || undefined,
      anaesthesiologistName: this.scheduleDraft.anaesthesiologistName.trim() || undefined,
      urgency: this.scheduleDraft.urgency,
      requisitionId: this.scheduleSource.id,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (sched) => {
        this.scheduling = false;
        this.scheduleModalOpen = false;
        this.scheduleSource = null;
        this.successMessage = `Scheduled "${sched.procedureName}" — requisition marked scheduled. Open it from the queue or the OT board.`;
        this.load();
      },
      error: (e) => {
        this.scheduling = false;
        this.errorMessage = e?.error?.error || e?.error?.message || 'Failed to schedule';
      },
    });
  }

  /** "2026-05-16T09:00:00.000Z" → "2026-05-16" (local). */
  private ymdOf(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** ISO datetime → "YYYY-MM-DDTHH:mm" for a datetime-local input (local TZ). */
  private isoToLocalInput(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  statusClass(s: OtRequisitionStatus): string {
    return `req-pill req-${s}`;
  }
}
