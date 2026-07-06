import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';

import { OtSchedule, OtSafetyChecklist, OtIntraOpNote, OtWorkflowService } from '../../services/ot-workflow.service';
import {
  OtEquipmentUsage, OtScheduleExtrasService, OtScheduleStaff, OtScheduleSurgery,
} from '../../services/ot-schedule-extras.service';

type PrintForm = 'safety-checklist' | 'operative-note' | 'track-sheet';

/**
 * Phase 9.5f — OT Print Preview (PDF-ready print views).
 *
 * Three forms:
 *   * safety-checklist — UHJ/OTS/F-01 (WHO Surgical Safety)
 *   * operative-note   — UHJ/OTS/F-03
 *   * track-sheet      — UHJ/OTS/F-04 (delegates to existing ot-track-sheet route layout for parity)
 *
 * Route: /surgery-ot/:id/print?form=<form>
 * Triggers window.print() on load. The page CSS hides the toolbar in
 * @media print so the printout is the form alone.
 */
@Component({
  selector: 'app-ot-print-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ot-print-preview.component.html',
  styleUrls: ['./ot-print-preview.component.css'],
})
export class OtPrintPreviewComponent implements OnInit, OnDestroy {
  scheduleId = '';
  form: PrintForm = 'operative-note';

  schedule: OtSchedule | null = null;
  staff: OtScheduleStaff[] = [];
  surgeries: OtScheduleSurgery[] = [];
  equipment: OtEquipmentUsage[] = [];

  loading = true;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private otSvc: OtWorkflowService,
    private extrasSvc: OtScheduleExtrasService,
  ) {}

  ngOnInit(): void {
    this.scheduleId = this.route.snapshot.paramMap.get('id') ?? '';
    const f = (this.route.snapshot.queryParamMap.get('form') as PrintForm) || 'operative-note';
    this.form = f;

    if (!this.scheduleId) {
      this.errorMessage = 'Invalid schedule id';
      this.loading = false;
      return;
    }

    forkJoin({
      sch: this.otSvc.getSchedule(this.scheduleId),
      staff: this.extrasSvc.listStaff(this.scheduleId).pipe(catchError(() => of({ data: [] }))),
      surg: this.extrasSvc.listSurgeries(this.scheduleId).pipe(catchError(() => of({ data: [] }))),
      equip: this.extrasSvc.listEquipment(this.scheduleId).pipe(catchError(() => of({ data: [] }))),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.schedule = r.sch;
        this.staff = r.staff.data;
        this.surgeries = r.surg.data;
        this.equipment = r.equip.data;
        this.loading = false;
      },
      error: (e) => {
        this.errorMessage = e?.error?.error || 'Failed to load schedule';
        this.loading = false;
      },
    });
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  primaryNote(): OtIntraOpNote | null {
    return this.schedule?.intraOpNotes?.find((n) => n.noteNumber === 1) ?? null;
  }
  safety(): OtSafetyChecklist | null { return this.schedule?.safetyChecklist ?? null; }
  primarySurgery() { return this.surgeries.find((s) => s.isPrimary) ?? this.surgeries[0] ?? null; }
  staffByRole(role: string): OtScheduleStaff[] { return this.staff.filter((s) => s.role === role); }

  parseImplants(): Array<{ name: string; batch?: string; serial?: string; manufacturer?: string }> {
    const raw = this.primaryNote()?.implants;
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  print(): void { window.print(); }

  setForm(f: PrintForm): void { this.form = f; }
}
