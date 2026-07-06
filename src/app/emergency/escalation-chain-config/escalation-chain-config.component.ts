import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  EmergencyReferralService, EscalationChainStep, ReferralSla,
} from '../../services/emergency-referral.service';
import { DoctorServiceService } from '../../services/doctor-details/doctor-service.service';
import { AlertService } from '../../services/alert.service';
import { Doctor } from '../../models/doctor.model';
import { Department } from '../../models/department.model';

/**
 * Phase 9.19 — Escalation chain + SLA admin config.
 *
 * Per-department ordered chain of who to notify when an emergency referral
 * goes unacknowledged (level 1 = first tier above the referred doctor), plus
 * the minutes-before-escalation per triage category.
 *
 * Route: /emergency/escalation-config
 */
@Component({
  selector: 'app-escalation-chain-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './escalation-chain-config.component.html',
  styleUrls: ['./escalation-chain-config.component.css'],
})
export class EscalationChainConfigComponent implements OnInit, OnDestroy {
  departments: Department[] = [];
  doctors: Doctor[] = [];
  steps: EscalationChainStep[] = [];
  sla: ReferralSla[] = [];

  selectedDeptId: number | null = null;
  message = '';
  errorMessage = '';

  readonly roleOptions = ['admin', 'super_admin'];

  draft: { level: number; targetType: 'doctor' | 'role'; targetDoctorId: number | null; targetRole: string | null; label: string } =
    this.blankDraft();

  private destroy$ = new Subject<void>();

  constructor(
    private svc: EmergencyReferralService,
    private doctorSvc: DoctorServiceService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.doctorSvc.getDepartments().pipe(takeUntil(this.destroy$))
      .subscribe({ next: (d) => { this.departments = Array.isArray(d) ? d : []; if (this.departments.length && this.selectedDeptId == null) { this.selectedDeptId = this.departments[0].id; this.loadChain(); } } });
    this.doctorSvc.getActiveDoctors().pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.doctors = Array.isArray(r) ? r : []) });
    this.loadSla();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private blankDraft(): { level: number; targetType: 'doctor' | 'role'; targetDoctorId: number | null; targetRole: string | null; label: string } {
    return { level: 1, targetType: 'doctor', targetDoctorId: null, targetRole: null, label: '' };
  }

  onDeptChange(): void { this.loadChain(); }

  loadChain(): void {
    if (this.selectedDeptId == null) { this.steps = []; return; }
    this.svc.listChain(this.selectedDeptId).pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => (this.steps = r.data ?? []) });
  }

  loadSla(): void {
    this.svc.getSla().pipe(takeUntil(this.destroy$)).subscribe({ next: (r) => (this.sla = r.data ?? []) });
  }

  addStep(): void {
    this.errorMessage = '';
    if (this.selectedDeptId == null) { this.errorMessage = 'Pick a department first.'; return; }
    if (this.draft.targetType === 'doctor' && !this.draft.targetDoctorId) { this.errorMessage = 'Pick a doctor for this step.'; return; }
    if (this.draft.targetType === 'role' && !this.draft.targetRole) { this.errorMessage = 'Pick a role for this step.'; return; }
    this.svc.createStep({
      departmentId: this.selectedDeptId,
      level: this.draft.level,
      targetType: this.draft.targetType,
      targetDoctorId: this.draft.targetType === 'doctor' ? this.draft.targetDoctorId : null,
      targetRole: this.draft.targetType === 'role' ? this.draft.targetRole : null,
      label: this.draft.label.trim() || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.message = 'Step added.'; this.draft = this.blankDraft(); this.loadChain(); },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to add step'; },
    });
  }

  async deleteStep(step: EscalationChainStep): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete escalation step (level ${step.level})?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteStep(step.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.message = 'Step removed.'; this.loadChain(); },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to delete step'; },
    });
  }

  saveSla(row: ReferralSla): void {
    this.svc.setSla(row.triageCategory, row.minutes).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.message = `SLA for ${row.triageCategory} saved.`; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to save SLA'; },
    });
  }

  stepTargetLabel(step: EscalationChainStep): string {
    if (step.targetType === 'doctor') return step.targetDoctor?.name ?? `Doctor #${step.targetDoctorId}`;
    return `Role: ${step.targetRole}`;
  }
}
