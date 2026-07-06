import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ESignComponent } from '../../shared/ui/e-sign/e-sign.component';
import {
  ClinicalChartService,
  ChartResponse,
  DayBlock,
  ChartVitals,
  DailyChartRow,
  IntakeOutputEntry,
  IntakeCategory,
  OutputCategory,
} from '../../services/clinical-chart.service';
import { SignatureCreateResponse } from '../../services/signature.service';
import { AuthServiceService } from '../../services/auth/auth-service.service';
import { AlertService } from '../../services/alert.service';

/**
 * IPD Clinical Chart — `/ipd/admission/:admissionId/clinical-chart`.
 *
 * Column-per-day grid of vitals + intake/output totals + per-day text fields,
 * mirroring the printed TPR chart used at partner hospitals. Three modal
 * editors:
 *   • Add vitals reading (multiple per day)
 *   • Add intake / output entry (multiple per day)
 *   • Edit day's text fields (diet, bowels, antibiotics, etc.)
 *
 * Nurse shift sign (M/E/N) per day is captured via the inline e-sign modal.
 */

type Modal =
  | { kind: 'vitals'; date: string }
  | { kind: 'io'; date: string }
  | { kind: 'daily'; date: string }
  | { kind: 'sign'; date: string; shift: 'M' | 'E' | 'N' }
  | null;

@Component({
  selector: 'app-ipd-clinical-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, ESignComponent],
  templateUrl: './ipd-clinical-chart.component.html',
  styleUrls: ['./ipd-clinical-chart.component.css'],
})
export class IpdClinicalChartComponent implements OnInit, OnDestroy {
  admissionId = '';
  from = '';
  to = '';
  chart: ChartResponse | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  modal: Modal = null;

  // Vitals modal buffer
  vitalsBuf = this.blankVitals();
  // I/O modal buffer
  ioBuf = this.blankIO();
  // Daily modal buffer
  dailyBuf: Partial<DailyChartRow> & { chartDate: string } = { chartDate: '' };
  // Shift-sign modal — name of the signing nurse (defaults to logged-in user).
  signerName = '';

  readonly intakeCategories: IntakeCategory[] = ['oral', 'iv', 'ng', 'parenteral', 'blood-product', 'other'];
  readonly outputCategories: OutputCategory[] = ['urine', 'stool', 'vomitus', 'drain', 'ng-aspirate', 'blood', 'other'];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private svc: ClinicalChartService,
    private auth: AuthServiceService,
    private alertSvc: AlertService,
  ) {}

  ngOnInit(): void {
    this.admissionId = this.route.snapshot.paramMap.get('admissionId') ?? '';
    const today = new Date();
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6);
    this.to = today.toISOString().slice(0, 10);
    this.from = weekAgo.toISOString().slice(0, 10);
    this.load();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    if (!this.admissionId) return;
    this.loading = true;
    this.errorMessage = '';
    this.svc.getChart(this.admissionId, this.from, this.to)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { this.chart = res; this.loading = false; },
        error: (e) => { this.errorMessage = e?.error?.error || 'Failed to load chart'; this.loading = false; },
      });
  }

  // ─── Phase 9.13 — doctor-ordered monitoring frequency banner ─────────

  private static readonly FREQ_HOURS: Record<string, number> = {
    continuous: 1, '1h': 1, '2h': 2, '4h': 4, '6h': 6, '8h': 8, '12h': 12, bd: 12,
  };
  private static readonly FREQ_LABEL: Record<string, string> = {
    continuous: 'Continuous', '1h': 'Hourly (1h)', '2h': '2nd hourly (2h)',
    '4h': '4th hourly (4h)', '6h': '6th hourly (6h)', '8h': '8th hourly (8h)',
    '12h': '12th hourly (12h)', bd: 'Twice daily (BD)',
  };

  get monitoringFrequency(): string | null {
    return this.chart?.monitoring?.frequency ?? null;
  }
  get monitoringLabel(): string {
    const f = this.monitoringFrequency;
    return f ? (IpdClinicalChartComponent.FREQ_LABEL[f] ?? f) : '';
  }
  get monitoringSetBy(): string | null {
    return this.chart?.monitoring?.setBy ?? null;
  }

  /** Due time of the next reading = last reading + ordered interval. */
  get nextVitalsDue(): Date | null {
    const f = this.monitoringFrequency;
    const last = this.chart?.monitoring?.lastVitalsAt;
    if (!f || !last) return null;
    const hrs = IpdClinicalChartComponent.FREQ_HOURS[f];
    if (!hrs) return null;
    return new Date(new Date(last).getTime() + hrs * 3600_000);
  }

  /** 'overdue' | 'due-soon' | 'ok' | 'no-order' — drives the banner colour. */
  get monitoringStatus(): 'overdue' | 'due-soon' | 'ok' | 'no-order' {
    if (!this.monitoringFrequency) return 'no-order';
    const due = this.nextVitalsDue;
    if (!due) return 'ok'; // order set but no vitals recorded yet
    const diffMs = due.getTime() - Date.now();
    if (diffMs < 0) return 'overdue';
    if (diffMs < 30 * 60_000) return 'due-soon';
    return 'ok';
  }

  /** Human text for how overdue / how soon the next reading is. */
  get monitoringStatusText(): string {
    const due = this.nextVitalsDue;
    if (!this.monitoringFrequency) return '';
    if (!due) return 'No vitals recorded yet — record a baseline reading.';
    const diffMs = due.getTime() - Date.now();
    const mins = Math.round(Math.abs(diffMs) / 60_000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const span = h > 0 ? `${h}h ${m}m` : `${m}m`;
    if (diffMs < 0) return `OVERDUE by ${span} — record vitals now`;
    return `Next reading due in ${span}`;
  }

  shiftToday(direction: -1 | 1): void {
    // Shift the visible 7-day window forward/back. Calendar day arithmetic on
    // string dates is safest by going through Date.
    const f = new Date(this.from); f.setDate(f.getDate() + direction * 7);
    const t = new Date(this.to); t.setDate(t.getDate() + direction * 7);
    this.from = f.toISOString().slice(0, 10);
    this.to = t.toISOString().slice(0, 10);
    this.load();
  }

  // ─── Modal open/close ───────────────────────────────────────────────
  openVitals(date: string): void {
    this.modal = { kind: 'vitals', date };
    this.vitalsBuf = this.blankVitals();
    // Default the recordedAt to "now" but snapped to the picked day if not today.
    const now = new Date();
    const target = new Date(`${date}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:00`);
    this.vitalsBuf.recordedAt = isoLocal(target);
  }
  openIO(date: string): void {
    this.modal = { kind: 'io', date };
    this.ioBuf = this.blankIO();
    this.ioBuf.recordedAt = isoLocal(new Date(`${date}T${pad2(new Date().getHours())}:00:00`));
  }
  openDaily(date: string, current: DailyChartRow | null): void {
    this.modal = { kind: 'daily', date };
    this.dailyBuf = current ? { ...current, chartDate: date } : { chartDate: date };
  }
  openSignShift(date: string, shift: 'M' | 'E' | 'N'): void {
    this.modal = { kind: 'sign', date, shift };
    // Pre-fill with the logged-in user; editable in case a different nurse
    // signs at a shared station.
    this.signerName = this.auth.getUsername() ?? '';
  }
  closeModal(): void { this.modal = null; }

  // ─── Save handlers ──────────────────────────────────────────────────
  saveVitals(): void {
    if (!this.modal || this.modal.kind !== 'vitals') return;
    this.svc.createVitals(this.admissionId, this.vitalsBuf)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = 'Vitals recorded.'; this.closeModal(); this.load(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
      });
  }
  saveIO(): void {
    if (!this.modal || this.modal.kind !== 'io') return;
    if (!this.ioBuf.category) { this.errorMessage = 'Pick a category.'; return; }
    if (!this.ioBuf.amountMl || this.ioBuf.amountMl < 0) {
      this.errorMessage = 'Amount must be a positive number.'; return;
    }
    this.svc.createIntakeOutput(this.admissionId, {
      recordedAt: this.ioBuf.recordedAt,
      entryType: this.ioBuf.entryType,
      category: this.ioBuf.category,
      amountMl: this.ioBuf.amountMl,
      description: this.ioBuf.description || null,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Recorded.'; this.closeModal(); this.load(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
    });
  }
  saveDaily(): void {
    if (!this.modal || this.modal.kind !== 'daily') return;
    this.svc.upsertDaily(this.admissionId, this.dailyBuf)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.successMessage = 'Day saved.'; this.closeModal(); this.load(); },
        error: (e) => { this.errorMessage = e?.error?.error || 'Save failed'; },
      });
  }
  onShiftSigned(sig: SignatureCreateResponse): void {
    if (!this.modal || this.modal.kind !== 'sign') return;
    this.svc.signShift(this.admissionId, {
      chartDate: this.modal.date,
      shift: this.modal.shift,
      signatureId: sig.id,
      nurseName: this.signerName.trim() || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Shift signed.'; this.closeModal(); this.load(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Sign failed'; },
    });
  }
  async deleteVitalsRow(v: ChartVitals): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete this vitals reading from ${new Date(v.recordedAt).toLocaleString()}?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteVitals(this.admissionId, v.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Removed.'; this.load(); },
      error: (e) => { this.errorMessage = e?.error?.error || 'Delete failed'; },
    });
  }
  async deleteIORow(e: IntakeOutputEntry): Promise<void> {
    if (!await this.alertSvc.confirm(`Delete this ${e.entryType.toLowerCase()} entry?`, { severity: 'danger', confirmLabel: 'Delete' })) return;
    this.svc.deleteIntakeOutput(this.admissionId, e.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.successMessage = 'Removed.'; this.load(); },
      error: (err) => { this.errorMessage = err?.error?.error || 'Delete failed'; },
    });
  }

  // ─── View helpers ───────────────────────────────────────────────────
  shiftSigned(day: DayBlock, shift: 'M' | 'E' | 'N'): { name: string | null; at: string | null } | null {
    const d = day.daily;
    if (!d) return null;
    if (shift === 'M' && d.nurseSignMorningAt) return { name: d.nurseSignMorningName, at: d.nurseSignMorningAt };
    if (shift === 'E' && d.nurseSignEveningAt) return { name: d.nurseSignEveningName, at: d.nurseSignEveningAt };
    if (shift === 'N' && d.nurseSignNightAt) return { name: d.nurseSignNightName, at: d.nurseSignNightAt };
    return null;
  }

  formatTemp(v: ChartVitals): string {
    if (v.temperatureF != null) return `${v.temperatureF}°F`;
    if (v.temperatureC != null) return `${v.temperatureC}°C`;
    return '—';
  }
  formatBP(v: ChartVitals): string {
    if (v.bpSystolic != null && v.bpDiastolic != null) return `${v.bpSystolic}/${v.bpDiastolic}`;
    return '—';
  }

  // ─── Buffer factories ───────────────────────────────────────────────
  private blankVitals(): {
    recordedAt: string;
    temperatureF: number | null;
    temperatureC: number | null;
    pulse: number | null;
    respiration: number | null;
    bpSystolic: number | null;
    bpDiastolic: number | null;
    spo2: number | null;
    painScore: number | null;
    sputum: string;
    notes: string;
    consciousnessAcvpu: string;
    onSupplementalOxygen: boolean;
  } {
    return {
      recordedAt: '',
      temperatureF: null, temperatureC: null,
      pulse: null, respiration: null,
      bpSystolic: null, bpDiastolic: null,
      spo2: null, painScore: null,
      sputum: '', notes: '',
      // Phase 9.13 — NEWS2 inputs
      consciousnessAcvpu: 'A',
      onSupplementalOxygen: false,
    };
  }
  private blankIO(): {
    recordedAt: string;
    entryType: 'INTAKE' | 'OUTPUT';
    category: string;
    amountMl: number;
    description: string;
  } {
    return { recordedAt: '', entryType: 'INTAKE', category: 'oral', amountMl: 0, description: '' };
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────
function pad2(n: number): string { return String(n).padStart(2, '0'); }
function isoLocal(d: Date): string {
  // <input type="datetime-local"> expects YYYY-MM-DDTHH:mm in local time.
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
