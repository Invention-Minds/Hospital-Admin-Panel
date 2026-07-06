import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  OpProcedure, OpProcedureService, OpProcedureStatus,
} from '../../services/op-procedure.service';
import { AppointmentConfirmService } from '../../services/appointment-confirm.service';
import { DoctorSelectComponent } from '../../shared/ui/doctor-select/doctor-select.component';

/**
 * Phase 9.4d — OP Procedures list page.
 *
 * Outpatient minor procedures (suturing, dressing, plaster, abscess
 * I&D, bedside endoscopy etc). Route: /op-procedures
 */
@Component({
  selector: 'app-op-procedure-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DoctorSelectComponent],
  templateUrl: './op-procedure-list.component.html',
  styleUrls: ['./op-procedure-list.component.css'],
})
export class OpProcedureListComponent implements OnInit, OnDestroy {
  rows: OpProcedure[] = [];
  loading = false;
  errorMessage = '';

  filterStatus: OpProcedureStatus | '' = '';
  filterFrom = '';
  filterTo = '';

  newModalOpen = false;
  creating = false;
  draft = {
    prn: '', patientName: '', age: null as number | null, gender: '',
    phoneNumber: '', procedureName: '', procedureCode: '',
    departmentName: '', performingDoctor: '', assistantName: '',
    roomName: '', anaesthesiaType: 'local', anaesthesiaAgent: '',
    scheduledAt: '', preProcedureNotes: '',
  };

  readonly statuses: ReadonlyArray<{ value: OpProcedureStatus | ''; label: string }> = [
    { value: '', label: 'All' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  readonly anaesthesiaTypes = ['local', 'topical', 'sedation', 'none'];

  private destroy$ = new Subject<void>();

  constructor(
    private svc: OpProcedureService,
    private router: Router,
    private appointmentConfirm: AppointmentConfirmService,
  ) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.list({
      status: this.filterStatus || undefined,
      fromDate: this.filterFrom || undefined,
      toDate: this.filterTo || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
    });
  }

  openNew(): void {
    this.draft = {
      prn: '', patientName: '', age: null, gender: '',
      phoneNumber: '', procedureName: '', procedureCode: '',
      departmentName: '', performingDoctor: '', assistantName: '',
      roomName: '', anaesthesiaType: 'local', anaesthesiaAgent: '',
      scheduledAt: '', preProcedureNotes: '',
    };
    this.newModalOpen = true;
  }
  closeNew(): void { this.newModalOpen = false; }

  /**
   * Auto-fill patient demographics from the PRN. Response shape is
   * { patientData: { name, mobileNo, contactNo, age, gender, ... } }. Only
   * fills draft fields that are currently empty so manual entry is preserved.
   */
  onPrnChange(): void {
    const prn = this.draft.prn?.trim();
    if (!prn) return;
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
        if (this.draft.age == null && p.age != null && p.age !== '') {
          const n = Number(p.age);
          if (!Number.isNaN(n)) this.draft.age = n;
        }
        if (!this.draft.gender && p.gender) {
          this.draft.gender = p.gender;
        }
      },
      error: () => { /* best-effort autofill */ },
    });
  }

  submitNew(): void {
    if (!this.draft.prn.trim() || !this.draft.patientName.trim() || !this.draft.procedureName.trim() || !this.draft.performingDoctor.trim()) {
      this.errorMessage = 'PRN, patient, procedure, doctor are required';
      return;
    }
    this.creating = true;
    this.svc.create({
      prn: this.draft.prn.trim(),
      patientName: this.draft.patientName.trim(),
      age: this.draft.age,
      gender: this.draft.gender || null,
      phoneNumber: this.draft.phoneNumber || null,
      procedureName: this.draft.procedureName.trim(),
      procedureCode: this.draft.procedureCode || null,
      departmentName: this.draft.departmentName || null,
      performingDoctor: this.draft.performingDoctor.trim(),
      assistantName: this.draft.assistantName || null,
      roomName: this.draft.roomName || null,
      anaesthesiaType: this.draft.anaesthesiaType || null,
      anaesthesiaAgent: this.draft.anaesthesiaAgent || null,
      scheduledAt: this.draft.scheduledAt || null,
      preProcedureNotes: this.draft.preProcedureNotes || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.creating = false;
        this.closeNew();
        // Navigate straight to the detail page for further data entry.
        this.router.navigate(['/op-procedures', r.data.id]);
      },
      error: (e) => {
        this.creating = false;
        this.errorMessage = e?.error?.message || 'Failed to create procedure';
      },
    });
  }

  open(row: OpProcedure): void {
    this.router.navigate(['/op-procedures', row.id]);
  }

  statusClass(s: OpProcedureStatus): string {
    return `opl-pill opl-status-${s}`;
  }
}
