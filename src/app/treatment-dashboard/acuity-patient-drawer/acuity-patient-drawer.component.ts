import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  TreatmentDashboardService, PatientAcuityDetail, AcuitySnapshot,
} from '../../services/treatment-dashboard.service';
import { EwsSparklineComponent } from '../ews-sparkline/ews-sparkline.component';

interface ComponentBreakdownItem { label: string; score: number | null; }
interface VitalDisplayRow { recordedAt: string; cells: Array<string | number> }

/**
 * Phase 9.13 — patient acuity drawer.
 *
 * Slides in from the right when a watchboard row is clicked. One-screen
 * clinical snapshot: EWS trend graph, NEWS2 component breakdown, vitals
 * table, critical results, latest progress note, escalation history +
 * acknowledge / escalate / review actions.
 */
@Component({
  selector: 'app-acuity-patient-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EwsSparklineComponent],
  templateUrl: './acuity-patient-drawer.component.html',
  styleUrls: ['./acuity-patient-drawer.component.css'],
})
export class AcuityPatientDrawerComponent implements OnInit {
  @Input() admissionId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() escalated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  successMessage = '';
  acting = false;

  detail: PatientAcuityDetail | null = null;

  // EWS trend series for the sparkline.
  ewsSeries: number[] = [];

  // NEWS2 component breakdown of the latest snapshot.
  breakdown: ComponentBreakdownItem[] = [];

  // Vitals table.
  vitalsColumns: string[] = [];
  vitalsRows: VitalDisplayRow[] = [];

  escalateNote = '';

  private destroy$ = new Subject<void>();

  constructor(private svc: TreatmentDashboardService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.svc.patient(this.admissionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.detail = r.data;
        this.ewsSeries = (r.data.snapshots ?? []).map((s) => s.ewsScore);
        this.buildBreakdown(r.data.latestSnapshot);
        this.buildVitalsTable(r.data);
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.errorMessage = e?.error?.message ?? 'Failed to load patient detail';
      },
    });
  }

  private buildBreakdown(snap: AcuitySnapshot | null): void {
    this.breakdown = [];
    if (!snap?.componentScores) return;
    try {
      const c = JSON.parse(snap.componentScores) as Record<string, number | null>;
      this.breakdown = [
        { label: 'Respiration rate', score: c['respirationRate'] ?? null },
        { label: 'SpO₂', score: c['spo2'] ?? null },
        { label: 'Supplemental O₂', score: c['oxygen'] ?? null },
        { label: 'Temperature', score: c['temperature'] ?? null },
        { label: 'Systolic BP', score: c['systolicBp'] ?? null },
        { label: 'Pulse', score: c['pulse'] ?? null },
        { label: 'Consciousness', score: c['consciousness'] ?? null },
      ];
    } catch { /* ignore malformed JSON */ }
  }

  private buildVitalsTable(d: PatientAcuityDetail): void {
    const isIcu = d.admission.source === 'ICU';
    // Column keys differ between IPD and ICU vitals rows.
    const cols = isIcu
      ? [
          { key: 'hr', label: 'HR' }, { key: 'sbp', label: 'SBP' },
          { key: 'rr', label: 'RR' }, { key: 'spo2', label: 'SpO₂' },
          { key: 'temp', label: 'Temp' }, { key: 'gcs', label: 'GCS' },
        ]
      : [
          { key: 'pulse', label: 'HR' }, { key: 'bpSystolic', label: 'SBP' },
          { key: 'respiration', label: 'RR' }, { key: 'spo2', label: 'SpO₂' },
          { key: 'temperatureC', label: 'Temp' }, { key: 'painScore', label: 'Pain' },
        ];
    this.vitalsColumns = cols.map((c) => c.label);
    // Newest first, cap 8 rows.
    const rows = [...(d.vitalsTrend ?? [])].reverse().slice(0, 8);
    this.vitalsRows = rows.map((v) => ({
      recordedAt: String(v['recordedAt'] ?? ''),
      cells: cols.map((c) => {
        const val = v[c.key];
        return (val === null || val === undefined) ? '—' : (val as string | number);
      }),
    }));
  }

  // ─── Actions ─────────────────────────────────────────────────────────

  act(action: 'ACKNOWLEDGE' | 'ESCALATE' | 'REVIEW'): void {
    if (this.acting) return;
    this.acting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.svc.escalate(this.admissionId, {
      action,
      note: this.escalateNote.trim() || undefined,
      ewsScore: this.detail?.latestSnapshot?.ewsScore,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.acting = false;
        this.escalateNote = '';
        this.successMessage =
          action === 'ESCALATE' ? 'Escalated — duty doctor notified.'
          : action === 'ACKNOWLEDGE' ? 'Acknowledged.'
          : 'Marked reviewed.';
        this.escalated.emit();
        this.load();
      },
      error: (e) => {
        this.acting = false;
        this.errorMessage = e?.error?.message ?? 'Action failed';
      },
    });
  }

  close(): void { this.closed.emit(); }

  // ─── Helpers ─────────────────────────────────────────────────────────

  bandLabel(band: string | null | undefined): string {
    switch (band) {
      case 'high': return 'HIGH — emergency response';
      case 'medium': return 'MEDIUM — urgent review';
      case 'low-medium': return 'WATCH — single red parameter';
      case 'low': return 'STABLE — routine monitoring';
      default: return 'No score yet';
    }
  }
}
