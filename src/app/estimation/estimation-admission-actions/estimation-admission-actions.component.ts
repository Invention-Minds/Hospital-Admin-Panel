import { Component, Input, OnChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { EstimationService } from '../../services/estimation/estimation.service';
import { OtRequisitionService } from '../../services/ot-requisition.service';
import { DoctorSelectComponent } from '../../shared/ui/doctor-select/doctor-select.component';

/**
 * Estimation → admission/OT actions. Shown on the approved + confirmed
 * estimation screens. The doctor/estimation staff never pick a ward here:
 *  - "Refer for Admission" (all types) raises a PROPOSED admission + NS bed
 *    request (NABH WF-2). NS assigns the bed downstream.
 *  - "Create OT Requisition" (SM only) raises a pending OT requisition,
 *    pre-filled from the estimation. Both are linked by estimationId so they
 *    can't be raised twice and show a "done" pill on re-open.
 */
@Component({
  selector: 'app-estimation-admission-actions',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, TooltipModule, DoctorSelectComponent],
  templateUrl: './estimation-admission-actions.component.html',
  styleUrls: ['./estimation-admission-actions.component.css'],
})
export class EstimationAdmissionActionsComponent implements OnChanges {
  @Input() estimation: any;
  @Output() changed = new EventEmitter<void>();

  links: {
    requisition: { id: string; requisitionNo: string | null; status: string } | null;
    admission: { id: string; admissionNo: string | null; status: string } | null;
  } = { requisition: null, admission: null };

  referOpen = false;
  referSubmitting = false;
  referError = '';
  referForm = { diagnosis: '', urgency: 'routine', preferredBedType: 'general', admissionType: 'elective' };

  otOpen = false;
  otSubmitting = false;
  otError = '';
  otForm = { primarySurgery: '', surgeonName: '', bookingFrom: '', bookingTo: '', specialInstructions: '' };

  constructor(private est: EstimationService, private otReq: OtRequisitionService) {}

  get estimationId(): string { return this.estimation?.estimationId || ''; }
  get isSM(): boolean { return this.estimation?.estimationType === 'SM'; }

  ngOnChanges(): void {
    if (this.estimationId) this.loadLinks();
  }

  private loadLinks(): void {
    this.est.getEstimationLinks(this.estimationId).subscribe({
      next: (res) => { this.links = res.data; },
      error: () => { /* leave links empty — buttons just stay active */ },
    });
  }

  // ── Refer for admission ──────────────────────────────────────────────
  openRefer(): void {
    const name = this.estimation?.estimationName || '';
    this.referForm = {
      diagnosis: name ? String(name).slice(0, 200) : '',
      urgency: 'routine',
      preferredBedType: this.estimation?.roomType || 'general',
      admissionType: 'elective',
    };
    this.referError = '';
    this.referOpen = true;
  }
  closeRefer(): void { this.referOpen = false; }
  submitRefer(): void {
    if (!this.referForm.diagnosis || this.referForm.diagnosis.trim().length < 3) {
      this.referError = 'Diagnosis is required (min 3 chars).';
      return;
    }
    this.referSubmitting = true;
    this.referError = '';
    this.est.referForAdmission(this.estimationId, {
      diagnosis: this.referForm.diagnosis.trim(),
      urgency: this.referForm.urgency as 'routine' | 'urgent' | 'emergency',
      preferredBedType: this.referForm.preferredBedType,
      admissionType: this.referForm.admissionType,
    }).subscribe({
      next: () => {
        this.referSubmitting = false;
        this.referOpen = false;
        this.loadLinks();
        this.changed.emit();
      },
      error: (e) => {
        this.referSubmitting = false;
        this.referError = e?.error?.message || 'Failed to refer for admission.';
      },
    });
  }

  // ── OT requisition (SM) ──────────────────────────────────────────────
  openOt(): void {
    const start = this.defaultBookingStart();
    this.otForm = {
      primarySurgery: this.estimation?.estimationName || '',
      surgeonName: this.estimation?.consultantName || '',
      bookingFrom: start,
      bookingTo: this.addHours(start, 1),
      specialInstructions: '',
    };
    this.otError = '';
    this.otOpen = true;
  }
  closeOt(): void { this.otOpen = false; }
  submitOt(): void {
    if (!this.otForm.primarySurgery.trim()) { this.otError = 'Primary surgery is required.'; return; }
    if (!this.otForm.bookingFrom || !this.otForm.bookingTo) { this.otError = 'Booking from/to are required.'; return; }
    this.otSubmitting = true;
    this.otError = '';
    this.otReq.create({
      estimationId: this.estimationId,
      prn: this.estimation?.patientUHID != null ? String(this.estimation.patientUHID) : null,
      patientName: this.estimation?.patientName || null,
      primarySurgery: this.otForm.primarySurgery.trim(),
      surgeonName: this.otForm.surgeonName.trim() || null,
      bookingFrom: new Date(this.otForm.bookingFrom).toISOString(),
      bookingTo: new Date(this.otForm.bookingTo).toISOString(),
      additionalSurgeries: this.estimation?.multipleSurgeries || null,
      specialInstructions: this.otForm.specialInstructions.trim() || null,
    }).subscribe({
      next: () => {
        this.otSubmitting = false;
        this.otOpen = false;
        this.loadLinks();
        this.changed.emit();
      },
      error: (e) => {
        this.otSubmitting = false;
        this.otError = e?.error?.message || 'Failed to create requisition.';
      },
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────
  private defaultBookingStart(): string {
    const d = this.estimation?.estimationPreferredDate;
    const t = this.estimation?.surgeryTime;
    let base = d ? new Date(d) : new Date(Date.now() + 60 * 60 * 1000);
    if (isNaN(base.getTime())) base = new Date(Date.now() + 60 * 60 * 1000);
    if (t && /^\d{1,2}:\d{2}/.test(String(t))) {
      const [hh, mm] = String(t).split(':');
      base.setHours(Number(hh), Number(mm), 0, 0);
    }
    return this.toLocalInput(base);
  }
  private addHours(localInput: string, hours: number): string {
    const d = new Date(localInput);
    d.setHours(d.getHours() + hours);
    return this.toLocalInput(d);
  }
  private toLocalInput(d: Date): string {
    if (isNaN(d.getTime())) d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
