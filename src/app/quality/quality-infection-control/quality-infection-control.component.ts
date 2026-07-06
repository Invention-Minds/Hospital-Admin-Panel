import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  QualityService,
  QualitySurveillanceEvent, SurveillanceCreateBody, SurveillanceType,
  QualityDeviceDayCount, DeviceDayUpsertBody, DeviceType,
  QualitySterilizationCycle, SterilizationCreateBody,
} from '../../services/quality.service';
import { AlertService } from '../../services/alert.service';

type Tab = 'surveillance' | 'device-days' | 'sterilization';

/**
 * Phase 9.26 / Phase 5b — Infection control capture.
 * Route: /quality/infection-control
 *
 * Three sibling tabs sharing one shell:
 *   • Surveillance events (HAI / SSI / VAP / CAUTI / CLABSI / NSI)
 *   • Device-day counts (ventilator / urinary catheter / central line)
 *   • Sterilization cycles (CSSD pass / fail log)
 *
 * Powers ICO-001..005, ICO-008, HR-006 auto-source.
 */
@Component({
  selector: 'app-quality-infection-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quality-infection-control.component.html',
  styleUrls: ['./quality-infection-control.component.css'],
})
export class QualityInfectionControlComponent implements OnInit, OnDestroy {
  tab: Tab = 'surveillance';

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Surveillance state.
  survRows: QualitySurveillanceEvent[] = [];
  readonly SURV_TYPES: SurveillanceType[] = ['HAI', 'SSI', 'VAP', 'CAUTI', 'CLABSI', 'NSI'];
  survDraft: SurveillanceCreateBody = {
    type: 'HAI', observedAt: this.today(), patientPrn: '', ward: '',
    organism: '', deviceRelated: false, notes: '',
  };

  // Device-day state.
  ddRows: QualityDeviceDayCount[] = [];
  readonly DEVICE_TYPES: DeviceType[] = ['ventilator', 'urinary_catheter', 'central_line'];
  ddDraft: DeviceDayUpsertBody = { date: this.today(), ward: '', deviceType: 'ventilator', count: 0 };

  // Sterilization state.
  sterilRows: QualitySterilizationCycle[] = [];
  sterilDraft: SterilizationCreateBody = {
    batchCode: '', runAt: this.todayLocalIso(), passed: true, failureReason: '',
  };

  private destroy$ = new Subject<void>();

  constructor(private svc: QualityService, private router: Router, private alertSvc: AlertService) {}

  ngOnInit(): void { this.load(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  switchTab(t: Tab): void { this.tab = t; this.errorMessage = ''; this.successMessage = ''; this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    if (this.tab === 'surveillance') {
      this.svc.listSurveillance({ period: this.currentMonth() }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.survRows = r.data; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
      });
    } else if (this.tab === 'device-days') {
      const { start, end } = this.monthBounds();
      this.svc.listDeviceDays({ from: start, to: end }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.ddRows = r.data; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
      });
    } else {
      const { start, end } = this.monthBounds();
      this.svc.listSterilizationCycles({ from: start, to: end }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => { this.sterilRows = r.data; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.message || 'Failed to load'; this.loading = false; },
      });
    }
  }

  // ── Surveillance handlers ────────────────────────────────────────────
  submitSurveillance(): void {
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createSurveillance({
      type: this.survDraft.type,
      observedAt: this.survDraft.observedAt || undefined,
      patientPrn: this.survDraft.patientPrn || undefined,
      ward: this.survDraft.ward || undefined,
      organism: this.survDraft.organism || undefined,
      deviceRelated: !!this.survDraft.deviceRelated,
      notes: this.survDraft.notes || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Recorded';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.survDraft = { type: this.survDraft.type, observedAt: this.today(),
          patientPrn: '', ward: this.survDraft.ward, organism: '', deviceRelated: false, notes: '' };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to record'; },
    });
  }
  async removeSurveillance(row: QualitySurveillanceEvent): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete this ${row.type} event?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteSurveillance(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }

  // ── Device-day handlers ──────────────────────────────────────────────
  submitDeviceDay(): void {
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.upsertDeviceDay({
      date: this.ddDraft.date, ward: this.ddDraft.ward,
      deviceType: this.ddDraft.deviceType, count: Number(this.ddDraft.count) || 0,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Saved';
        setTimeout(() => (this.successMessage = ''), 2500);
        // Keep ward + deviceType + advance date by one for streaming entries.
        this.ddDraft = {
          date: this.ddDraft.date, ward: this.ddDraft.ward,
          deviceType: this.ddDraft.deviceType, count: 0,
        };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to save'; },
    });
  }
  copyYesterday(): void {
    // Find the previous day's row for the same (ward, deviceType).
    const cur = new Date(this.ddDraft.date);
    const prev = new Date(cur.getTime() - 24 * 60 * 60 * 1000);
    const target = prev.toISOString().slice(0, 10);
    const prior = this.ddRows.find((r) => r.date.slice(0, 10) === target
      && r.ward === this.ddDraft.ward && r.deviceType === this.ddDraft.deviceType);
    if (prior) this.ddDraft.count = prior.count;
    else this.errorMessage = `No prior count for ${this.ddDraft.ward} / ${this.ddDraft.deviceType} on ${target}`;
  }
  async removeDeviceDay(row: QualityDeviceDayCount): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete ${row.ward} / ${row.deviceType} count for ${row.date.slice(0, 10)}?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteDeviceDay(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }

  // ── Sterilization handlers ───────────────────────────────────────────
  submitSterilization(): void {
    this.saving = true; this.errorMessage = ''; this.successMessage = '';
    this.svc.createSterilizationCycle({
      batchCode: this.sterilDraft.batchCode || undefined,
      runAt: this.sterilDraft.runAt || undefined,
      passed: this.sterilDraft.passed,
      failureReason: this.sterilDraft.passed ? null : (this.sterilDraft.failureReason || null),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false; this.successMessage = 'Recorded';
        setTimeout(() => (this.successMessage = ''), 2500);
        this.sterilDraft = { batchCode: '', runAt: this.todayLocalIso(), passed: true, failureReason: '' };
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message || 'Failed to record'; },
    });
  }
  async removeSterilization(row: QualitySterilizationCycle): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete cycle ${row.batchCode || row.id}?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteSterilizationCycle(row.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.load(),
      error: (e) => (this.errorMessage = e?.error?.message || 'Failed to delete'),
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private todayLocalIso(): string {
    const d = new Date();
    return `${this.today()}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  private currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  private monthBounds(): { start: string; end: string } {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    return { start, end };
  }

  goBack(): void { this.router.navigate(['/quality/indicators']); }
}
