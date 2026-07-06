import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OpProcedure, OpProcedureService } from '../../services/op-procedure.service';
import { MastersService, MasterOtRoom, MasterTablet } from '../../services/masters.service';
import { OtSetupService, OtStaffMaster } from '../../services/ot-setup.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.4d — OP Procedure detail page.
 *
 * Patient header + procedure header + lifecycle controls (Start /
 * Complete / Cancel) + clinical narrative fields editable while not
 * cancelled.
 *
 * Route: /op-procedures/:id
 */
@Component({
  selector: 'app-op-procedure-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './op-procedure-detail.component.html',
  styleUrls: ['./op-procedure-detail.component.css'],
})
export class OpProcedureDetailComponent implements OnInit, OnDestroy {
  procedureId = '';
  row: OpProcedure | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  edit = {
    procedureSteps: '',
    findings: '',
    complications: '',
    conditionAtEnd: '',
    disposition: '',
    postProcedureInstructions: '',
    assistantName: '',
    anaesthesiaType: '',
    anaesthesiaAgent: '',
    roomName: '',
  };

  // Phase 9.5i — master lookups for dropdowns
  otRooms: MasterOtRoom[] = [];
  tablets: MasterTablet[] = [];
  // Phase 9.5j — staff master for the Assistant picker
  staffMaster: OtStaffMaster[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: OpProcedureService,
    private masters: MastersService,
    private setup: OtSetupService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.procedureId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.procedureId) this.load();
    this.masters.listOtRooms().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.otRooms = r; },
    });
    this.masters.listTablets().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.tablets = r; },
    });
    this.setup.listStaffMaster().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.staffMaster = r.data; },
    });
  }

  /** Tablets filtered to anaesthetic agents only — falls back to all if the
   *  master doesn't tag types (best-effort). */
  get anaestheticTablets(): MasterTablet[] {
    const filtered = this.tablets.filter((t) => /anaesth|anesth/i.test(t.type || ''));
    return filtered.length ? filtered : this.tablets;
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.svc.get(this.procedureId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.row = r.data;
        this.edit = {
          procedureSteps: r.data.procedureSteps ?? '',
          findings: r.data.findings ?? '',
          complications: r.data.complications ?? '',
          conditionAtEnd: r.data.conditionAtEnd ?? '',
          disposition: r.data.disposition ?? '',
          postProcedureInstructions: r.data.postProcedureInstructions ?? '',
          assistantName: r.data.assistantName ?? '',
          anaesthesiaType: r.data.anaesthesiaType ?? '',
          anaesthesiaAgent: r.data.anaesthesiaAgent ?? '',
          roomName: r.data.roomName ?? '',
        };
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
    });
  }

  goBack(): void { this.router.navigate(['/op-procedures']); }

  save(): void {
    if (!this.row) return;
    this.saving = true;
    this.svc.update(this.procedureId, this.edit).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.row = r.data; this.saving = false; this.successMessage = 'Saved.'; },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Save failed'; },
    });
  }

  start(): void {
    if (!this.row) return;
    this.svc.start(this.procedureId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.row = r.data; this.successMessage = 'Started.'; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to start'; },
    });
  }

  complete(): void {
    if (!this.row) return;
    // Persist current edits first so the completion captures latest data.
    this.svc.update(this.procedureId, this.edit).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.svc.complete(this.procedureId, {
          conditionAtEnd: this.edit.conditionAtEnd || undefined,
          disposition: this.edit.disposition || undefined,
        }).pipe(takeUntil(this.destroy$)).subscribe({
          next: (r) => { this.row = r.data; this.successMessage = 'Completed.'; },
          error: (e) => { this.errorMessage = e?.error?.message || 'Failed to complete'; },
        });
      },
      error: (e) => { this.errorMessage = e?.error?.message || 'Save before complete failed'; },
    });
  }

  async cancel(): Promise<void> {
    const reason = await this.alertSvc.prompt('Reason for cancellation?', { title: 'Cancel procedure', placeholder: 'Reason…', confirmLabel: 'Cancel procedure', severity: 'warning' });
    if (!reason?.trim()) return;
    this.svc.cancel(this.procedureId, reason).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.row = r.data; this.successMessage = 'Cancelled.'; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to cancel'; },
    });
  }

  get isEditable(): boolean {
    return !!this.row && this.row.status !== 'CANCELLED' && this.row.status !== 'COMPLETED';
  }
}
