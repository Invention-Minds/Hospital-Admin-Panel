import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  InsulinInfusionService, InsulinReading, InsulinReadingBody, GlucoseMonitoringOrder,
} from '../../services/insulin-infusion.service';
import { IpdService } from '../../services/ipd.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import { AlertService } from '../../services/alert.service';

interface Draft {
  recordedAt: string;
  bloodGlucoseMgDl: number | null;
  insulinOrder: string;
  doctorName: string;
  doctorSignatureId: string | null;
  nurseName: string;
  nurseSignatureId: string | null;
  remarks: string;
}

/**
 * Phase 9.14 — Insulin Infusion Chart.
 *
 * Route: /ipd/admission/:admissionId/insulin-chart
 *
 * Mirrors the UHJ paper chart: per-reading blood glucose + insulin order,
 * with doctor + nurse name and an optional e-signature per row. Declared in
 * AppModule (reuses the NgModule page-header + admission-tabs).
 */
@Component({
  selector: 'app-ipd-insulin-chart',
  templateUrl: './ipd-insulin-chart.component.html',
  styleUrls: ['./ipd-insulin-chart.component.css'],
})
export class IpdInsulinChartComponent implements OnInit, OnDestroy {
  admissionId = '';
  prn = '';
  admittingDoctor = '';
  admissionNo = '';

  readings: InsulinReading[] = [];
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Phase 9.18 — doctor-ordered glucose monitoring cadence.
  order: GlucoseMonitoringOrder | null = null;
  freqDraft = '';
  savingFreq = false;

  /** Cadence codes shown to the doctor (mirrors backend VALID_GLUCOSE_FREQUENCIES). */
  readonly freqOptions: { code: string; label: string }[] = [
    { code: 'continuous', label: 'Continuous (≥ hourly)' },
    { code: '1h', label: 'Hourly (1h)' },
    { code: '2h', label: '2-hourly' },
    { code: '4h', label: '4-hourly' },
    { code: '6h', label: '6-hourly' },
    { code: '8h', label: '8-hourly' },
    { code: 'qid', label: 'QID (4×/day)' },
    { code: 'bd', label: 'BD (twice daily)' },
    { code: 'premeal', label: 'Pre-meal + bedtime' },
  ];

  /** Max gap (hours) before a glucose check counts as overdue, per cadence. */
  private readonly overdueHoursByFreq: Record<string, number> = {
    continuous: 1, '1h': 1, '2h': 2, '4h': 4, '6h': 6, '8h': 8, qid: 6, bd: 12, premeal: 6,
  };

  modalOpen = false;
  editingId: string | null = null;
  draft: Draft = this.blank();
  showDoctorSign = false;
  showNurseSign = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: InsulinInfusionService,
    private ipd: IpdService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    if (this.admissionId) {
      this.loadAdmission();
      this.load();
    }
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private loadAdmission(): void {
    this.ipd.getAdmission(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: unknown) => {
        // GET /admission/:id returns a { message, data } envelope; older
        // callers read the row directly — handle both.
        const a = ((res as { data?: unknown })?.data ?? res) as
          { prn?: string; admittingDoctor?: string; admissionNo?: string } | null;
        this.prn = a?.prn ?? '';
        this.admittingDoctor = a?.admittingDoctor ?? '';
        this.admissionNo = a?.admissionNo ?? '';
      },
      error: () => { /* header context is best-effort */ },
    });
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.list(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.readings = r.data ?? [];
        this.order = r.order ?? null;
        this.freqDraft = r.order?.glucoseMonitoringFrequency ?? '';
        this.loading = false;
      },
      error: (e) => { this.errorMessage = e?.error?.message ?? 'Failed to load chart'; this.loading = false; },
    });
  }

  // ─── Doctor-ordered monitoring cadence ─────────────────────────────────

  saveFrequency(): void {
    if (this.savingFreq) return;
    this.savingFreq = true;
    this.errorMessage = '';
    const value = this.freqDraft || null;
    this.svc.setFrequency(this.admissionId, value).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.order = r.order;
        this.freqDraft = r.order?.glucoseMonitoringFrequency ?? '';
        this.savingFreq = false;
        this.successMessage = value ? 'Glucose monitoring order saved.' : 'Glucose monitoring order cleared.';
      },
      error: (e) => { this.savingFreq = false; this.errorMessage = e?.error?.message ?? 'Failed to save order'; },
    });
  }

  freqLabel(code: string | null | undefined): string {
    if (!code) return '';
    return this.freqOptions.find((o) => o.code === code)?.label ?? code;
  }

  /** Timestamp of the most recent reading (readings load oldest→newest). */
  private get lastReadingAt(): number | null {
    const last = this.readings[this.readings.length - 1];
    return last?.recordedAt ? new Date(last.recordedAt).getTime() : null;
  }

  /**
   * Overdue check against the doctor-ordered cadence. Null when no order is
   * set (nothing to be overdue against). Mirrors the vitals-overdue logic.
   */
  get glucoseOverdue(): { overdue: boolean; sinceHrs: number; limitHrs: number } | null {
    const freq = this.order?.glucoseMonitoringFrequency;
    if (!freq) return null;
    const limitHrs = this.overdueHoursByFreq[freq] ?? 6;
    const last = this.lastReadingAt;
    const sinceHrs = last == null ? Infinity : (Date.now() - last) / 3_600_000;
    return { overdue: sinceHrs > limitHrs, sinceHrs: last == null ? -1 : Math.floor(sinceHrs), limitHrs };
  }

  // ─── Modal ───────────────────────────────────────────────────────────

  openAdd(): void {
    this.editingId = null;
    this.draft = this.blank();
    this.showDoctorSign = false;
    this.showNurseSign = false;
    this.errorMessage = '';
    this.modalOpen = true;
  }

  openEdit(r: InsulinReading): void {
    this.editingId = r.id;
    this.draft = {
      recordedAt: r.recordedAt ? this.toLocalInput(r.recordedAt) : this.nowLocalInput(),
      bloodGlucoseMgDl: r.bloodGlucoseMgDl,
      insulinOrder: r.insulinOrder ?? '',
      doctorName: r.doctorName ?? '',
      doctorSignatureId: r.doctorSignatureId,
      nurseName: r.nurseName ?? '',
      nurseSignatureId: r.nurseSignatureId,
      remarks: r.remarks ?? '',
    };
    this.showDoctorSign = false;
    this.showNurseSign = false;
    this.errorMessage = '';
    this.modalOpen = true;
  }

  closeModal(): void { this.modalOpen = false; }

  onDoctorSigned(resp: SignatureCreateResponse): void {
    this.draft.doctorSignatureId = resp.id;
    this.showDoctorSign = false;
  }
  onNurseSigned(resp: SignatureCreateResponse): void {
    this.draft.nurseSignatureId = resp.id;
    this.showNurseSign = false;
  }

  save(): void {
    if (this.saving) return;
    this.errorMessage = '';
    if (this.draft.bloodGlucoseMgDl == null && !this.draft.insulinOrder.trim()) {
      this.errorMessage = 'Enter at least a blood glucose value or an insulin order.';
      return;
    }
    const body: InsulinReadingBody = {
      recordedAt: new Date(this.draft.recordedAt).toISOString(),
      bloodGlucoseMgDl: this.draft.bloodGlucoseMgDl,
      insulinOrder: this.draft.insulinOrder.trim() || null,
      doctorName: this.draft.doctorName.trim() || null,
      doctorSignatureId: this.draft.doctorSignatureId,
      nurseName: this.draft.nurseName.trim() || null,
      nurseSignatureId: this.draft.nurseSignatureId,
      remarks: this.draft.remarks.trim() || null,
    };
    this.saving = true;
    const obs = this.editingId
      ? this.svc.update(this.admissionId, this.editingId, body)
      : this.svc.create(this.admissionId, body);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = this.editingId ? 'Reading updated.' : 'Reading recorded.';
        this.modalOpen = false;
        this.load();
      },
      error: (e) => { this.saving = false; this.errorMessage = e?.error?.message ?? 'Save failed'; },
    });
  }

  async remove(r: InsulinReading): Promise<void> {
    if (!await this.alertSvc.confirm('Delete this reading?', { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.remove(this.admissionId, r.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Reading deleted.'; this.load(); },
      error: (e) => { this.errorMessage = e?.error?.message ?? 'Delete failed'; },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  /** Out-of-range glucose colouring — this chart exists to track exactly this. */
  glucoseClass(v: number | null): string {
    if (v == null) return '';
    if (v >= 250) return 'ins-glucose-high';
    if (v <= 70) return 'ins-glucose-low';
    return '';
  }

  private blank(): Draft {
    return {
      recordedAt: this.nowLocalInput(),
      bloodGlucoseMgDl: null,
      insulinOrder: '',
      doctorName: '',
      doctorSignatureId: null,
      nurseName: '',
      nurseSignatureId: null,
      remarks: '',
    };
  }

  private nowLocalInput(): string { return this.toLocalInput(new Date().toISOString()); }
  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
