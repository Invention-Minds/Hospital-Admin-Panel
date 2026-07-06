import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  EstimationSurgeryLine,
  EstimationSurgeryLineService,
  EstimationSurgeryRole,
} from '../../services/estimation-surgery-line.service';
import { MastersService, MasterDepartment } from '../../services/masters.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { Doctor } from '../../models/doctor.model';
import { OtSetupService, SurgeryProcedureMaster } from '../../services/ot-setup.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.4c — "Order Surgeries" page.
 *
 * Mirrors the reference HMIS Order Surgeries screen — one line per
 * service rendered by a specific staff role (Surgeon / Co-Surgeon /
 * Anaesthetist / Assistant Surgeon / OT Rent / Other) with rate +
 * discount + adjustment. Scoped by estimationId.
 *
 * Route: /estimation/:estimationId/order-surgeries
 */
@Component({
  selector: 'app-order-surgeries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-surgeries.component.html',
  styleUrls: ['./order-surgeries.component.css'],
})
export class OrderSurgeriesComponent implements OnInit, OnDestroy {
  estimationId = '';
  rows: EstimationSurgeryLine[] = [];
  subtotal = 0;
  loading = false;
  errorMessage = '';
  successMessage = '';

  draft: {
    surgeryName: string;
    departmentName: string;
    categoryCode: string;
    role: EstimationSurgeryRole;
    serviceCode: string;
    serviceName: string;
    renderedBy: string;
    rate: number;
    quantity: number;
    discountPercent: number;
    discountReason: string;
    adjustmentAmount: number;
    adjustmentReason: string;
  } = {
    surgeryName: '', departmentName: '', categoryCode: '',
    role: 'surgeon', serviceCode: '', serviceName: '',
    renderedBy: '', rate: 0, quantity: 1,
    discountPercent: 0, discountReason: '',
    adjustmentAmount: 0, adjustmentReason: '',
  };

  readonly roles: ReadonlyArray<{ value: EstimationSurgeryRole; label: string }> = [
    { value: 'surgeon', label: 'Surgeon' },
    { value: 'co-surgeon', label: 'Co-Surgeon' },
    { value: 'assistant-surgeon', label: 'Assistant Surgeon' },
    { value: 'anaesthetist', label: 'Anaesthetist' },
    { value: 'ot-rent', label: 'OT Rent' },
    { value: 'other', label: 'Other' },
  ];

  // Phase 9.5i — master lookups for dropdowns
  departments: MasterDepartment[] = [];
  doctors: Doctor[] = [];
  // Phase 9.5j — surgery master picker
  surgeryMaster: SurgeryProcedureMaster[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: EstimationSurgeryLineService,
    private masters: MastersService,
    private doctorSvc: DoctorServiceService,
    private setup: OtSetupService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.estimationId = this.route.snapshot.paramMap.get('estimationId') ?? '';
    if (this.estimationId) this.load();
    this.masters.listDepartments().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.departments = r; },
    });
    this.doctorSvc.getDoctors().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.doctors = r; },
    });
    this.setup.listSurgeryMaster().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.surgeryMaster = r.data; },
    });
  }

  /** Auto-fill department + category when picking from surgery master. */
  onSurgeryNamePick(name: string): void {
    const m = this.surgeryMaster.find((s) => s.name === name);
    if (!m) return;
    if (!this.draft.categoryCode && m.categoryCode) this.draft.categoryCode = m.categoryCode;
    if (!this.draft.departmentName && m.departmentId != null) {
      const d = this.departments.find((dep) => dep.id === m.departmentId);
      if (d) this.draft.departmentName = d.name;
    }
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.list(this.estimationId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.subtotal = r.subtotal; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load lines'; this.loading = false; },
    });
  }

  add(): void {
    if (!this.draft.surgeryName.trim() || !this.draft.serviceName.trim()) {
      this.errorMessage = 'Surgery name and service name are required';
      return;
    }
    this.svc.add(this.estimationId, {
      surgeryName: this.draft.surgeryName.trim(),
      departmentName: this.draft.departmentName.trim() || null,
      categoryCode: this.draft.categoryCode.trim() || null,
      role: this.draft.role,
      serviceCode: this.draft.serviceCode.trim() || null,
      serviceName: this.draft.serviceName.trim(),
      renderedBy: this.draft.renderedBy.trim() || null,
      rate: this.draft.rate,
      quantity: this.draft.quantity,
      discountPercent: this.draft.discountPercent,
      discountReason: this.draft.discountReason.trim() || null,
      adjustmentAmount: this.draft.adjustmentAmount,
      adjustmentReason: this.draft.adjustmentReason.trim() || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.draft = {
          ...this.draft,
          serviceCode: '', serviceName: '', renderedBy: '',
          rate: 0, quantity: 1,
          discountPercent: 0, discountReason: '',
          adjustmentAmount: 0, adjustmentReason: '',
        };
        this.successMessage = 'Line added.';
        this.load();
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to add line'; },
    });
  }

  async remove(row: EstimationSurgeryLine): Promise<void> {
    if (!await this.alertSvc.confirm(`Remove line for ${row.role} (${row.serviceName})?`, { severity: 'warning', confirmLabel: 'Remove' })) return;
    this.svc.remove(this.estimationId, row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to remove'; },
    });
  }

  /** Net per-line amount = rate × qty − discount + adjustment. */
  lineNet(r: EstimationSurgeryLine): number {
    const gross = (r.rate || 0) * (r.quantity || 1);
    const afterDiscount = gross - gross * ((r.discountPercent || 0) / 100);
    return Math.round((afterDiscount + (r.adjustmentAmount || 0)) * 100) / 100;
  }
}
