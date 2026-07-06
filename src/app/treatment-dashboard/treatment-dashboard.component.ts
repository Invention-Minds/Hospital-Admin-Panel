import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  TreatmentDashboardService, WatchboardRow, WatchboardKpis, WatchboardFilters,
} from '../services/treatment-dashboard.service';
import { EmergencyCodeService } from '../services/emergency-code.service';
import { AlertService } from '../services/alert.service';
import { AcuityPatientDrawerComponent } from './acuity-patient-drawer/acuity-patient-drawer.component';
import { EwsSparklineComponent } from './ews-sparkline/ews-sparkline.component';

/**
 * Phase 9.13 — Treatment Dashboard (NEWS2 deterioration watchboard).
 *
 * Route: /treatment-dashboard   (?tv=1 → fullscreen huddle/TV mode)
 *
 * Aggregates every admitted IPD + ICU patient into one acuity-sorted board:
 * a live NEWS2 score per patient, alert chips pulled from labs / progress
 * notes / vitals freshness, and a click-through patient drawer. The "lens"
 * toggle re-emphasises the same data for a consultant vs. a nurse.
 */
@Component({
  selector: 'app-treatment-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AcuityPatientDrawerComponent, EwsSparklineComponent],
  templateUrl: './treatment-dashboard.component.html',
  styleUrls: ['./treatment-dashboard.component.css'],
})
export class TreatmentDashboardComponent implements OnInit, OnDestroy {
  loading = false;
  errorMessage = '';

  // When set (e.g. embedded in the doctor's IPD page), the board is scoped to
  // this consultant's patients only. Unset on the standalone /treatment-dashboard
  // route → hospital-wide, unchanged.
  @Input() doctorScope: string | null = null;

  rows: WatchboardRow[] = [];
  kpis: WatchboardKpis | null = null;

  filters: WatchboardFilters = { source: 'all', search: '' };
  lens: 'all' | 'doctor' | 'nurse' = 'all';
  criticalOnly = false;
  tvMode = false;

  // Which KPI tile is the active list filter. 'all' = the Admitted tile = no filter.
  kpiFilter: 'all' | 'high' | 'medium' | 'deteriorating' | 'critical-lab' | 'no-note' | 'icu' = 'all';

  selectedAdmissionId: string | null = null;

  lastRefreshed: Date | null = null;
  showLegend = false;
  private destroy$ = new Subject<void>();

  // Phase 9.20 — Code Blue activation from a critical row.
  codeDial: { number: string; script: string } | null = null;
  activatingCodeBlue = false;

  constructor(
    private svc: TreatmentDashboardService,
    private route: ActivatedRoute,
    private codeSvc: EmergencyCodeService,
    private alertSvc: AlertService,
  ) {}

  /** Raise Code Blue for this patient, pre-filled with their ward/bed + NEWS2. */
  async activateCodeBlue(row: WatchboardRow, event: Event): Promise<void> {
    event.stopPropagation(); // don't open the patient drawer
    const location = [row.ward, row.bed ? 'Bed ' + row.bed : ''].filter(Boolean).join(' / ') || 'IPD';
    if (!await this.alertSvc.confirm(`Activate CODE BLUE for ${row.patientName || 'this patient'} at ${location}?`, { severity: 'danger', confirmLabel: 'Activate' })) return;
    this.activatingCodeBlue = true;
    this.codeSvc.activate({
      code: 'blue',
      location,
      admissionId: row.admissionId,
      patientName: row.patientName,
      note: row.ewsScore != null ? `NEWS2 ${row.ewsScore} (${row.ewsBand})` : null,
      autoSuggested: true,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => { this.activatingCodeBlue = false; this.codeDial = { number: r.dial.number, script: r.dial.script }; },
      error: (e) => { this.activatingCodeBlue = false; this.errorMessage = e?.error?.message || 'Failed to activate Code Blue'; },
    });
  }
  dismissCodeDial(): void { this.codeDial = null; }

  ngOnInit(): void {
    this.tvMode = this.route.snapshot.queryParamMap.get('tv') === '1';
    // TV mode → tag <body> so global CSS can hide the app chrome (sidebar,
    // header bar, back button, floating widgets) for a true wall display.
    if (this.tvMode && typeof document !== 'undefined') {
      document.body.classList.add('tv-mode');
    }
    this.load();
    // Auto-refresh every 75s so a wall-mounted TV stays current untouched.
    interval(75_000).pipe(takeUntil(this.destroy$)).subscribe(() => this.load(true));
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('tv-mode');
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(silent = false): void {
    if (!silent) this.loading = true;
    this.errorMessage = '';
    // Scope to the embedding doctor when provided (server already supports the filter).
    this.filters.doctor = this.doctorScope?.trim() || undefined;
    this.svc.watchboard(this.filters).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.rows = r.data ?? [];
        this.kpis = r.kpis;
        this.loading = false;
        this.lastRefreshed = new Date();
      },
      error: (e) => {
        this.loading = false;
        this.errorMessage = e?.error?.message ?? 'Failed to load watchboard';
      },
    });
  }

  applyFilters(): void { this.load(); }

  setSource(s: 'all' | 'ipd' | 'icu'): void {
    this.filters.source = s;
    this.load();
  }

  /** Click a KPI tile to filter the list to that subset. Clicking the active
   *  tile again (or the Admitted tile) clears the filter. */
  setKpiFilter(f: TreatmentDashboardComponent['kpiFilter']): void {
    this.kpiFilter = (this.kpiFilter === f && f !== 'all') ? 'all' : f;
  }

  private matchesKpiFilter(r: WatchboardRow): boolean {
    switch (this.kpiFilter) {
      case 'high':          return r.ewsBand === 'high';
      case 'medium':        return r.ewsBand === 'medium';
      case 'deteriorating': return r.trend === 'worsening';
      case 'critical-lab':  return r.chips.some((c) => c.kind === 'critical-lab');
      case 'no-note':       return r.chips.some((c) => c.kind === 'no-progress-note');
      case 'icu':           return r.source === 'ICU';
      default:              return true; // 'all'
    }
  }

  get visibleRows(): WatchboardRow[] {
    let rows = this.rows;
    // Doctor scope (belt-and-suspenders alongside the server filter).
    if (this.doctorScope?.trim()) {
      const n = this.doctorScope.trim().toLowerCase();
      rows = rows.filter((r) => (r.admittingDoctor || '').trim().toLowerCase() === n);
    }
    // KPI-tile filter — clicking a count tile narrows the list to that subset.
    if (this.kpiFilter !== 'all') {
      rows = rows.filter((r) => this.matchesKpiFilter(r));
    }
    if (this.criticalOnly) {
      rows = rows.filter((r) => r.ewsBand === 'high' || r.ewsBand === 'medium' || r.alertCount > 0);
    }
    // The nurse lens floats task-driven rows (overdue vitals / missing notes)
    // even when their EWS is calm; the doctor lens keeps pure acuity order.
    if (this.lens === 'nurse') {
      rows = [...rows].sort((a, b) => taskWeight(b) - taskWeight(a));
    }
    return rows;
  }

  // ─── Drawer ──────────────────────────────────────────────────────────

  openPatient(row: WatchboardRow): void {
    this.selectedAdmissionId = row.admissionId;
  }
  onDrawerClosed(): void {
    this.selectedAdmissionId = null;
  }
  onEscalationDone(): void {
    // Re-pull so the row reflects the new state.
    this.load(true);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  bandLabel(band: string | null): string {
    switch (band) {
      case 'high': return 'HIGH';
      case 'medium': return 'MEDIUM';
      case 'low-medium': return 'WATCH';
      case 'low': return 'STABLE';
      default: return '—';
    }
  }

  /** Plain-language meaning of a band — used for the badge hover tooltip. */
  bandMeaning(band: string | null): string {
    switch (band) {
      case 'high':       return 'NEWS2 7+ — HIGH risk. Emergency response, continuous monitoring.';
      case 'medium':     return 'NEWS2 5–6 — MEDIUM risk. Urgent review by the ward doctor.';
      case 'low-medium': return 'WATCH — total is low but one vital sign is severely abnormal. Review by a clinician.';
      case 'low':        return 'NEWS2 0–4 — STABLE / low risk. Routine monitoring.';
      default:           return 'No NEWS2 score yet — vitals not recorded.';
    }
  }

  trendIcon(trend: string | null): string {
    if (trend === 'worsening') return 'pi-arrow-up-right';
    if (trend === 'improving') return 'pi-arrow-down-right';
    return 'pi-minus';
  }

  /** Short display label for a doctor-ordered monitoring frequency. */
  freqLabel(freq: string | null): string {
    if (!freq) return '';
    const map: Record<string, string> = {
      continuous: 'continuous', '1h': 'hourly', '2h': 'q2h', '4h': 'q4h',
      '6h': 'q6h', '8h': 'q8h', '12h': 'q12h', bd: 'BD',
    };
    return map[freq] ?? freq;
  }

  hoursAgo(iso: string | null): string {
    if (!iso) return 'never';
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3600_000);
    if (h < 1) return `${Math.floor(ms / 60_000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}

// Nurse-lens ordering weight: tasks first, then acuity.
function taskWeight(r: WatchboardRow): number {
  let w = 0;
  for (const c of r.chips) {
    if (c.kind === 'overdue-vitals') w += 40;
    if (c.kind === 'no-progress-note') w += 20;
    if (c.kind === 'critical-lab') w += 30;
    if (c.kind === 'attender-concern') w += 15;
    if (c.kind === 'rising-streak') w += 25;
  }
  const bandRank: Record<string, number> = { high: 12, medium: 8, 'low-medium': 4, low: 0 };
  w += bandRank[r.ewsBand ?? 'low'] ?? 0;
  return w;
}
