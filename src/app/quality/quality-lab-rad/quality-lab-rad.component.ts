import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { QualityService, QualityLabRadEvent, LabRadEventCreateBody, LabRadEventType } from '../../services/quality.service';
import { AlertService } from '../../services/alert.service';

/**
 * Phase 9.26 / Phase 5i — Lab/Radiology amendment + rejection + repeat log.
 * Route: /quality/lab-rad-events
 *
 * Lab/radiology head logs amended reports, rejected samples, and repeat
 * imaging events. Powers PSQ-002, PSQ-003, LAB-001, RAD-003 auto-source.
 */
@Component({
  selector: 'app-quality-lab-rad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-lab-rad.component.html',
  styleUrls: ['./quality-lab-rad.component.css'],
})
export class QualityLabRadComponent implements OnInit, OnDestroy {
  rows: QualityLabRadEvent[] = [];
  loading = false; saving = false;
  errorMessage = ''; successMessage = '';

  readonly EVENT_TYPES: { value: LabRadEventType; label: string; qi: string }[] = [
    { value: 'lab_amended',         label: 'Lab report amended',         qi: 'PSQ-002' },
    { value: 'rad_amended',         label: 'Radiology report amended',   qi: 'PSQ-003' },
    { value: 'lab_sample_rejected', label: 'Lab sample rejected',        qi: 'LAB-001' },
    { value: 'rad_repeat',          label: 'Repeat imaging (technical)', qi: 'RAD-003' },
  ];

  draft: LabRadEventCreateBody = {
    eventType: 'lab_amended', observedAt: this.todayIso(),
    prn: '', testName: '', reason: '',
  };

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router, private alertSvc: AlertService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.listLabRadEvents({ period: this.currentMonth() }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.rows = r.data; this.loading = false; },
      error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
    });
  }

  submit(): void {
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createLabRadEvent({
      eventType: this.draft.eventType,
      observedAt: this.draft.observedAt || undefined,
      prn: this.draft.prn || undefined,
      testName: this.draft.testName || undefined,
      reason: this.draft.reason || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Recorded';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.draft = {
          eventType: this.draft.eventType, observedAt: this.todayIso(),
          prn: '', testName: '', reason: '',
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to record'; },
    });
  }

  async remove(row: QualityLabRadEvent): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete this ${row.eventType} event?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteLabRadEvent(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }

  labelFor(t: LabRadEventType): string { return this.EVENT_TYPES.find((e) => e.value === t)?.label ?? t; }
  qiFor(t: LabRadEventType): string { return this.EVENT_TYPES.find((e) => e.value === t)?.qi ?? ''; }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  goBack(): void { this.router.navigate(['/quality/indicators']); }
}
